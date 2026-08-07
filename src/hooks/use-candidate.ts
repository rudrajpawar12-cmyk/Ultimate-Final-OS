import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { platformKeys } from "@/hooks/use-platform";
import { candidateService } from "@/services/candidate.service";
import type { CandidateProfile, CandidateSettings, JobFilters } from "@/types/candidate";
import type { OnboardingFlowState } from "@/types/onboarding";
import type { OnboardingData, OnboardingStepId } from "@/types/candidate";
import { createOnboardingService } from "@/services/onboarding.service";
import { onboardingSyncService } from "@/services/onboarding-sync.service";


/**
 * Hook layer: the only bridge between React components and the service layer.
 * Components never import repositories, fixtures or services directly.
 */

export const candidateKeys = {
  all: ["candidate"] as const,
  profile: () => [...candidateKeys.all, "profile"] as const,
  dashboard: () => [...candidateKeys.all, "dashboard"] as const,
  resumes: () => [...candidateKeys.all, "resumes"] as const,
  analyses: () => [...candidateKeys.all, "analyses"] as const,
  skillGap: (role?: string) => [...candidateKeys.all, "skill-gap", role ?? "default"] as const,
  jobs: (filters?: Partial<JobFilters>) => [...candidateKeys.all, "jobs", filters ?? {}] as const,
  job: (id: string) => [...candidateKeys.all, "job", id] as const,
  applications: () => [...candidateKeys.all, "applications"] as const,
  interviews: () => [...candidateKeys.all, "interviews"] as const,
  prep: () => [...candidateKeys.all, "prep"] as const,
  analytics: () => [...candidateKeys.all, "analytics"] as const,
  settings: () => [...candidateKeys.all, "settings"] as const,
  onboarding: () => [...candidateKeys.all, "onboarding"] as const,
};

export function useCandidateProfile() {
  return useQuery({
    queryKey: candidateKeys.profile(),
    queryFn: () => candidateService.getProfile(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<CandidateProfile>) => candidateService.updateProfile(patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.profile() });
      void queryClient.invalidateQueries({ queryKey: candidateKeys.dashboard() });
      toast.success("Profile updated");
    },
    onError: () => toast.error("Couldn't save your profile. Try again."),
  });
}

export function useCandidateDashboard() {
  return useQuery({
    queryKey: candidateKeys.dashboard(),
    queryFn: () => candidateService.getDashboard(),
  });
}

export function useResumes() {
  return useQuery({
    queryKey: candidateKeys.resumes(),
    queryFn: () => candidateService.getResumes(),
  });
}

export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: { name: string; sizeKb: number }) => candidateService.uploadResume(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.resumes() });
      void queryClient.invalidateQueries({ queryKey: candidateKeys.dashboard() });
      toast.success("Resume uploaded");
    },
    onError: () => toast.error("Upload failed. Try again."),
  });
}

export function useDeleteResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => candidateService.deleteResume(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.resumes() });
      toast.success("Resume deleted");
    },
    onError: () => toast.error("Couldn't delete that resume."),
  });
}

export function useSetActiveResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => candidateService.setActiveResume(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.resumes() });
      toast.success("Active resume changed");
    },
  });
}

export function useAnalyses() {
  return useQuery({
    queryKey: candidateKeys.analyses(),
    queryFn: () => candidateService.getAnalyses(),
  });
}

export function useAnalyzeResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resumeId: string) => candidateService.analyzeResume(resumeId),
    onSuccess: (outcome) => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.analyses() });
      void queryClient.invalidateQueries({ queryKey: candidateKeys.dashboard() });
      if (outcome.kind === "ok") toast.success("Analysis ready");
    },
  });
}

export function useSkillGap(targetRole?: string) {
  return useQuery({
    queryKey: candidateKeys.skillGap(targetRole),
    queryFn: () => candidateService.getSkillGap(targetRole),
  });
}

export function useJobs(filters: Partial<JobFilters>) {
  return useQuery({
    queryKey: candidateKeys.jobs(filters),
    queryFn: () => candidateService.getJobs(filters),
    placeholderData: (previous) => previous,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: candidateKeys.job(id),
    queryFn: () => candidateService.getJob(id),
  });
}

export function useToggleSavedJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => candidateService.toggleSavedJob(id),
    onSuccess: (job) => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.all });
      toast.success(job.saved ? "Job saved" : "Removed from saved jobs");
    },
    onError: () => toast.error("Couldn't update this job."),
  });
}

export function useApplications() {
  return useQuery({
    queryKey: candidateKeys.applications(),
    queryFn: () => candidateService.getApplications(),
  });
}

export function useApplyToJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, resumeId }: { jobId: string; resumeId?: string }) =>
      candidateService.applyToJob(jobId, resumeId ? { resumeId } : undefined),

    onSuccess: (application) => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.applications() });
      void queryClient.invalidateQueries({ queryKey: candidateKeys.dashboard() });
      void queryClient.invalidateQueries({ queryKey: candidateKeys.analytics() });
      void queryClient.invalidateQueries({ queryKey: candidateKeys.job(application.jobId) });
      void queryClient.invalidateQueries({ queryKey: platformKeys.notifications });
      toast.success("Application submitted");
    },
    onError: () => toast.error("Couldn't submit your application."),
  });
}

export function useWithdrawApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => candidateService.withdrawApplication(applicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.applications() });
      void queryClient.invalidateQueries({ queryKey: candidateKeys.dashboard() });
      void queryClient.invalidateQueries({ queryKey: candidateKeys.analytics() });
      void queryClient.invalidateQueries({ queryKey: platformKeys.notifications });
      toast.success("Application withdrawn");
    },
    onError: () => toast.error("Couldn't withdraw this application."),
  });
}


export function useInterviews() {
  return useQuery({
    queryKey: candidateKeys.interviews(),
    queryFn: () => candidateService.getInterviews(),
  });
}

export function usePrepOverview() {
  return useQuery({
    queryKey: candidateKeys.prep(),
    queryFn: () => candidateService.getPrepOverview(),
  });
}

export function useTogglePracticed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => candidateService.togglePracticed(questionId),
    onSuccess: (overview) => queryClient.setQueryData(candidateKeys.prep(), overview),
  });
}

export function useCandidateAnalytics() {
  return useQuery({
    queryKey: candidateKeys.analytics(),
    queryFn: () => candidateService.getAnalytics(),
  });
}

export function useCandidateSettings() {
  return useQuery({
    queryKey: candidateKeys.settings(),
    queryFn: () => candidateService.getSettings(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<CandidateSettings>) => candidateService.updateSettings(patch),
    onSuccess: (settings) => {
      queryClient.setQueryData(candidateKeys.settings(), settings);
      toast.success("Settings saved");
    },
    onError: () => toast.error("Couldn't save settings."),
  });
}

const candidateOnboardingService = createOnboardingService<OnboardingStepId, OnboardingData>();

const CANDIDATE_INITIAL_STATE: OnboardingFlowState<OnboardingStepId, OnboardingData> = {
  currentStep: "welcome",
  completedSteps: [],
  data: {},
};

export function useOnboardingState() {
  return useQuery({
    queryKey: candidateKeys.onboarding(),
    queryFn: () => candidateOnboardingService.getState(CANDIDATE_INITIAL_STATE),
  });
}

export function useSaveOnboardingState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (state: OnboardingFlowState<OnboardingStepId, OnboardingData>) => {
      
      const saved = await candidateOnboardingService.saveState(state);
      // Project onboarding answers into the production tables immediately so
      // every other surface reads the same rows (no onboarding-only copies).
      await onboardingSyncService.syncCandidate(saved.data);
      return saved;
    },
    onSuccess: (state) => {
      queryClient.setQueryData(candidateKeys.onboarding(), state);
      void queryClient.invalidateQueries({ queryKey: candidateKeys.all });
    },
    onError: () => toast.error("Couldn't save your progress."),
  });
}


export function useResetOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => candidateOnboardingService.resetState(CANDIDATE_INITIAL_STATE),
    onSuccess: (state) => queryClient.setQueryData(candidateKeys.onboarding(), state),
  });
}
