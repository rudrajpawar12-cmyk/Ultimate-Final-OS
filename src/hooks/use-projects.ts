import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { projectsService } from "@/services/projects.service";
import type { CreateProjectInput, UpdateProjectInput } from "@/repositories/supabase-projects.repository";

/**
 * React Query hooks for Projects CRUD operations.
 * Components use these hooks to interact with the projects service layer.
 */

export const projectsKeys = {
  all: ["projects"] as const,
  list: () => [...projectsKeys.all, "list"] as const,
  detail: (id: string) => [...projectsKeys.all, "detail", id] as const,
};

/** Fetch all project records for the current user. */
export function useProjects() {
  return useQuery({
    queryKey: projectsKeys.list(),
    queryFn: () => projectsService.getProjects(),
  });
}

/** Create a new project record. */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectsService.createProject(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      toast.success("Project added");
    },
    onError: () => toast.error("Couldn't save project. Try again."),
  });
}

/** Update an existing project record. */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      projectsService.updateProject(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      toast.success("Project updated");
    },
    onError: () => toast.error("Couldn't update project. Try again."),
  });
}

/** Delete a project record. */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsService.deleteProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      toast.success("Project removed");
    },
    onError: () => toast.error("Couldn't delete project. Try again."),
  });
}