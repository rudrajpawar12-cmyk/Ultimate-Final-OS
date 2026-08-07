import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { getAuthToken } from "@/lib/api";
import type {
  ResumeAnalysisError,
  ResumeAnalysisRequest,
  ResumeAnalysisResponse,
  ResumeAnalysisResult,
} from "@/types/resume-analysis";

/**
 * Reusable React hook for running a resume analysis.
 *
 * Delegates all business logic to the existing Resume Analysis API
 * (`POST /api/resume-analysis`), which internally orchestrates the
 * AI gateway and the Resume Analysis service/repository layers.
 *
 * UI → Hooks → Service/API → Repository → Supabase
 *
 * No analysis logic is duplicated here; the hook only owns local
 * request state (analysis, loading, error).
 *
 * Phase 4B.9: Also loads the latest persisted analysis on mount via
 * `GET /api/resume-analysis?resumeId=...&userId=...` when a resumeId
 * is provided, preserving dashboard state across navigations.
 */

/** Endpoint exposed by the existing resume analysis server route. */
const RESUME_ANALYSIS_ENDPOINT = "/api/resume-analysis";

/** Options for configuring the hook behavior. */
export interface UseResumeAnalysisOptions {
  /** When provided, the hook loads the latest persisted analysis on mount. */
  resumeId?: string | null;
}

/** Value returned by {@link useResumeAnalysis}. */
export interface UseResumeAnalysisResult {
  /** The most recent successful analysis result, or null. */
  analysis: ResumeAnalysisResult | null;
  /** True while an analysis request is in flight. */
  loading: boolean;
  /** True while the initial load of the latest analysis is in progress. */
  initialLoading: boolean;
  /** The error from the last failed analysis request, or null. */
  error: ResumeAnalysisError | null;
  /** Runs an analysis for the given resume id. */
  analyzeResume: (resumeId: string) => Promise<ResumeAnalysisResult | null>;
  /** Reloads the latest persisted analysis for the current resumeId. */
  refreshLatest: () => Promise<void>;
}

/**
 * Hook exposing the resume analysis workflow to components.
 *
 * @param options - Optional configuration. Pass `resumeId` to auto-load
 *   the latest persisted analysis when the dashboard opens.
 *
 * @example
 * const { analysis, loading, error, analyzeResume } = useResumeAnalysis({ resumeId: active?.id });
 * await analyzeResume(resumeId);
 */
export function useResumeAnalysis(options?: UseResumeAnalysisOptions): UseResumeAnalysisResult {
  const { user } = useAuth();

  const [analysis, setAnalysis] = useState<ResumeAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<ResumeAnalysisError | null>(null);

  const resumeId = options?.resumeId ?? null;

  /**
   * Fetches the latest persisted analysis from the GET endpoint.
   * Does NOT duplicate the POST call — this is a read-only fetch.
   */
  const fetchLatestAnalysis = useCallback(
    async (targetResumeId: string): Promise<ResumeAnalysisResult | null> => {
      if (!user?.id) return null;

      const params = new URLSearchParams({
        resumeId: targetResumeId,
        userId: user.id,
      });

      try {
        const token = await getAuthToken();
        if (!token) return null;

        const response = await fetch(`${RESUME_ANALYSIS_ENDPOINT}?${params.toString()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const body = (await response.json()) as ResumeAnalysisResponse;

        if (!response.ok || !body.success) {
          return null;
        }

        return body.data;
      } catch {
        return null;
      }
    },
    [user?.id],
  );

  /**
   * Load the latest persisted analysis on mount (or when resumeId changes).
   * Only fires if a resumeId is provided and the user is authenticated.
   */
  useEffect(() => {
    if (!resumeId || !user?.id) return;

    let cancelled = false;

    setInitialLoading(true);

    void fetchLatestAnalysis(resumeId).then((result) => {
      if (cancelled) return;
      if (result) {
        setAnalysis(result);
      }
      setInitialLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [resumeId, user?.id, fetchLatestAnalysis]);

  /**
   * Manually refresh the latest persisted analysis.
   * Called after a successful analysis to update the displayed state.
   */
  const refreshLatest = useCallback(async (): Promise<void> => {
    if (!resumeId || !user?.id) return;

    const result = await fetchLatestAnalysis(resumeId);
    if (result) {
      setAnalysis(result);
    }
  }, [resumeId, user?.id, fetchLatestAnalysis]);

  const analyzeResume = useCallback(
    async (targetResumeId: string): Promise<ResumeAnalysisResult | null> => {
      const trimmedResumeId = targetResumeId?.trim() ?? "";

      if (trimmedResumeId.length === 0) {
        setError({
          code: "PARSE_FAILED",
          message: "A resume id is required to run an analysis",
          retryable: false,
        });
        return null;
      }

      if (!user?.id) {
        setError({
          code: "INTERNAL_ERROR",
          message: "You must be signed in to analyze a resume",
          retryable: false,
        });
        return null;
      }

      const payload: ResumeAnalysisRequest = {
        resumeId: trimmedResumeId,
        userId: user.id,
      };

      setLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();
        if (!token) {
          setError({
            code: "AUTH_REQUIRED",
            message: "Your session has expired. Sign in again.",
            retryable: false,
          });
          return null;
        }

        const response = await fetch(RESUME_ANALYSIS_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const body = (await response.json()) as ResumeAnalysisResponse;

        if (!response.ok || !body.success || !body.data) {
          setError(
            body.error ?? {
              code: "INTERNAL_ERROR",
              message: "Resume analysis failed",
              retryable: true,
            },
          );
          return null;
        }

        setAnalysis(body.data);
        return body.data;
      } catch (cause) {
        setError({
          code: "INTERNAL_ERROR",
          message:
            cause instanceof Error
              ? cause.message
              : "Resume analysis request failed",
          retryable: true,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id],
  );

  return { analysis, loading, initialLoading, error, analyzeResume, refreshLatest };
}