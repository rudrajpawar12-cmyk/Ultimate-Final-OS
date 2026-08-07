import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { experienceService } from "@/services/experience.service";
import type {
  CreateExperienceInput,
  UpdateExperienceInput,
} from "@/repositories/supabase-experience.repository";

/**
 * React Query hooks for Experience CRUD operations.
 * Components use these hooks to interact with the experience service layer.
 */

export const experienceKeys = {
  all: ["experience"] as const,
  list: () => [...experienceKeys.all, "list"] as const,
  detail: (id: string) => [...experienceKeys.all, "detail", id] as const,
};

/** Fetch all experience records for the current user. */
export function useExperience() {
  return useQuery({
    queryKey: experienceKeys.list(),
    queryFn: () => experienceService.getExperience(),
  });
}

/** Create a new experience record. */
export function useCreateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExperienceInput) => experienceService.createExperience(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: experienceKeys.all });
      toast.success("Experience added");
    },
    onError: () => toast.error("Couldn't save experience. Try again."),
  });
}

/** Update an existing experience record. */
export function useUpdateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateExperienceInput }) =>
      experienceService.updateExperience(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: experienceKeys.all });
      toast.success("Experience updated");
    },
    onError: () => toast.error("Couldn't update experience. Try again."),
  });
}

/** Delete an experience record. */
export function useDeleteExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => experienceService.deleteExperience(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: experienceKeys.all });
      toast.success("Experience removed");
    },
    onError: () => toast.error("Couldn't delete experience. Try again."),
  });
}