/**
 * Onboarding Service.
 *
 * Business logic layer for onboarding persistence operations.
 * Delegates persistence to the OnboardingRepository (Supabase-backed).
 *
 * UI → Hooks → Service → Repository → Supabase
 */

import type { OnboardingRepository } from "@/repositories/supabase-onboarding.repository";
import { SupabaseOnboardingRepository } from "@/repositories/supabase-onboarding.repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";
import type { OnboardingFlowState } from "@/types/onboarding";

/**
 * Default completion check, used when a flow doesn't supply its own.
 *
 * Onboarding is considered complete when:
 * - The "analysis" step has been completed, OR
 * - The current step is "complete"
 *
 * This default matches the *candidate* flow's terminal step ("analysis").
 * Other flows (e.g. recruiter, whose terminal step is "profile"/"complete")
 * must pass their own `isComplete` predicate to `createOnboardingService` —
 * otherwise this check silently never matches and the persisted `completed`
 * flag stays false forever, even after the user finishes onboarding.
 */
function defaultIsOnboardingComplete<TId extends string, TData>(
  state: OnboardingFlowState<TId, TData>,
): boolean {
  return (
    state.completedSteps.includes("analysis" as TId) ||
    state.currentStep === ("complete" as TId)
  );
}

/**
 * Creates an OnboardingService bound to the active repository implementation.
 * Generic over step ID and data shape to support both candidate and recruiter flows.
 *
 * @param repository - Persistence backend. Defaults to the Supabase repository.
 * @param isComplete - Flow-specific completion predicate. Defaults to the
 *   candidate flow's rule (`analysis` step / `complete` step) for backward
 *   compatibility; other flows should pass their own service's
 *   `isOnboardingComplete` so the persisted `completed` flag is accurate.
 */
export function createOnboardingService<TId extends string, TData>(
  repository?: OnboardingRepository<TId, TData>,
  isComplete: (state: OnboardingFlowState<TId, TData>) => boolean = defaultIsOnboardingComplete,
) {
  const repo = repository ?? getDefaultRepository<TId, TData>();

  return {
    /**
     * Get the current onboarding state for the authenticated user.
     * Returns the initial state if no record exists yet.
     */
    async getState(initialState: OnboardingFlowState<TId, TData>): Promise<OnboardingFlowState<TId, TData>> {
      const existing = await repo.get();
      if (existing) return existing;
      // No record yet — persist and return the initial state
      const completed = isComplete(initialState);
      return repo.save(initialState, completed);
    },

    /**
     * Save the current onboarding state.
     * Creates or updates the record as needed.
     * Completion is determined by the service layer based on flow state.
     */
    async saveState(state: OnboardingFlowState<TId, TData>): Promise<OnboardingFlowState<TId, TData>> {
      const completed = isComplete(state);
      return repo.save(state, completed);
    },

    /**
     * Reset onboarding to the provided initial state.
     */
    async resetState(initialState: OnboardingFlowState<TId, TData>): Promise<OnboardingFlowState<TId, TData>> {
      return repo.reset(initialState);
    },
  };
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRepository<TId extends string, TData>(): OnboardingRepository<TId, TData> {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Onboarding persistence requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabaseOnboardingRepository<TId, TData>(client);
}

export type OnboardingService<TId extends string, TData> = ReturnType<
  typeof createOnboardingService<TId, TData>
>;