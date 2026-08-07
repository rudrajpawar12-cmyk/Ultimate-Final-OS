import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { resumeService } from "@/services/resume.service";
import type { CreateResumeInput } from "@/repositories/supabase-resumes.repository";

/**
 * React Query hooks for Resume metadata CRUD operations.
 * Components use these hooks to interact with the resume service layer.
 */

export const resumeKeys = {
  all: ["resumes"] as const,
  list: () => [...resumeKeys.all, "list"] as const,
  detail: (id: string) => [...resumeKeys.all, "detail", id] as const,
  active: () => [...resumeKeys.all, "active"] as const,
};

/** Fetch all resume metadata records for the current user. */
export function useResumesList() {
  return useQuery({
    queryKey: resumeKeys.list(),
    queryFn: () => resumeService.getResumes(),
  });
}

/** Fetch the currently active resume metadata. */
export function useActiveResume() {
  return useQuery({
    queryKey: resumeKeys.active(),
    queryFn: () => resumeService.getActiveResume(),
  });
}

/** Create a new resume metadata record. */
export function useCreateResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateResumeInput) => resumeService.createResume(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumeKeys.all });
      toast.success("Resume uploaded");
    },
    onError: () => toast.error("Couldn't save resume. Try again."),
  });
}

/** Delete a resume metadata record. */
export function useDeleteResumeMetadata() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resumeService.deleteResume(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumeKeys.all });
      toast.success("Resume deleted");
    },
    onError: () => toast.error("Couldn't delete resume. Try again."),
  });
}

/** Set a specific resume as active. */
export function useSetActiveResumeMetadata() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resumeService.setActiveResume(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumeKeys.all });
      toast.success("Active resume changed");
    },
    onError: () => toast.error("Couldn't update active resume. Try again."),
  });
}