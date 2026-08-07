/**
 * Resume Analysis Service.
 *
 * Business logic layer for resume analysis operations.
 * Delegates persistence to the ResumeAnalysisRepository.
 *
 * UI → Hooks → Service → Repository → Supabase
 */

import type {
  ResumeAnalysisDTO,
  ResumeAnalysisRepository,
  CreateResumeAnalysisInput,
  UpdateResumeAnalysisInput,
} from "@/repositories/supabase-resume-analysis.repository";
import { SupabaseResumeAnalysisRepository } from "@/repositories/supabase-resume-analysis.repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

/** Minimum acceptable overall score value */
const MIN_SCORE = 0;

/** Maximum acceptable overall score value */
const MAX_SCORE = 100;

/**
 * Creates a ResumeAnalysisService bound to the active repository implementation.
 *
 * The repository is resolved lazily on first use so that importing this module
 * never throws when Supabase is not configured.
 */
export function createResumeAnalysisService(repository?: ResumeAnalysisRepository) {
  let resolved: ResumeAnalysisRepository | null = repository ?? null;

  const repo = (): ResumeAnalysisRepository => {
    if (!resolved) resolved = getDefaultRepository();
    return resolved;
  };

  return {
    /**
     * Create a new resume analysis record.
     * Validates required fields and score ranges before persisting.
     */
    async createAnalysis(input: CreateResumeAnalysisInput): Promise<ResumeAnalysisDTO> {
      if (!input.resumeId || input.resumeId.trim().length === 0) {
        throw new AppError(
          "Resume ID is required",
          "VALIDATION_ERROR",
          422,
        );
      }

      if (input.overallScore !== undefined) {
        validateScore(input.overallScore, "Overall score");
      }

      if (input.atsCompatibility !== undefined && input.atsCompatibility !== null) {
        validateScore(input.atsCompatibility, "ATS compatibility score");
      }

      return repo().create({
        resumeId: input.resumeId.trim(),
        overallScore: input.overallScore,
        sectionScores: input.sectionScores,
        strengths: input.strengths,
        weaknesses: input.weaknesses,
        suggestions: input.suggestions,
        atsCompatibility: input.atsCompatibility,
        keywordAnalysis: input.keywordAnalysis,
        rawAnalysis: input.rawAnalysis,
        status: input.status,
      });
    },

    /**
     * Get all analysis records for a specific resume.
     * Returns empty array if none exist. Ordered by most recent first.
     */
    async getAnalysesByResumeId(resumeId: string): Promise<ResumeAnalysisDTO[]> {
      if (!resumeId || resumeId.trim().length === 0) {
        throw new AppError(
          "Resume ID is required",
          "VALIDATION_ERROR",
          422,
        );
      }

      return repo().getByResumeId(resumeId.trim());
    },

    /**
     * Get the most recent analysis for a specific resume.
     * Returns null if no analysis exists.
     */
    async getLatestAnalysis(resumeId: string): Promise<ResumeAnalysisDTO | null> {
      if (!resumeId || resumeId.trim().length === 0) {
        throw new AppError(
          "Resume ID is required",
          "VALIDATION_ERROR",
          422,
        );
      }

      return repo().getLatest(resumeId.trim());
    },

    /**
     * Update an existing resume analysis record.
     * Only provided fields are updated; others remain unchanged.
     */
    async updateAnalysis(
      id: string,
      input: UpdateResumeAnalysisInput,
    ): Promise<ResumeAnalysisDTO> {
      if (!id || id.trim().length === 0) {
        throw new AppError(
          "Analysis ID is required",
          "VALIDATION_ERROR",
          422,
        );
      }

      if (input.overallScore !== undefined) {
        validateScore(input.overallScore, "Overall score");
      }

      if (input.atsCompatibility !== undefined && input.atsCompatibility !== null) {
        validateScore(input.atsCompatibility, "ATS compatibility score");
      }

      return repo().update(id.trim(), input);
    },

    /**
     * Delete a resume analysis record.
     */
    async deleteAnalysis(id: string): Promise<void> {
      if (!id || id.trim().length === 0) {
        throw new AppError(
          "Analysis ID is required",
          "VALIDATION_ERROR",
          422,
        );
      }

      return repo().delete(id.trim());
    },

    /**
     * Mark an analysis as completed with full results.
     * Convenience method that updates status and all result fields at once.
     */
    async completeAnalysis(
      id: string,
      results: {
        overallScore: number;
        sectionScores: Record<string, unknown>;
        strengths: string[];
        weaknesses: string[];
        suggestions: string[];
        atsCompatibility?: number | null;
        keywordAnalysis?: Record<string, unknown> | null;
        rawAnalysis?: Record<string, unknown> | null;
      },
    ): Promise<ResumeAnalysisDTO> {
      if (!id || id.trim().length === 0) {
        throw new AppError(
          "Analysis ID is required",
          "VALIDATION_ERROR",
          422,
        );
      }

      validateScore(results.overallScore, "Overall score");

      if (results.atsCompatibility !== undefined && results.atsCompatibility !== null) {
        validateScore(results.atsCompatibility, "ATS compatibility score");
      }

      if (!results.strengths || results.strengths.length === 0) {
        throw new AppError(
          "At least one strength is required for a completed analysis",
          "VALIDATION_ERROR",
          422,
        );
      }

      if (!results.suggestions || results.suggestions.length === 0) {
        throw new AppError(
          "At least one suggestion is required for a completed analysis",
          "VALIDATION_ERROR",
          422,
        );
      }

      return repo().update(id.trim(), {
        overallScore: results.overallScore,
        sectionScores: results.sectionScores,
        strengths: results.strengths,
        weaknesses: results.weaknesses,
        suggestions: results.suggestions,
        atsCompatibility: results.atsCompatibility,
        keywordAnalysis: results.keywordAnalysis,
        rawAnalysis: results.rawAnalysis,
        status: "completed",
      });
    },

    /**
     * Mark an analysis as failed with an optional error reason stored in rawAnalysis.
     */
    async failAnalysis(id: string, reason?: string): Promise<ResumeAnalysisDTO> {
      if (!id || id.trim().length === 0) {
        throw new AppError(
          "Analysis ID is required",
          "VALIDATION_ERROR",
          422,
        );
      }

      return repo().update(id.trim(), {
        status: "failed",
        rawAnalysis: reason ? { error: reason } : null,
      });
    },
  };
}

/**
 * Validates that a score is within the acceptable range.
 */
function validateScore(score: number, fieldName: string): void {
  if (!Number.isFinite(score)) {
    throw new AppError(
      `${fieldName} must be a finite number`,
      "VALIDATION_ERROR",
      422,
    );
  }
  if (score < MIN_SCORE || score > MAX_SCORE) {
    throw new AppError(
      `${fieldName} must be between ${MIN_SCORE} and ${MAX_SCORE}`,
      "VALIDATION_ERROR",
      422,
    );
  }
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRepository(): ResumeAnalysisRepository {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Resume analysis persistence requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabaseResumeAnalysisRepository(client);
}

/** Singleton service instance */
export const resumeAnalysisService = createResumeAnalysisService();

export type ResumeAnalysisService = ReturnType<typeof createResumeAnalysisService>;