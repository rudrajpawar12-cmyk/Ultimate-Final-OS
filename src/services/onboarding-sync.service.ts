/**
 * Onboarding synchronisation service.
 *
 * Bridges the resumable onboarding JSON state and the production tables that
 * every other surface (dashboards, resume analyzer, analytics) reads from.
 * Called right after each onboarding save so data lands in one place only.
 */

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { SupabaseOnboardingSyncRepository } from "@/repositories/supabase-onboarding-sync.repository";
import { hybridCandidateRepository } from "@/repositories/hybrid-candidate.repository";
import type { OnboardingData } from "@/types/candidate";
import type { RecruiterOnboardingData } from "@/types/recruiter";

function getRepository(): SupabaseOnboardingSyncRepository | null {
  if (!isSupabaseConfigured) return null;
  return new SupabaseOnboardingSyncRepository(getSupabaseClient());
}

/**
 * Serialise syncs per role. Onboarding autosave and the explicit
 * "Save & continue" action can both fire a sync for the same step; two
 * concurrent delete+insert passes race and surface as duplicate-key 409s.
 * Chaining onto a shared promise guarantees one sync runs at a time.
 */
let candidateSyncQueue: Promise<void> = Promise.resolve();
let recruiterSyncQueue: Promise<void> = Promise.resolve();

export const onboardingSyncService = {
  /**
   * Project candidate onboarding data into production tables and refresh the
   * stored profile completion so percentages are never stale.
   */
  async syncCandidate(data: OnboardingData): Promise<void> {
    const repository = getRepository();
    if (!repository) return;
    const run = candidateSyncQueue.then(async () => {
      await repository.syncCandidate(data);
      // Recomputes and persists profile_completion from the freshly written rows.
      await hybridCandidateRepository.updateProfile({});
    });
    // Keep the chain alive even if one sync fails; the caller still sees the error.
    candidateSyncQueue = run.catch(() => {});
    return run;
  },

  async syncRecruiter(data: RecruiterOnboardingData): Promise<void> {
    const repository = getRepository();
    if (!repository) return;
    const run = recruiterSyncQueue.then(() => repository.syncRecruiter(data));
    recruiterSyncQueue = run.catch(() => {});
    return run;
  },
};
