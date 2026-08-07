import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { preferencesService } from "@/services/preferences.service";
import type { UpsertPreferencesInput } from "@/repositories/supabase-preferences.repository";

/**
 * React Query hooks for Career Preferences operations.
 * Components use these hooks to interact with the preferences service layer.
 */

export const preferencesKeys = {
  all: ["preferences"] as const,
  detail: () => [...preferencesKeys.all, "detail"] as const,
};

/** Fetch the career preferences for the current user. */
export function usePreferences() {
  return useQuery({
    queryKey: preferencesKeys.detail(),
    queryFn: () => preferencesService.getPreferences(),
  });
}

/** Save (create or update) career preferences. */
export function useSavePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertPreferencesInput) =>
      preferencesService.savePreferences(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preferencesKeys.all });
      toast.success("Preferences saved");
    },
    onError: () => toast.error("Couldn't save preferences. Try again."),
  });
}

/** Delete career preferences. */
export function useDeletePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => preferencesService.deletePreferences(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preferencesKeys.all });
      toast.success("Preferences removed");
    },
    onError: () => toast.error("Couldn't delete preferences. Try again."),
  });
}