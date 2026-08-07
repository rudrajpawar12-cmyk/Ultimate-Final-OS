import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { hiringService } from "@/services/hiring.service";
import type {
  Interview,
  JobDraft,
  JobStatus,
  PipelineStage,
  RecruiterSettings,
} from "@/types/hiring";

/**
 * Hook layer: the only bridge between recruiter components and services.
 */
export const hiringKeys = {
  all: ["hiring"] as const,
  overview: () => [...hiringKeys.all, "overview"] as const,
  jobs: () => [...hiringKeys.all, "jobs"] as const,
  job: (id: string) => [...hiringKeys.all, "job", id] as const,
  applicants: () => [...hiringKeys.all, "applicants"] as const,
  applicant: (id: string) => [...hiringKeys.all, "applicant", id] as const,
  interviews: () => [...hiringKeys.all, "interviews"] as const,
  analytics: () => [...hiringKeys.all, "analytics"] as const,
  settings: () => [...hiringKeys.all, "settings"] as const,
};

export function useHiringOverview() {
  return useQuery({ queryKey: hiringKeys.overview(), queryFn: () => hiringService.getOverview() });
}

export function useJobs() {
  return useQuery({ queryKey: hiringKeys.jobs(), queryFn: () => hiringService.listJobs() });
}

export function useJob(id: string) {
  return useQuery({ queryKey: hiringKeys.job(id), queryFn: () => hiringService.getJob(id) });
}

export function useApplicants() {
  return useQuery({
    queryKey: hiringKeys.applicants(),
    queryFn: () => hiringService.listApplicants(),
  });
}

export function useApplicant(id: string) {
  return useQuery({
    queryKey: hiringKeys.applicant(id),
    queryFn: () => hiringService.getApplicant(id),
  });
}

export function useInterviews() {
  return useQuery({
    queryKey: hiringKeys.interviews(),
    queryFn: () => hiringService.listInterviews(),
  });
}

export function useRecruiterAnalytics() {
  return useQuery({
    queryKey: hiringKeys.analytics(),
    queryFn: () => hiringService.getAnalytics(),
  });
}

export function useRecruiterSettings() {
  return useQuery({ queryKey: hiringKeys.settings(), queryFn: () => hiringService.getSettings() });
}

function useInvalidateHiring() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: hiringKeys.all });
}

export function useCreateJob() {
  const invalidate = useInvalidateHiring();
  return useMutation({
   mutationFn: (draft: JobDraft) =>
  hiringService.createJob(draft),
    onSuccess: (job) => {
      void invalidate();
      toast.success(job.status === "active" ? "Job published" : "Draft saved");
    },
    onError: () => toast.error("We couldn't save this job."),
  });
}

export function useUpdateJob() {
  const invalidate = useInvalidateHiring();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<JobDraft> }) =>
      hiringService.updateJob(id, patch),
    onSuccess: () => {
      void invalidate();
      toast.success("Job updated");
    },
    onError: () => toast.error("We couldn't update this job."),
  });
}

export function useJobStatusMutation() {
  const invalidate = useInvalidateHiring();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) =>
      hiringService.setJobStatus(id, status),
    onSuccess: (job) => {
      void invalidate();
      toast.success(`${job.title} is now ${job.status}`);
    },
    onError: () => toast.error("We couldn't change the job status."),
  });
}

export function useDuplicateJob() {
  const invalidate = useInvalidateHiring();
  return useMutation({
    mutationFn: (id: string) => hiringService.duplicateJob(id),
    onSuccess: () => {
      void invalidate();
      toast.success("Job duplicated as a draft");
    },
    onError: () => toast.error("We couldn't duplicate this job."),
  });
}

export function useDeleteJob() {
  const invalidate = useInvalidateHiring();
  return useMutation({
    mutationFn: (id: string) => hiringService.deleteJob(id),
    onSuccess: () => {
      void invalidate();
      toast.success("Job deleted");
    },
    onError: () => toast.error("We couldn't delete this job."),
  });
}

export function useApplicantStageMutation() {
  const invalidate = useInvalidateHiring();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: PipelineStage }) =>
      hiringService.setApplicantStage(id, stage),
    onSuccess: (applicant) => {
      void invalidate();
      toast.success(`${applicant.name} moved to ${applicant.stage}`);
    },
    onError: () => toast.error("We couldn't move this candidate."),
  });
}

export function useAddApplicantNote() {
  const invalidate = useInvalidateHiring();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      hiringService.addApplicantNote(id, body),
    onSuccess: () => {
      void invalidate();
      toast.success("Note added");
    },
    onError: () => toast.error("We couldn't save the note."),
  });
}

export function useSaveInterview() {
  const invalidate = useInvalidateHiring();
  return useMutation({
    mutationFn: (interview: Interview) => hiringService.saveInterview(interview),
    onSuccess: () => void invalidate(),
    onError: () => toast.error("We couldn't save this interview."),
  });
}

export function useSaveRecruiterSettings() {
  const invalidate = useInvalidateHiring();
  return useMutation({
    mutationFn: (settings: RecruiterSettings) => hiringService.saveSettings(settings),
    onSuccess: () => {
      void invalidate();
      toast.success("Settings saved");
    },
    onError: () => toast.error("We couldn't save your settings."),
  });
}

export function useBulkApplicantStageMutation() {
  const invalidate = useInvalidateHiring();
  return useMutation({
    mutationFn: ({ ids, stage }: { ids: string[]; stage: PipelineStage }) =>
      hiringService.bulkSetApplicantStage(ids, stage),
    onSuccess: (applicants, variables) => {
      void invalidate();
      toast.success(`${applicants.length} candidate(s) moved to ${variables.stage}`);
    },
    onError: () => toast.error("We couldn't move these candidates."),
  });
}

export function useAddApplicantTag() {
  const invalidate = useInvalidateHiring();
  return useMutation({
    mutationFn: ({ id, tag }: { id: string; tag: string }) =>
      hiringService.addApplicantTag(id, tag),
    onSuccess: () => {
      void invalidate();
      toast.success("Tag added");
    },
    onError: () => toast.error("We couldn't add this tag."),
  });
}

export function useRemoveApplicantTag() {
  const invalidate = useInvalidateHiring();
  return useMutation({
    mutationFn: ({ id, tag }: { id: string; tag: string }) =>
      hiringService.removeApplicantTag(id, tag),
    onSuccess: () => void invalidate(),
    onError: () => toast.error("We couldn't remove this tag."),
  });
}

export function useAiRanking() {
  return useMutation({
    mutationFn: (jobId: string) => hiringService.runAiRanking(jobId),
    onError: () => toast.error("AI ranking failed. Retry in a moment."),
  });
}

export function useScreeningQuestions() {
  return useMutation({
    mutationFn: ({ jobId, brief }: { jobId: string; brief: string }) =>
      hiringService.generateScreeningQuestions(jobId, brief),
    onError: () => toast.error("We couldn't generate screening questions."),
  });
}