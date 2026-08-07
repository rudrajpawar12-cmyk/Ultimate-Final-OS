import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { educationService } from "@/services/education.service";
import type { CreateEducationInput, UpdateEducationInput } from "@/repositories/supabase-education.repository";

/**
 * React Query hooks for Education CRUD operations.
 * Components use these hooks to interact with the education service layer.
 */

export const educationKeys = {
  all: ["education"] as const,
  list: () => [...educationKeys.all, "list"] as const,
  detail: (id: string) => [...educationKeys.all, "detail", id] as const,
};

/** Fetch all education records for the current user. */
export function useEducation() {
  return useQuery({
    queryKey: educationKeys.list(),
    queryFn: () => educationService.getEducation(),
  });
}

/** Create a new education record. */
export function useCreateEducation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEducationInput) => educationService.createEducation(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: educationKeys.all });
      toast.success("Education added");
    },
    onError: () => toast.error("Couldn't save education. Try again."),
  });
}

/** Update an existing education record. */
export function useUpdateEducation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEducationInput }) =>
      educationService.updateEducation(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: educationKeys.all });
      toast.success("Education updated");
    },
    onError: () => toast.error("Couldn't update education. Try again."),
  });
}

/** Delete an education record. */
export function useDeleteEducation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => educationService.deleteEducation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: educationKeys.all });
      toast.success("Education removed");
    },
    onError: () => toast.error("Couldn't delete education. Try again."),
  });
}