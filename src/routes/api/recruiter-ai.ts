/**
 * Recruiter AI route.
 *
 * Two modes:
 *  - `rank`      → writes the shortlist narrative and a per-candidate note.
 *                  Fit scores stay deterministic in the repository; the model
 *                  only explains them.
 *  - `questions` → generates role-specific screening questions.
 *
 * The Lovable API key never leaves the server.
 */
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";

import {
  COPILOT_MODEL,
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
} from "@/lib/ai-gateway.server";

interface JobBrief {
  title?: string;
  skills?: string[];
  description?: string;
  requirements?: string[];
}

interface CandidateBrief {
  id?: string;
  name?: string;
  fitScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
}

interface RecruiterAiBody {
  mode?: "rank" | "questions";
  job?: JobBrief;
  candidates?: CandidateBrief[];
  brief?: string;
}

function parseJson<T>(text: string): T | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

function describeJob(job: JobBrief | undefined): string {
  if (!job) return "Unknown role.";
  return [
    `Title: ${job.title ?? "Unknown"}`,
    job.skills?.length ? `Required skills: ${job.skills.join(", ")}` : "",
    job.requirements?.length ? `Requirements: ${job.requirements.join("; ")}` : "",
    job.description ? `Description: ${job.description.slice(0, 1200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export const Route = createFileRoute("/api/recruiter-ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: RecruiterAiBody;
        try {
          body = (await request.json()) as RecruiterAiBody;
        } catch {
          return new Response("Invalid request body", { status: 400 });
        }

        const mode = body.mode ?? "rank";
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) return new Response("AI is not configured", { status: 500 });

        const gateway = createLovableAiGatewayProvider(apiKey, getLovableAiGatewayRunId(request));

        const prompt =
          mode === "questions"
            ? [
                "You are an experienced technical recruiter.",
                "Write 6 sharp screening questions for the role below.",
                "Mix role-specific depth, practical experience and one culture/motivation question.",
                "Each question must be a single sentence, under 200 characters.",
                describeJob(body.job),
                body.brief ? `Recruiter brief: ${body.brief}` : "",
                'Respond ONLY with JSON: {"questions": ["...", "..."]}',
              ]
                .filter(Boolean)
                .join("\n\n")
            : [
                "You are an experienced technical recruiter reviewing a shortlist.",
                "Fit scores were computed by the ATS — do not change them, explain them.",
                describeJob(body.job),
                `Candidates: ${JSON.stringify((body.candidates ?? []).slice(0, 12))}`,
                "Write a 2-sentence shortlist summary and a one-sentence recommendation per candidate (max 160 characters each).",
                'Respond ONLY with JSON: {"summary": "...", "notes": {"<candidateId>": "..."}}',
              ].join("\n\n");

        try {
          const result = await generateText({
            model: gateway(COPILOT_MODEL),
            prompt,
            providerOptions: { lovable: { reasoningEffort: "none" } },
          });

          if (mode === "questions") {
            const parsed = parseJson<{ questions?: unknown[] }>(result.text);
            const questions = (parsed?.questions ?? [])
              .map((question) => String(question).trim().slice(0, 240))
              .filter(Boolean)
              .slice(0, 8);

            if (!questions.length) {
              return new Response("The model returned no questions", { status: 502 });
            }
            return Response.json({ questions });
          }

          const parsed = parseJson<{ summary?: string; notes?: Record<string, string> }>(
            result.text,
          );
          if (!parsed) return new Response("The model returned no usable output", { status: 502 });

          const notes: Record<string, string> = {};
          for (const [id, note] of Object.entries(parsed.notes ?? {})) {
            notes[id] = String(note).slice(0, 240);
          }

          return Response.json({
            summary: String(parsed.summary ?? "").slice(0, 600),
            notes,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "AI request failed";
          const status = message.includes("429") ? 429 : message.includes("402") ? 402 : 500;
          return new Response(message, { status });
        }
      },
    },
  },
});
