import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { skillsService } from "@/services/skills.service";
import type {
  CreateSkillInput,
  UpdateSkillInput,
} from "@/repositories/supabase-skills.repository";

/**
 * React Query hooks for Skills CRUD operations.
 * Components use these hooks to interact with the skills service layer.
 */

export const skillsKeys = {
  all: ["skills"] as const,
  list: () => [...skillsKeys.all, "list"] as const,
  detail: (id: string) => [...skillsKeys.all, "detail", id] as const,
};

/** Fetch all skill records for the current user. */
export function useSkills() {
  return useQuery({
    queryKey: skillsKeys.list(),
    queryFn: () => skillsService.getSkills(),
  });
}

/** Create a new skill record. */
export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSkillInput) => skillsService.createSkill(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skillsKeys.all });
      toast.success("Skill added");
    },
    onError: () => toast.error("Couldn't save skill. Try again."),
  });
}

/** Update an existing skill record. */
export function useUpdateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSkillInput }) =>
      skillsService.updateSkill(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skillsKeys.all });
      toast.success("Skill updated");
    },
    onError: () => toast.error("Couldn't update skill. Try again."),
  });
}

/** Delete a skill record. */
export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => skillsService.deleteSkill(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skillsKeys.all });
      toast.success("Skill removed");
    },
    onError: () => toast.error("Couldn't delete skill. Try again."),
  });
}