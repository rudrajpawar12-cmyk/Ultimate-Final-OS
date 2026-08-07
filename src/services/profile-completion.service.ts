/**
 * Profile Completion Service.
 *
 * Aggregates data from all profile sections (profile, education, experience,
 * skills, projects, preferences, resumes) to calculate a comprehensive
 * completion percentage and track missing mandatory fields.
 *
 * UI → Hooks → Service → Repository → Supabase
 */

import type {
  ProfileCompletionDTO,
  ProfileCompletionRepository,
  UpsertProfileCompletionInput,
} from "@/repositories/supabase-profile-completion.repository";
import { SupabaseProfileCompletionRepository } from "@/repositories/supabase-profile-completion.repository";
import type { CandidateProfileDTO } from "@/repositories/supabase-candidate-profile.repository";
import type { EducationDTO } from "@/repositories/supabase-education.repository";
import type { ExperienceDTO } from "@/repositories/supabase-experience.repository";
import type { SkillDTO } from "@/repositories/supabase-skills.repository";
import type { ProjectDTO } from "@/repositories/supabase-projects.repository";
import type { PreferencesDTO } from "@/repositories/supabase-preferences.repository";
import type { ResumeDTO } from "@/repositories/supabase-resumes.repository";
import { buildCompletionReport, type CompletionRule } from "@/services/completion.service";
import type { CompletionReport } from "@/types/onboarding";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

/** Section weight configuration for completion calculation */
export interface SectionWeight {
  id: string;
  label: string;
  hint: string;
  weight: number;
  mandatory: boolean;
}

/** The profile data aggregated from all sections */
export interface ProfileSectionsData {
  profile: CandidateProfileDTO | null;
  education: EducationDTO[];
  experience: ExperienceDTO[];
  skills: SkillDTO[];
  projects: ProjectDTO[];
  preferences: PreferencesDTO | null;
  resumes: ResumeDTO[];
}

/** Detailed section completion status */
export interface SectionCompletionDetail {
  id: string;
  label: string;
  hint: string;
  weight: number;
  mandatory: boolean;
  done: boolean;
  missingFields: string[];
}

/** Full completion calculation result */
export interface CompletionCalculationResult {
  percentage: number;
  completedSections: string[];
  incompleteSections: string[];
  missingFields: string[];
  sectionDetails: SectionCompletionDetail[];
  report: CompletionReport;
}

/** Section definitions with weights and mandatory flags */
const SECTION_DEFINITIONS: SectionWeight[] = [
  {
    id: "basic_info",
    label: "Basic Information",
    hint: "Full name is required",
    weight: 3,
    mandatory: true,
  },
  {
    id: "bio",
    label: "Bio / Summary",
    hint: "Add a professional summary (30+ characters)",
    weight: 2,
    mandatory: false,
  },
  {
    id: "education",
    label: "Education",
    hint: "Add at least one education record",
    weight: 2,
    mandatory: false,
  },
  {
    id: "experience",
    label: "Experience",
    hint: "Add at least one work experience",
    weight: 3,
    mandatory: false,
  },
  {
    id: "skills",
    label: "Skills",
    hint: "Add at least 3 skills for better matching",
    weight: 3,
    mandatory: true,
  },
  {
    id: "projects",
    label: "Projects",
    hint: "Showcase at least one project",
    weight: 1,
    mandatory: false,
  },
  {
    id: "preferences",
    label: "Career Preferences",
    hint: "Set desired roles and work preferences",
    weight: 2,
    mandatory: true,
  },
  {
    id: "resume",
    label: "Resume",
    hint: "Upload at least one resume",
    weight: 2,
    mandatory: false,
  },
  {
    id: "contact",
    label: "Contact Information",
    hint: "Add phone number or location",
    weight: 1,
    mandatory: false,
  },
];

/**
 * Creates a ProfileCompletionService bound to the active repository implementation.
 */
export function createProfileCompletionService(repository?: ProfileCompletionRepository) {
  let resolved: ProfileCompletionRepository | null = repository ?? null;

  const repo = (): ProfileCompletionRepository => {
    if (!resolved) resolved = getDefaultRepository();
    return resolved;
  };

  return {
    /**
     * Get the persisted profile completion record for the current user.
     * Returns null if no record exists yet.
     */
    async getCompletion(): Promise<ProfileCompletionDTO | null> {
      return repo().getByUserId();
    },

    /**
     * Calculate completion from all profile section data.
     * This is a pure computation that does not hit the database.
     */
    calculateCompletion(data: ProfileSectionsData): CompletionCalculationResult {
      const sectionDetails: SectionCompletionDetail[] = SECTION_DEFINITIONS.map((def) => {
        const { done, missingFields } = evaluateSection(def.id, data);
        return {
          ...def,
          done,
          missingFields,
        };
      });

      const completedSections = sectionDetails.filter((s) => s.done).map((s) => s.id);

      const incompleteSections = sectionDetails.filter((s) => !s.done).map((s) => s.id);

      const missingFields = sectionDetails
        .filter((s) => !s.done && s.mandatory)
        .flatMap((s) => s.missingFields);

      // Build completion rules for the shared completion engine
      const rules: CompletionRule[] = sectionDetails.map((s) => ({
        id: s.id,
        label: s.label,
        hint: s.hint,
        weight: s.weight,
        done: s.done,
      }));

      const report = buildCompletionReport(rules);

      return {
        percentage: report.percentage,
        completedSections,
        incompleteSections,
        missingFields,
        sectionDetails,
        report,
      };
    },

    /**
     * Calculate and persist the completion data.
     * Call this whenever profile data changes to keep completion in sync.
     */
    async updateCompletion(data: ProfileSectionsData): Promise<ProfileCompletionDTO> {
      const result = this.calculateCompletion(data);

      const input: UpsertProfileCompletionInput = {
        percentage: result.percentage,
        completedSections: result.completedSections,
        incompleteSections: result.incompleteSections,
        missingFields: result.missingFields,
        sectionDetails: Object.fromEntries(
          result.sectionDetails.map((s) => [
            s.id,
            { done: s.done, missingFields: s.missingFields },
          ]),
        ),
      };

      return repo().upsert(input);
    },

    /**
     * Delete the profile completion record.
     */
    async deleteCompletion(): Promise<void> {
      return repo().delete();
    },

    /**
     * Get section definitions for UI display.
     */
    getSectionDefinitions(): SectionWeight[] {
      return [...SECTION_DEFINITIONS];
    },
  };
}

/**
 * Evaluate whether a specific section is complete and identify missing fields.
 */
function evaluateSection(
  sectionId: string,
  data: ProfileSectionsData,
): { done: boolean; missingFields: string[] } {
  switch (sectionId) {
    case "basic_info": {
      const missingFields: string[] = [];
      if (!data.profile?.fullName || data.profile.fullName.trim().length < 2) {
        missingFields.push("Full name");
      }
      return { done: missingFields.length === 0, missingFields };
    }

    case "bio": {
      const missingFields: string[] = [];
      if (!data.profile?.bio || data.profile.bio.trim().length < 30) {
        missingFields.push("Professional summary (30+ characters)");
      }
      return { done: missingFields.length === 0, missingFields };
    }

    case "education": {
      const missingFields: string[] = [];
      if (data.education.length === 0) {
        missingFields.push("At least one education record");
      }
      return { done: missingFields.length === 0, missingFields };
    }

    case "experience": {
      const missingFields: string[] = [];
      if (data.experience.length === 0) {
        missingFields.push("At least one work experience");
      }
      return { done: missingFields.length === 0, missingFields };
    }

    case "skills": {
      const missingFields: string[] = [];
      if (data.skills.length < 3) {
        missingFields.push(`At least 3 skills (currently ${data.skills.length})`);
      }
      return { done: missingFields.length === 0, missingFields };
    }

    case "projects": {
      const missingFields: string[] = [];
      if (data.projects.length === 0) {
        missingFields.push("At least one project");
      }
      return { done: missingFields.length === 0, missingFields };
    }

    case "preferences": {
      const missingFields: string[] = [];
      if (!data.preferences) {
        missingFields.push("Career preferences not set");
      } else {
        if (!data.preferences.desiredRoles || data.preferences.desiredRoles.length === 0) {
          missingFields.push("At least one desired role");
        }
      }
      return { done: missingFields.length === 0, missingFields };
    }

    case "resume": {
      const missingFields: string[] = [];
      if (data.resumes.length === 0) {
        missingFields.push("At least one resume upload");
      }
      return { done: missingFields.length === 0, missingFields };
    }

    case "contact": {
      const missingFields: string[] = [];
      const hasPhone = Boolean(data.profile?.phone && data.profile.phone.trim().length > 0);
      const hasLocation = Boolean(
        data.profile?.location && data.profile.location.trim().length > 0,
      );
      if (!hasPhone && !hasLocation) {
        missingFields.push("Phone number or location");
      }
      return { done: missingFields.length === 0, missingFields };
    }

    default:
      return { done: false, missingFields: ["Unknown section"] };
  }
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRepository(): ProfileCompletionRepository {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Profile completion persistence requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabaseProfileCompletionRepository(client);
}

/** Singleton service instance */
export const profileCompletionService = createProfileCompletionService();

export type ProfileCompletionService = ReturnType<typeof createProfileCompletionService>;
