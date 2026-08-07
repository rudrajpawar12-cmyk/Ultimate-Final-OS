import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  analyzeResumeViaGateway,
  getResumeAnalysisModelVersion,
  ResumeAiGatewayError,
} from "@/lib/resume-ai-gateway.server";
import { getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth.server";
import type { Database } from "@/lib/supabase/types";
import { SupabaseResumeAnalysisRepository } from "@/repositories/supabase-resume-analysis.repository";
import { createResumeAnalysisService } from "@/services/resume-analysis.service";
import type {
  AiAnalysisPromptContext,
  ResumeAnalysisResponse,
  ResumeAnalysisRequest,
  ResumeAnalysisErrorCode,
} from "@/types/resume-analysis";

/**
 * Builds a resume-analysis service bound to the caller's own Supabase client.
 *
 * API routes run on the server, where the browser client has no persisted
 * session. The singleton service would therefore fail with
 * "Authentication required" and surface as an HTTP 500, so every request gets
 * its own repository scoped to the verified bearer token.
 */
function serviceForRequest(request: Request) {
  return authenticateRequest(request).then(({ supabase, userId }) => ({
    userId,
    service: createResumeAnalysisService(
      new SupabaseResumeAnalysisRepository(
        supabase as unknown as SupabaseClient<Database>,
        userId,
      ),
    ),
  }));
}

function authErrorResponse(error: unknown): Response {
  const status = error instanceof ApiAuthError ? error.status : 401;
  const message = error instanceof Error ? error.message : "Sign in to use this feature.";
  return Response.json(
    {
      success: false,
      data: null,
      error: {
        code: "AUTH_REQUIRED" as ResumeAnalysisErrorCode,
        message,
        retryable: false,
      },
    } satisfies ResumeAnalysisResponse,
    { status },
  );
}

export const Route = createFileRoute("/api/resume-analysis")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const resumeId = url.searchParams.get("resumeId");

        if (!resumeId || resumeId.trim().length === 0) {
          return Response.json(
            {
              success: false,
              data: null,
              error: {
                code: "PARSE_FAILED" as ResumeAnalysisErrorCode,
                message: "A resumeId query parameter is required",
                retryable: false,
              },
            } satisfies ResumeAnalysisResponse,
            { status: 400 },
          );
        }

        let resumeAnalysisService: ReturnType<typeof createResumeAnalysisService>;
        try {
          ({ service: resumeAnalysisService } = await serviceForRequest(request));
        } catch (error) {
          return authErrorResponse(error);
        }

        try {
          const latestAnalysis = await resumeAnalysisService.getLatestAnalysis(resumeId.trim());

          if (!latestAnalysis || latestAnalysis.status !== "completed") {
            return Response.json(
              {
                success: true,
                data: null,
                error: null,
              } satisfies ResumeAnalysisResponse,
            );
          }

          // Reconstruct the ResumeAnalysisResult shape from the persisted DTO
          const rawAnalysis = latestAnalysis.rawAnalysis as Record<string, unknown> | null;
          const keywordAnalysis = latestAnalysis.keywordAnalysis as Record<string, unknown> | null;

          // Extract breakdown from sectionScores
          const sectionScores = latestAnalysis.sectionScores as Record<
            string,
            { score: number; summary: string; tips: string[] }
          >;
          const breakdown = Object.entries(sectionScores).map(([category, data]) => ({
            category: category as import("@/types/resume-analysis").ScoreCategory,
            label: category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            score: data.score,
            maxScore: 100,
            summary: data.summary,
            tips: data.tips ?? [],
          }));

          // Extract keywords from keywordAnalysis
          const keywords = {
            matched: (keywordAnalysis?.matched as string[]) ?? [],
            missing: (keywordAnalysis?.missing as string[]) ?? [],
            irrelevant: (keywordAnalysis?.irrelevant as string[]) ?? [],
            densityScore: breakdown.find((b) => b.category === "keywords")?.score ?? 0,
          };

          const result: import("@/types/resume-analysis").ResumeAnalysisResult = {
            id: latestAnalysis.id,
            userId: latestAnalysis.userId,
            resumeId: latestAnalysis.resumeId,
            status: "completed",
            createdAt: latestAnalysis.createdAt,
            completedAt: latestAnalysis.updatedAt,
            overallScore: latestAnalysis.overallScore,
            atsScore: latestAnalysis.atsCompatibility ?? 0,
            breakdown,
            issues: [],
            suggestions: latestAnalysis.suggestions.map((desc, idx) => ({
              id: `sug-${idx}-${latestAnalysis.id.slice(0, 6)}`,
              section: "overall" as import("@/types/resume-analysis").ResumeSection,
              priority: "medium" as const,
              title: desc.slice(0, 60),
              description: desc,
            })),
            keywords,
            atsCompatibility: {
              score: latestAnalysis.atsCompatibility ?? 0,
              parseable: true,
              issues: [],
              formatWarnings: [],
              standardSections: true,
              contactParseable: true,
            },
            parsedData: {
              fullName: null,
              email: null,
              phone: null,
              location: null,
              summary: null,
              skills: [],
              experienceYears: null,
              educationEntries: [],
              experienceEntries: [],
              certifications: [],
              links: [],
            },
            strengths: latestAnalysis.strengths,
            weaknesses: latestAnalysis.weaknesses,
            targetRole: null,
            modelVersion: "persisted",
          };

          return Response.json(
            {
              success: true,
              data: result,
              error: null,
            } satisfies ResumeAnalysisResponse,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to fetch latest analysis";
          return Response.json(
            {
              success: false,
              data: null,
              error: {
                code: "INTERNAL_ERROR" as ResumeAnalysisErrorCode,
                message,
                retryable: true,
              },
            } satisfies ResumeAnalysisResponse,
            { status: 500 },
          );
        }
      },
      POST: async ({ request }) => {
        let body: ResumeAnalysisRequest;
        try {
          body = (await request.json()) as ResumeAnalysisRequest;
        } catch {
          return Response.json(
            {
              success: false,
              data: null,
              error: {
                code: "PARSE_FAILED" as ResumeAnalysisErrorCode,
                message: "Invalid request body",
                retryable: false,
              },
            } satisfies ResumeAnalysisResponse,
            { status: 400 },
          );
        }

        if (!body.resumeId || body.resumeId.trim().length === 0) {
          return Response.json(
            {
              success: false,
              data: null,
              error: {
                code: "PARSE_FAILED" as ResumeAnalysisErrorCode,
                message: "A resumeId is required",
                retryable: false,
              },
            } satisfies ResumeAnalysisResponse,
            { status: 400 },
          );
        }

        let resumeAnalysisService: ReturnType<typeof createResumeAnalysisService>;
        let userId: string;
        try {
          ({ service: resumeAnalysisService, userId } = await serviceForRequest(request));
        } catch (error) {
          return authErrorResponse(error);
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          return Response.json(
            {
              success: false,
              data: null,
              error: {
                code: "AI_UNAVAILABLE" as ResumeAnalysisErrorCode,
                message: "AI is not configured",
                retryable: false,
              },
            } satisfies ResumeAnalysisResponse,
            { status: 500 },
          );
        }

        try {
          // Create a pending analysis record
          const pendingAnalysis = await resumeAnalysisService.createAnalysis({
            resumeId: body.resumeId.trim(),
            status: "pending",
          });

          // Read the candidate's actual resume text out of storage. Falls back
          // to their structured Supabase profile when the file cannot be
          // decoded, so the model never analyses placeholder content.
          const { extractResumeText } = await import("@/lib/resume-text-extraction.server");
          const extracted = await extractResumeText(body.resumeId.trim(), userId);

          if (extracted.text.trim().length === 0) {
            await resumeAnalysisService.failAnalysis(pendingAnalysis.id);
            return Response.json(
              {
                success: false,
                data: null,
                error: {
                  code: "PARSE_FAILED" as ResumeAnalysisErrorCode,
                  message:
                    "We could not read any text from this resume. Upload a text-based PDF or DOCX, or complete your profile first.",
                  retryable: false,
                },
              } satisfies ResumeAnalysisResponse,
              { status: 422 },
            );
          }

          // Build the AI prompt context from the real resume content.
          const context: AiAnalysisPromptContext = {
            resumeText: extracted.text,
            targetRole: body.targetRole ?? null,
            jobDescription: body.jobDescription ?? null,
            previousScores: null,
            userPreferences: null,
          };

          const runId = getLovableAiGatewayRunId(request);
          const aiResult = await analyzeResumeViaGateway(context, {
            apiKey,
            runId,
          });

          // Complete the analysis with AI results
          const completedAnalysis = await resumeAnalysisService.completeAnalysis(
            pendingAnalysis.id,
            {
              overallScore: aiResult.overallScore,
              sectionScores: Object.fromEntries(
                aiResult.breakdown.map((b) => [b.category, { score: b.score, summary: b.summary, tips: b.tips }]),
              ),
              strengths: aiResult.strengths,
              weaknesses: aiResult.weaknesses,
              suggestions: aiResult.suggestions.map((s) => s.description),
              atsCompatibility: aiResult.atsScore,
              keywordAnalysis: aiResult.keywords as unknown as Record<string, unknown>,
              rawAnalysis: aiResult as unknown as Record<string, unknown>,
            },
          );

          return Response.json(
            {
              success: true,
              data: {
                id: completedAnalysis.id,
                userId,
                resumeId: completedAnalysis.resumeId,
                status: "completed",
                createdAt: completedAnalysis.createdAt,
                completedAt: completedAnalysis.updatedAt,
                overallScore: aiResult.overallScore,
                atsScore: aiResult.atsScore,
                breakdown: aiResult.breakdown.map((b) => ({
                  category: b.category,
                  label: b.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                  score: b.score,
                  maxScore: 100,
                  summary: b.summary,
                  tips: b.tips,
                })),
                issues: aiResult.issues.map((issue, idx) => ({
                  id: `issue-${idx}-${Math.random().toString(36).slice(2, 8)}`,
                  ...issue,
                })),
                suggestions: aiResult.suggestions.map((sug, idx) => ({
                  id: `sug-${idx}-${Math.random().toString(36).slice(2, 8)}`,
                  ...sug,
                })),
                keywords: {
                  ...aiResult.keywords,
                  densityScore: aiResult.breakdown.find((b) => b.category === "keywords")?.score ?? 0,
                },
                atsCompatibility: {
                  score: aiResult.atsScore,
                  parseable: true,
                  issues: aiResult.issues
                    .filter((i) => i.section === "overall" && i.severity === "critical")
                    .map((i) => i.description),
                  formatWarnings: aiResult.issues
                    .filter((i) => i.severity === "warning")
                    .map((i) => i.description),
                  standardSections: true,
                  contactParseable: aiResult.parsedData.email !== null,
                },
                parsedData: aiResult.parsedData,
                strengths: aiResult.strengths,
                weaknesses: aiResult.weaknesses,
                targetRole: body.targetRole ?? null,
                modelVersion: getResumeAnalysisModelVersion(),
              },
              error: null,
            } satisfies ResumeAnalysisResponse,
          );
        } catch (error) {
          // Handle AI gateway errors
          if (error instanceof ResumeAiGatewayError) {
            const statusMap: Record<string, number> = {
              RATE_LIMITED: 429,
              QUOTA_EXCEEDED: 402,
              AI_UNAVAILABLE: 500,
              TIMEOUT: 504,
              PARSE_FAILED: 422,
              INTERNAL_ERROR: 500,
            };
            const status = statusMap[error.code] ?? 500;

            return Response.json(
              {
                success: false,
                data: null,
                error: {
                  code: error.code as ResumeAnalysisErrorCode,
                  message: error.message,
                  retryable: error.retryable,
                },
              } satisfies ResumeAnalysisResponse,
              { status },
            );
          }

          const message = error instanceof Error ? error.message : "Resume analysis failed";
          return Response.json(
            {
              success: false,
              data: null,
              error: {
                code: "INTERNAL_ERROR" as ResumeAnalysisErrorCode,
                message,
                retryable: true,
              },
            } satisfies ResumeAnalysisResponse,
            { status: 500 },
          );
        }
      },
    },
  },
});