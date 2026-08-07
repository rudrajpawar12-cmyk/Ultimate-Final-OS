import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import {
  profileCompletionService,
  type ProfileSectionsData,
  type CompletionCalculationResult,
} from "@/services/profile-completion.service";
import type { CandidateProfileDTO } from "@/repositories/supabase-candidate-profile.repository";
import type { EducationDTO } from "@/repositories/supabase-education.repository";
import type { ExperienceDTO } from "@/repositories/supabase-experience.repository";
import type { SkillDTO } from "@/repositories/supabase-skills.repository";
import type { ProjectDTO } from "@/repositories/supabase-projects.repository";
import type { PreferencesDTO } from "@/repositories/supabase-preferences.repository";
import type { ResumeDTO } from "@/repositories/supabase-resumes.repository";
import { educationKeys } from "@/hooks/use-education";
import { experienceKeys } from "@/hooks/use-experience";
import { skillsKeys } from "@/hooks/use-skills";
import { projectsKeys } from "@/hooks/use-projects";
import { preferencesKeys } from "@/hooks/use-preferences";
import { resumeKeys } from "@/hooks/use-resumes";

/**
 * React Query hooks for Profile Completion Engine.
 *
 * Aggregates data from all profile sections and calculates completion.
 * Automatically updates when any section data changes.
 */

export const profileCompletionKeys = {
  all: ["profile-completion"] as const,
  persisted: () => [...profileCompletionKeys.all, "persisted"] as const,
  calculated: () => [...profileCompletionKeys.all, "calculated"] as const,
};

/**
 * Fetch the persisted profile completion record from Supabase.
 */
export function usePersistedCompletion() {
  return useQuery({
    queryKey: profileCompletionKeys.persisted(),
    queryFn: () => profileCompletionService.getCompletion(),
  });
}

/**
 * Calculate profile completion from all section data.
 * This hook aggregates data from React Query caches for all profile sections
 * and computes the completion locally.
 */
export function useProfileCompletion(sectionData: {
  profile: CandidateProfileDTO | null | undefined;
  education: EducationDTO[] | undefined;
  experience: ExperienceDTO[] | undefined;
  skills: SkillDTO[] | undefined;
  projects: ProjectDTO[] | undefined;
  preferences: PreferencesDTO | null | undefined;
  resumes: ResumeDTO[] | undefined;
  isLoading: boolean;
}) {
  const { profile, education, experience, skills, projects, preferences, resumes, isLoading } =
    sectionData;

  const data: ProfileSectionsData | null = useMemo(() => {
    if (isLoading) return null;
    return {
      profile: profile ?? null,
      education: education ?? [],
      experience: experience ?? [],
      skills: skills ?? [],
      projects: projects ?? [],
      preferences: preferences ?? null,
      resumes: resumes ?? [],
    };
  }, [profile, education, experience, skills, projects, preferences, resumes, isLoading]);

  const result: CompletionCalculationResult | null = useMemo(() => {
    if (!data) return null;
    return profileCompletionService.calculateCompletion(data);
  }, [data]);

  return {
    data: result,
    isLoading,
    sectionData: data,
  };
}

/**
 * Persist the completion calculation to Supabase.
 * Call this whenever profile data changes to keep the persisted record in sync.
 */
export function useUpdateProfileCompletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProfileSectionsData) => profileCompletionService.updateCompletion(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileCompletionKeys.all });
    },
    onError: () => toast.error("Couldn't update profile completion."),
  });
}

/**
 * Hook that provides automatic completion recalculation and persistence.
 * Watches all profile section queries and triggers an update when data changes.
 */
export function useProfileCompletionEngine(sectionData: {
  profile: CandidateProfileDTO | null | undefined;
  education: EducationDTO[] | undefined;
  experience: ExperienceDTO[] | undefined;
  skills: SkillDTO[] | undefined;
  projects: ProjectDTO[] | undefined;
  preferences: PreferencesDTO | null | undefined;
  resumes: ResumeDTO[] | undefined;
  isLoading: boolean;
}) {
  const completion = useProfileCompletion(sectionData);
  const updateMutation = useUpdateProfileCompletion();
  const queryClient = useQueryClient();

  /**
   * Trigger a completion recalculation and persist to Supabase.
   * Call this after any profile section mutation succeeds.
   */
  const recalculate = useCallback(() => {
    if (completion.sectionData) {
      updateMutation.mutate(completion.sectionData);
    }
  }, [completion.sectionData, updateMutation]);

  /**
   * Invalidate all profile section queries to force a fresh calculation.
   */
  const refreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: educationKeys.all });
    void queryClient.invalidateQueries({ queryKey: experienceKeys.all });
    void queryClient.invalidateQueries({ queryKey: skillsKeys.all });
    void queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    void queryClient.invalidateQueries({ queryKey: preferencesKeys.all });
    void queryClient.invalidateQueries({ queryKey: resumeKeys.all });
    void queryClient.invalidateQueries({ queryKey: profileCompletionKeys.all });
  }, [queryClient]);

  return {
    ...completion,
    recalculate,
    refreshAll,
    isPersisting: updateMutation.isPending,
  };
}
