import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createOnboardingService } from "@/services/onboarding.service";
import { onboardingSyncService } from "@/services/onboarding-sync.service";

import { recruiterProfileService, recruiterService } from "@/services/recruiter.service";
import type { OnboardingFlowState } from "@/types/onboarding";
import type { RecruiterOnboardingData, RecruiterOnboardingStepId } from "@/types/recruiter";
import type {
  CreateRecruiterProfileInput,
  UpdateRecruiterProfileInput,
} from "@/repositories/supabase-recruiter.repository";

/**
 * Hook layer: the only bridge between React components and the service layer.
 */
export const recruiterKeys = {
  all: ["recruiter"] as const,
  profile: () => [...recruiterKeys.all, "profile"] as const,
  onboarding: () => [...recruiterKeys.all, "onboarding"] as const,
};

// Recruiter's terminal step is "profile"/"complete", not the candidate
// flow's "analysis" — pass the recruiter-specific completion rule so the
// persisted `onboarding_progress.completed` flag is accurate (see
// createOnboardingService's default in services/onboarding.service.ts).
const recruiterOnboardingService = createOnboardingService<
  RecruiterOnboardingStepId,
  RecruiterOnboardingData
>(undefined, recruiterService.isOnboardingComplete);

const RECRUITER_INITIAL_STATE: OnboardingFlowState<RecruiterOnboardingStepId, RecruiterOnboardingData> = {
  currentStep: "welcome",
  completedSteps: [],
  data: {},
};

export function useRecruiterOnboardingState() {
  return useQuery({
    queryKey: recruiterKeys.onboarding(),
    queryFn: () => recruiterOnboardingService.getState(RECRUITER_INITIAL_STATE),
  });
}

export function useSaveRecruiterOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      state: OnboardingFlowState<RecruiterOnboardingStepId, RecruiterOnboardingData>,
    ) => {
      const saved = await recruiterOnboardingService.saveState(state);
      // Recruiter + company records are written straight to production tables.
      await onboardingSyncService.syncRecruiter(saved.data);
      return saved;
    },
    onSuccess: (state) => {
      queryClient.setQueryData(recruiterKeys.onboarding(), state);
      void queryClient.invalidateQueries({ queryKey: recruiterKeys.all });
    },
    onError: () => toast.error("Couldn't save your progress."),
  });
}


export function useResetRecruiterOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => recruiterOnboardingService.resetState(RECRUITER_INITIAL_STATE),
    onSuccess: (state) => {
      queryClient.setQueryData(recruiterKeys.onboarding(), state);
      toast.success("Onboarding restarted");
    },
    onError: () => toast.error("Couldn't restart onboarding."),
  });
}

/* ---------------------------------------------------------------------------
 * Recruiter Profile CRUD Hooks
 *
 * UI -> Hooks -> Service -> Repository -> Supabase
 * --------------------------------------------------------------------------- */

/**
 * Fetch the current user's recruiter profile.
 * Returns null when no profile exists yet.
 */
export function useRecruiterProfile() {
  return useQuery({
    queryKey: recruiterKeys.profile(),
    queryFn: () => recruiterProfileService.getProfile(),
  });
}

/**
 * Create a new recruiter profile for the authenticated user.
 * Invalidates the profile query on success.
 */
export function useCreateRecruiter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecruiterProfileInput) =>
      recruiterProfileService.createProfile(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recruiterKeys.profile() });
      toast.success("Recruiter profile created");
    },
    onError: () => toast.error("Couldn't create recruiter profile. Try again."),
  });
}

/**
 * Update the current user's recruiter profile.
 * Invalidates the profile query on success.
 */
export function useUpdateRecruiter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRecruiterProfileInput) =>
      recruiterProfileService.updateProfile(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recruiterKeys.profile() });
      toast.success("Recruiter profile updated");
    },
    onError: () => toast.error("Couldn't update recruiter profile. Try again."),
  });
}

/**
 * Delete the current user's recruiter profile.
 * Invalidates the profile query on success.
 */
export function useDeleteRecruiter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => recruiterProfileService.deleteProfile(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recruiterKeys.profile() });
      toast.success("Recruiter profile deleted");
    },
    onError: () => toast.error("Couldn't delete recruiter profile. Try again."),
  });
}