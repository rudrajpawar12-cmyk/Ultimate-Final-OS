/**
 * Server-only JSON generation against the Lovable AI Gateway.
 *
 * Every CareerOS AI feature that needs structured output goes through
 * `generateAiJson`. It centralises:
 *  - provider construction and run-id propagation,
 *  - a hard timeout so a stalled generation never hangs a request,
 *  - defensive JSON parsing (code fences, leading prose, trailing commentary),
 *  - one bounded retry for transient upstream failures,
 *  - mapping upstream failures onto typed, user-presentable errors.
 *
 * No fallback/dummy payloads are produced here: when the model cannot deliver
 * usable output the caller receives an error and decides how to degrade.
 */

import { generateText } from "ai";

import { COPILOT_MODEL, createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

/** Stable, user-presentable failure categories for every AI call. */
export type AiErrorCode =
  | "AI_UNAVAILABLE"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "TIMEOUT"
  | "INVALID_OUTPUT"
  | "INTERNAL_ERROR";

/** Error raised by {@link generateAiJson}. */
export class AiEngineError extends Error {
  readonly code: AiErrorCode;
  readonly retryable: boolean;
  readonly status: number;

  constructor(message: string, code: AiErrorCode, retryable: boolean, status: number) {
    super(message);
    this.name = "AiEngineError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

/** Default wall-clock budget for a single structured generation. */
const DEFAULT_TIMEOUT_MS = 90_000;

function mapUpstreamError(error: unknown): AiEngineError {
  if (error instanceof AiEngineError) return error;

  const message = error instanceof Error ? error.message : "The AI request failed.";

  if (message.includes("429") || /rate.?limit/i.test(message)) {
    return new AiEngineError(
      "The AI service is busy right now. Try again in a moment.",
      "RATE_LIMITED",
      true,
      429,
    );
  }
  if (message.includes("402") || /credit|quota/i.test(message)) {
    return new AiEngineError(
      "The AI credits for this workspace are exhausted.",
      "QUOTA_EXCEEDED",
      false,
      402,
    );
  }
  if (/abort|timeout/i.test(message)) {
    return new AiEngineError("The AI request took too long. Try again.", "TIMEOUT", true, 504);
  }
  return new AiEngineError(message, "INTERNAL_ERROR", true, 500);
}

/**
 * Extracts the first balanced JSON object or array from a model response.
 * Tolerates code fences, prefixes such as "Here is the JSON:", and trailing prose.
 */
export function extractJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();

  const openers = ["{", "["] as const;
  let start = -1;
  let opener: "{" | "[" = "{";
  for (const candidate of openers) {
    const index = cleaned.indexOf(candidate);
    if (index !== -1 && (start === -1 || index < start)) {
      start = index;
      opener = candidate;
    }
  }
  if (start === -1) {
    throw new AiEngineError("The AI response was not valid JSON.", "INVALID_OUTPUT", true, 502);
  }

  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i += 1) {
    const char = cleaned[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === opener) depth += 1;
    else if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1)) as T;
        } catch {
          throw new AiEngineError(
            "The AI response was not valid JSON.",
            "INVALID_OUTPUT",
            true,
            502,
          );
        }
      }
    }
  }

  throw new AiEngineError("The AI response was truncated.", "INVALID_OUTPUT", true, 502);
}

export interface GenerateAiJsonOptions {
  /** System prompt describing the model's role and output contract. */
  system: string;
  /** User prompt containing the real data to reason about. */
  prompt: string;
  /** Run id forwarded from the incoming request, when present. */
  runId?: string | undefined;
  /** Wall-clock budget in milliseconds. Defaults to 90s. */
  timeoutMs?: number;
  /** Model override. Defaults to the shared CareerOS chat model. */
  model?: string;
}

/**
 * Runs a structured generation and returns the parsed JSON payload.
 *
 * @throws {AiEngineError} when the key is missing, the upstream call fails,
 * the deadline is exceeded, or the response cannot be parsed.
 */
export async function generateAiJson<T>(options: GenerateAiJsonOptions): Promise<T> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AiEngineError(
  "GROQ_API_KEY is missing.",
  "AI_UNAVAILABLE",
  false,
  500,
);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const gateway = createLovableAiGatewayProvider(apiKey, options.runId);
  const model = gateway(options.model ?? COPILOT_MODEL);

  let lastError: AiEngineError | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await generateText({
        model,
        system: options.system,
        prompt: options.prompt,
        abortSignal: controller.signal,
        maxRetries: 0,
        providerOptions: { lovable: { reasoningEffort: "none" } },
      });

      if (!result.text?.trim()) {
        throw new AiEngineError("The AI returned an empty response.", "INVALID_OUTPUT", true, 502);
      }

      return extractJson<T>(result.text);
    } catch (error) {
      lastError = mapUpstreamError(error);
      if (!lastError.retryable || attempt === 1) throw lastError;
      await new Promise((resolve) => setTimeout(resolve, 600));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new AiEngineError("The AI request failed.", "INTERNAL_ERROR", true, 500);
}

/** Converts an unknown thrown value into an HTTP response for an API route. */
export function aiErrorResponse(error: unknown): Response {
  const mapped = mapUpstreamError(error);
  return Response.json(
    { error: { code: mapped.code, message: mapped.message, retryable: mapped.retryable } },
    { status: mapped.status },
  );
}
