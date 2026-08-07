/**
 * Resume Analysis — AI Gateway Integration.
 *
 * Connects the Resume Analysis Service to the existing Lovable AI Gateway.
 * Reuses createLovableAiGatewayProvider and COPILOT_MODEL from ai-gateway.server.
 *
 * Architecture: Service → AI Gateway → Lovable AI Provider
 *
 * Phase 4B.4 — AI gateway integration only.
 * Does NOT implement API routes, hooks, or UI.
 */

import { generateText } from "ai";

import {
  COPILOT_MODEL,
  createLovableAiGatewayProvider,
} from "@/lib/ai-gateway.server";
import type {
  AiAnalysisPromptContext,
  AiAnalysisRawResponse,
  ScoreCategory,
  IssueSeverity,
  ResumeSection,
  ParsedResumeData,
} from "@/types/resume-analysis";

/* ================================ Constants ================================ */

/** Model used for resume analysis (same gateway model as copilot/insights). */
const RESUME_ANALYSIS_MODEL = COPILOT_MODEL;

/** Maximum length of resume text sent to the model. */
const MAX_RESUME_TEXT_LENGTH = 12000;

/** Maximum length of job description sent to the model. */
const MAX_JOB_DESCRIPTION_LENGTH = 4000;

/* ================================= Prompt ================================== */

/**
 * Builds the system prompt for resume analysis.
 */
function buildResumeAnalysisSystemPrompt(): string {
  return `You are CareerOS Resume Analyzer, an expert ATS and resume evaluation engine.
Your task is to analyze a resume and produce a structured JSON evaluation.

Scoring rules:
- All scores are integers 0–100.
- Be fair but rigorous. Average resumes score 45–65.
- Penalize vague bullets, missing metrics, poor formatting, and ATS-unfriendly elements.
- Reward quantified impact, strong action verbs, clean structure, and keyword alignment.

Output rules:
- Respond with JSON only. No prose, no code fences, no markdown.
- Follow the exact schema provided in the user prompt.
- Never invent information not present in the resume text.
- If a field cannot be determined, use null for optional fields or empty arrays.`;
}

/**
 * Builds the user prompt containing the resume text and analysis instructions.
 */
function buildResumeAnalysisUserPrompt(context: AiAnalysisPromptContext): string {
  const resumeText = context.resumeText.slice(0, MAX_RESUME_TEXT_LENGTH);
  const targetRole = context.targetRole ? `Target role: ${context.targetRole}` : "No specific target role provided.";
  const jobDescription = context.jobDescription
    ? `Job description:\n${context.jobDescription.slice(0, MAX_JOB_DESCRIPTION_LENGTH)}`
    : "No job description provided.";

  const previousContext = context.previousScores
    ? `Previous scores for comparison: ${JSON.stringify(context.previousScores)}`
    : "";

  const preferences = context.userPreferences
    ? `User context: industry=${context.userPreferences.industry ?? "unknown"}, experience=${context.userPreferences.experienceLevel ?? "unknown"}, region=${context.userPreferences.region ?? "unknown"}`
    : "";

  return `Analyze the following resume and return a JSON object with this exact structure:

{
  "overallScore": <number 0-100>,
  "atsScore": <number 0-100>,
  "breakdown": [
    {
      "category": "<formatting|content|keywords|ats-compatibility|impact|readability|relevance|grammar>",
      "score": <number 0-100>,
      "summary": "<one sentence>",
      "tips": ["<tip1>", "<tip2>"]
    }
  ],
  "issues": [
    {
      "severity": "<critical|warning|info>",
      "section": "<contact|summary|experience|education|skills|projects|certifications|overall>",
      "title": "<short title>",
      "description": "<explanation>",
      "suggestion": "<optional fix>"
    }
  ],
  "suggestions": [
    {
      "section": "<contact|summary|experience|education|skills|projects|certifications|overall>",
      "priority": "<high|medium|low>",
      "title": "<short title>",
      "description": "<actionable advice>",
      "example": "<optional rewritten text>",
      "estimatedImpact": <optional number 0-100>
    }
  ],
  "keywords": {
    "matched": ["<keyword>"],
    "missing": ["<keyword>"],
    "irrelevant": ["<keyword>"]
  },
  "strengths": ["<strength>"],
  "weaknesses": ["<weakness>"],
  "parsedData": {
    "fullName": "<string|null>",
    "email": "<string|null>",
    "phone": "<string|null>",
    "location": "<string|null>",
    "summary": "<string|null>",
    "skills": ["<skill>"],
    "experienceYears": <number|null>,
    "educationEntries": [{"institution":"","degree":"","field":"","year":""}],
    "experienceEntries": [{"company":"","title":"","startDate":"","endDate":"","bullets":[]}],
    "certifications": ["<cert>"],
    "links": ["<url>"]
  }
}

${targetRole}
${jobDescription}
${previousContext}
${preferences}

--- RESUME TEXT ---
${resumeText}
--- END RESUME TEXT ---

Respond with the JSON object only.`;
}

/* ================================= Parser ================================== */

/** Valid score categories for validation. */
const VALID_CATEGORIES: ScoreCategory[] = [
  "formatting",
  "content",
  "keywords",
  "ats-compatibility",
  "impact",
  "readability",
  "relevance",
  "grammar",
];

/** Valid issue severities for validation. */
const VALID_SEVERITIES: IssueSeverity[] = ["critical", "warning", "info"];

/** Valid resume sections for validation. */
const VALID_SECTIONS: ResumeSection[] = [
  "contact",
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "overall",
];

/**
 * Clamps a number to the 0–100 range.
 */
function clampScore(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

/**
 * Parses and validates the raw AI response text into a typed AiAnalysisRawResponse.
 * Applies defensive parsing to handle minor model output variations.
 */
function parseAnalysisResponse(text: string): AiAnalysisRawResponse {
  // Strip potential code fences or surrounding prose
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("AI response does not contain valid JSON");
  }

  const raw = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;

  // Validate and normalize breakdown
  const rawBreakdown = Array.isArray(raw.breakdown) ? raw.breakdown : [];
  const breakdown = rawBreakdown
    .filter((item: Record<string, unknown>) => VALID_CATEGORIES.includes(item.category as ScoreCategory))
    .map((item: Record<string, unknown>) => ({
      category: item.category as ScoreCategory,
      score: clampScore(item.score),
      summary: String(item.summary ?? "").slice(0, 200),
      tips: Array.isArray(item.tips) ? item.tips.slice(0, 5).map((t: unknown) => String(t)) : [],
    }));

  // Validate and normalize issues
  const rawIssues = Array.isArray(raw.issues) ? raw.issues : [];
  const issues = rawIssues
    .slice(0, 20)
    .filter(
      (item: Record<string, unknown>) =>
        VALID_SEVERITIES.includes(item.severity as IssueSeverity) &&
        VALID_SECTIONS.includes(item.section as ResumeSection),
    )
    .map((item: Record<string, unknown>) => ({
      severity: item.severity as IssueSeverity,
      section: item.section as ResumeSection,
      title: String(item.title ?? "Issue").slice(0, 100),
      description: String(item.description ?? "").slice(0, 400),
      suggestion: item.suggestion ? String(item.suggestion).slice(0, 400) : undefined,
    }));

  // Validate and normalize suggestions
  const rawSuggestions = Array.isArray(raw.suggestions) ? raw.suggestions : [];
  const validPriorities = ["high", "medium", "low"] as const;
  const suggestions = rawSuggestions
    .slice(0, 15)
    .filter((item: Record<string, unknown>) => VALID_SECTIONS.includes(item.section as ResumeSection))
    .map((item: Record<string, unknown>) => ({
      section: item.section as ResumeSection,
      priority: (validPriorities.includes(item.priority as "high" | "medium" | "low")
        ? item.priority
        : "medium") as "high" | "medium" | "low",
      title: String(item.title ?? "Suggestion").slice(0, 100),
      description: String(item.description ?? "").slice(0, 400),
      example: item.example ? String(item.example).slice(0, 500) : undefined,
      estimatedImpact: item.estimatedImpact != null ? clampScore(item.estimatedImpact) : undefined,
    }));

  // Validate keywords
  const rawKeywords = (raw.keywords ?? {}) as Record<string, unknown>;
  const keywords = {
    matched: Array.isArray(rawKeywords.matched) ? rawKeywords.matched.map((k: unknown) => String(k)) : [],
    missing: Array.isArray(rawKeywords.missing) ? rawKeywords.missing.map((k: unknown) => String(k)) : [],
    irrelevant: Array.isArray(rawKeywords.irrelevant) ? rawKeywords.irrelevant.map((k: unknown) => String(k)) : [],
  };

  // Validate parsed data
  const rawParsed = (raw.parsedData ?? {}) as Record<string, unknown>;
  const parsedData: ParsedResumeData = {
    fullName: rawParsed.fullName != null ? String(rawParsed.fullName) : null,
    email: rawParsed.email != null ? String(rawParsed.email) : null,
    phone: rawParsed.phone != null ? String(rawParsed.phone) : null,
    location: rawParsed.location != null ? String(rawParsed.location) : null,
    summary: rawParsed.summary != null ? String(rawParsed.summary) : null,
    skills: Array.isArray(rawParsed.skills) ? rawParsed.skills.map((s: unknown) => String(s)) : [],
    experienceYears: rawParsed.experienceYears != null ? Number(rawParsed.experienceYears) || null : null,
    educationEntries: Array.isArray(rawParsed.educationEntries)
      ? rawParsed.educationEntries.slice(0, 10).map((e: Record<string, unknown>) => ({
          institution: String(e.institution ?? ""),
          degree: String(e.degree ?? ""),
          field: String(e.field ?? ""),
          year: e.year != null ? String(e.year) : null,
        }))
      : [],
    experienceEntries: Array.isArray(rawParsed.experienceEntries)
      ? rawParsed.experienceEntries.slice(0, 15).map((e: Record<string, unknown>) => ({
          company: String(e.company ?? ""),
          title: String(e.title ?? ""),
          startDate: e.startDate != null ? String(e.startDate) : null,
          endDate: e.endDate != null ? String(e.endDate) : null,
          bullets: Array.isArray(e.bullets) ? e.bullets.map((b: unknown) => String(b)) : [],
        }))
      : [],
    certifications: Array.isArray(rawParsed.certifications)
      ? rawParsed.certifications.map((c: unknown) => String(c))
      : [],
    links: Array.isArray(rawParsed.links) ? rawParsed.links.map((l: unknown) => String(l)) : [],
  };

  return {
    overallScore: clampScore(raw.overallScore),
    atsScore: clampScore(raw.atsScore),
    breakdown,
    issues,
    suggestions,
    keywords,
    strengths: Array.isArray(raw.strengths) ? raw.strengths.slice(0, 10).map((s: unknown) => String(s)) : [],
    weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses.slice(0, 10).map((s: unknown) => String(s)) : [],
    parsedData,
  };
}

/* ============================== Public API ================================= */

/** Error thrown when the AI gateway request fails. */
export class ResumeAiGatewayError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.name = "ResumeAiGatewayError";
    this.code = code;
    this.retryable = retryable;
  }
}

/**
 * Sends resume text to the AI Gateway for analysis and returns a structured result.
 *
 * Reuses the existing Lovable AI Gateway provider and model configuration.
 * Throws ResumeAiGatewayError on failure with appropriate error codes.
 *
 * @param context - The prompt context containing resume text and optional metadata.
 * @param options - Optional configuration (API key override, run ID).
 * @returns Parsed and validated AiAnalysisRawResponse.
 */
export async function analyzeResumeViaGateway(
  context: AiAnalysisPromptContext,
  options?: {
    apiKey?: string;
    runId?: string;
  },
): Promise<AiAnalysisRawResponse> {
  const apiKey = options?.apiKey ?? process.env.LOVABLE_API_KEY;

  if (!apiKey) {
    throw new ResumeAiGatewayError(
      "AI is not configured. LOVABLE_API_KEY is missing.",
      "AI_UNAVAILABLE",
      false,
    );
  }

  if (!context.resumeText || context.resumeText.trim().length === 0) {
    throw new ResumeAiGatewayError(
      "Resume text is required for analysis.",
      "PARSE_FAILED",
      false,
    );
  }

  const gateway = createLovableAiGatewayProvider(apiKey, options?.runId);

  try {
    const result = await generateText({
      model: gateway(RESUME_ANALYSIS_MODEL),
      system: buildResumeAnalysisSystemPrompt(),
      prompt: buildResumeAnalysisUserPrompt(context),
      
    });

    if (!result.text || result.text.trim().length === 0) {
      throw new ResumeAiGatewayError(
        "AI returned an empty response.",
        "AI_UNAVAILABLE",
        true,
      );
    }

    return parseAnalysisResponse(result.text);
  } catch (error) {
    // Re-throw our own errors
    if (error instanceof ResumeAiGatewayError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "AI request failed";

    // Map HTTP status codes to domain error codes
    if (message.includes("429")) {
      throw new ResumeAiGatewayError(
        "AI rate limit exceeded. Please try again later.",
        "RATE_LIMITED",
        true,
      );
    }
    if (message.includes("402")) {
      throw new ResumeAiGatewayError(
        "AI quota exceeded. Please check your plan.",
        "QUOTA_EXCEEDED",
        false,
      );
    }
    if (message.includes("timeout") || message.includes("TIMEOUT")) {
      throw new ResumeAiGatewayError(
        "AI request timed out. Please try again.",
        "TIMEOUT",
        true,
      );
    }

    throw new ResumeAiGatewayError(
      message,
      "INTERNAL_ERROR",
      true,
    );
  }
}

/**
 * Returns the model version string used for resume analysis.
 * Useful for storing in analysis records for reproducibility.
 */
export function getResumeAnalysisModelVersion(): string {
  return RESUME_ANALYSIS_MODEL;
}