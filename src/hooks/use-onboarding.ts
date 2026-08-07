/**
 * React Query hooks for Onboarding persistence operations.
 *
 * Generic hooks that support both candidate and recruiter onboarding flows.
 * Components use these hooks to interact with the onboarding service layer.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createOnboardingService } from "@/services/onboarding.service";
import { onboardingSyncService } from "@/services/onboarding-sync.service";

import type { OnboardingFlowState } from "@/types/onboarding";
import type { OnboardingData, OnboardingStepId } from "@/types/candidate";
import type { RecruiterOnboardingData, RecruiterOnboardingStepId } from "@/types/recruiter";

/* ----------------------------- Query Keys ----------------------------- */

export const onboardingKeys = {
  all: ["onboarding"] as const,
  candidate: () => [...onboardingKeys.all, "candidate"] as const,
  recruiter: () => [...onboardingKeys.all, "recruiter"] as const,
};

/* ----------------------- Candidate Onboarding ----------------------- */

const candidateOnboardingService = createOnboardingService<OnboardingStepId, OnboardingData>();

const CANDIDATE_INITIAL_STATE: OnboardingFlowState<OnboardingStepId, OnboardingData> = {
  currentStep: "welcome",
  completedSteps: [],
  data: {},
};

/** Fetch the candidate onboarding state from Supabase. */
export function useCandidateOnboardingState() {
  return useQuery({
    queryKey: onboardingKeys.candidate(),
    queryFn: () => candidateOnboardingService.getState(CANDIDATE_INITIAL_STATE),
  });
}

/** Save the candidate onboarding state to Supabase. */
export function useSaveCandidateOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (state: OnboardingFlowState<OnboardingStepId, OnboardingData>) => {
      const saved = await candidateOnboardingService.saveState(state);
      await onboardingSyncService.syncCandidate(saved.data);
      return saved;
    },
    onSuccess: (state) => {
      queryClient.setQueryData(onboardingKeys.candidate(), state);
      void queryClient.invalidateQueries({ queryKey: ["candidate"] });
    },
    onError: () => toast.error("Couldn't save your progress."),
  });
}


/** Reset the candidate onboarding to initial state in Supabase. */
export function useResetCandidateOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => candidateOnboardingService.resetState(CANDIDATE_INITIAL_STATE),
    onSuccess: (state) => queryClient.setQueryData(onboardingKeys.candidate(), state),
  });
}

/* ----------------------- Recruiter Onboarding ----------------------- */

const recruiterOnboardingService = createOnboardingService<RecruiterOnboardingStepId, RecruiterOnboardingData>();

const RECRUITER_INITIAL_STATE: OnboardingFlowState<RecruiterOnboardingStepId, RecruiterOnboardingData> = {
  currentStep: "welcome",
  completedSteps: [],
  data: {},
};

/** Fetch the recruiter onboarding state from Supabase. */
export function useRecruiterOnboardingState() {
  return useQuery({
    queryKey: onboardingKeys.recruiter(),
    queryFn: () => recruiterOnboardingService.getState(RECRUITER_INITIAL_STATE),
  });
}

/** Save the recruiter onboarding state to Supabase. */
export function useSaveRecruiterOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      state: OnboardingFlowState<RecruiterOnboardingStepId, RecruiterOnboardingData>,
    ) => {
      const saved = await recruiterOnboardingService.saveState(state);
      await onboardingSyncService.syncRecruiter(saved.data);
      return saved;
    },
    onSuccess: (state) => {
      queryClient.setQueryData(onboardingKeys.recruiter(), state);
      void queryClient.invalidateQueries({ queryKey: ["recruiter"] });
    },
    onError: () => toast.error("Couldn't save your progress."),
  });
}


/** Reset the recruiter onboarding to initial state in Supabase. */
export function useResetRecruiterOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => recruiterOnboardingService.resetState(RECRUITER_INITIAL_STATE),
    onSuccess: (state) => queryClient.setQueryData(onboardingKeys.recruiter(), state),
  });
}