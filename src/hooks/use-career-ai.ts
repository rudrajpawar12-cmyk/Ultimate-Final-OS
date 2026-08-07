/**
 * Client hooks for the CareerOS AI engine.
 *
 * Each hook owns only request state; all reasoning happens server-side behind
 * the `/api/*` routes, which also own caching. Errors surface the engine's
 * user-presentable message so screens never render silent failures.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { getAuthToken } from "@/lib/api";
import type {
  ApplicantReview,
  CareerRecommendations,
  JobMatchAnalysis,
  SkillGapAnalysis,
} from "@/types/career-ai";

interface EngineError {
  code: string;
  message: string;
  retryable: boolean;
}

async function postEngine<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const token = await getAuthToken();
  if (!token) {
    throw { code: "UNAUTHORIZED", message: "Sign in to use AI insights.", retryable: false };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: EngineError }
    | null;

  if (!response.ok || !payload?.data) {
    throw (
      payload?.error ?? {
        code: "INTERNAL_ERROR",
        message: "The AI request failed. Try again.",
        retryable: true,
      }
    );
  }

  return payload.data;
}

function toEngineError(error: unknown): EngineError {
  if (error && typeof error === "object" && "message" in error) {
    const candidate = error as Partial<EngineError>;
    return {
      code: candidate.code ?? "INTERNAL_ERROR",
      message: candidate.message ?? "The AI request failed.",
      retryable: candidate.retryable ?? true,
    };
  }
  return { code: "INTERNAL_ERROR", message: "The AI request failed.", retryable: true };
}

interface EngineState<T> {
  data: T | null;
  loading: boolean;
  error: EngineError | null;
}

function useEngine<T, A extends unknown[]>(
  endpoint: string,
  buildBody: (...args: A) => Record<string, unknown> | null,
) {
  const [state, setState] = useState<EngineState<T>>({ data: null, loading: false, error: null });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (...args: A): Promise<T | null> => {
      const body = buildBody(...args);
      if (!body) return null;

      setState((previous) => ({ ...previous, loading: true, error: null }));
      try {
        const data = await postEngine<T>(endpoint, body);
        if (mounted.current) setState({ data, loading: false, error: null });
        return data;
      } catch (error) {
        if (mounted.current) {
          setState((previous) => ({ ...previous, loading: false, error: toEngineError(error) }));
        }
        return null;
      }
    },
    // buildBody is stable per hook definition below.
    [endpoint, buildBody],
  );

  return { ...state, run };
}

/** Scores the signed-in candidate against a job posting. */
export function useJobMatch(jobId: string | null | undefined, options?: { auto?: boolean }) {
  const buildBody = useCallback(
    (refresh?: boolean) => (jobId ? { jobId, refresh: refresh === true } : null),
    [jobId],
  );
  const engine = useEngine<JobMatchAnalysis, [boolean?]>("/api/job-match", buildBody);
  const auto = options?.auto ?? false;
  const { run } = engine;

  useEffect(() => {
    if (auto && jobId) void run();
  }, [auto, jobId, run]);

  return { match: engine.data, loading: engine.loading, error: engine.error, analyze: engine.run };
}

/** Builds a learning roadmap toward a target role. */
export function useSkillGap() {
  const buildBody = useCallback(
    (targetRole?: string, jobId?: string | null, refresh?: boolean) => ({
      ...(targetRole ? { targetRole } : {}),
      ...(jobId ? { jobId } : {}),
      refresh: refresh === true,
    }),
    [],
  );
  const engine = useEngine<SkillGapAnalysis, [string?, (string | null)?, boolean?]>(
    "/api/skill-gap",
    buildBody,
  );
  return { analysis: engine.data, loading: engine.loading, error: engine.error, analyze: engine.run };
}

/** Career paths, role suggestions, salary and technology guidance. */
export function useCareerRecommendations(options?: { auto?: boolean }) {
  const buildBody = useCallback((refresh?: boolean) => ({ refresh: refresh === true }), []);
  const engine = useEngine<CareerRecommendations, [boolean?]>(
    "/api/career-recommendations",
    buildBody,
  );
  const auto = options?.auto ?? false;
  const { run } = engine;

  useEffect(() => {
    if (auto) void run();
  }, [auto, run]);

  return {
    recommendations: engine.data,
    loading: engine.loading,
    error: engine.error,
    generate: engine.run,
  };
}

/** Recruiter-side AI review of a single application. */
export function useApplicantReview() {
  const buildBody = useCallback(
    (applicationId: string, refresh?: boolean) =>
      applicationId ? { applicationId, refresh: refresh === true } : null,
    [],
  );
  const engine = useEngine<ApplicantReview, [string, boolean?]>("/api/recruiter-review", buildBody);
  return { review: engine.data, loading: engine.loading, error: engine.error, generate: engine.run };
}
