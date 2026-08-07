/**
 * Experience Service.
 *
 * Business logic layer for experience CRUD operations.
 * Delegates persistence to the ExperienceRepository.
 *
 * UI → Hooks → Service → Repository → Supabase
 */

import type {
  ExperienceDTO,
  ExperienceRepository,
  CreateExperienceInput,
  UpdateExperienceInput,
} from "@/repositories/supabase-experience.repository";
import { SupabaseExperienceRepository } from "@/repositories/supabase-experience.repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

/**
 * Creates an ExperienceService bound to the active repository implementation.
 *
 * The repository is resolved lazily on first use so that importing this module
 * never throws when Supabase is not configured.
 */
export function createExperienceService(repository?: ExperienceRepository) {
  let resolved: ExperienceRepository | null = repository ?? null;

  const repo = (): ExperienceRepository => {
    if (!resolved) resolved = getDefaultRepository();
    return resolved;
  };

  return {
    /**
     * Create a new experience record for the current user.
     * Validates required fields before persisting.
     */
    async createExperience(input: CreateExperienceInput): Promise<ExperienceDTO> {
      if (!input.companyName || input.companyName.trim().length < 2) {
        throw new AppError(
          "Company name must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      if (!input.jobTitle || input.jobTitle.trim().length < 2) {
        throw new AppError("Job title must be at least 2 characters", "VALIDATION_ERROR", 422);
      }
      return repo().create({
        companyName: input.companyName.trim(),
        jobTitle: input.jobTitle.trim(),
        employmentType: input.employmentType?.trim() || null,
        location: input.location?.trim() || null,
        startDate: input.startDate?.trim() || null,
        endDate: input.currentlyWorking ? null : input.endDate?.trim() || null,
        currentlyWorking: input.currentlyWorking ?? false,
        description: input.description?.trim() || null,
      });
    },

    /**
     * Get all experience records for the current user.
     */
    async getExperience(): Promise<ExperienceDTO[]> {
      return repo().getAll();
    },

    /**
     * Get a single experience record by ID.
     */
    async getExperienceById(id: string): Promise<ExperienceDTO | null> {
      return repo().getById(id);
    },

    /**
     * Update an experience record.
     * Only provided fields are updated; others remain unchanged.
     */
    async updateExperience(id: string, input: UpdateExperienceInput): Promise<ExperienceDTO> {
      if (input.companyName !== undefined && input.companyName.trim().length < 2) {
        throw new AppError(
          "Company name must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      if (input.jobTitle !== undefined && input.jobTitle.trim().length < 2) {
        throw new AppError("Job title must be at least 2 characters", "VALIDATION_ERROR", 422);
      }
      return repo().update(id, {
        ...(input.companyName !== undefined && { companyName: input.companyName.trim() }),
        ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle.trim() }),
        ...(input.employmentType !== undefined && {
          employmentType: input.employmentType?.trim() || null,
        }),
        ...(input.location !== undefined && { location: input.location?.trim() || null }),
        ...(input.startDate !== undefined && { startDate: input.startDate?.trim() || null }),
        ...(input.currentlyWorking !== undefined && {
          currentlyWorking: input.currentlyWorking,
        }),
        // A currently-held role never keeps an end date.
        ...(input.currentlyWorking === true
          ? { endDate: null }
          : input.endDate !== undefined && { endDate: input.endDate?.trim() || null }),
        ...(input.description !== undefined && {
          description: input.description?.trim() || null,
        }),
      });
    },

    /**
     * Delete an experience record.
     */
    async deleteExperience(id: string): Promise<void> {
      return repo().delete(id);
    },
  };
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRepository(): ExperienceRepository {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Experience persistence requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabaseExperienceRepository(client);
}

/** Singleton service instance */
export const experienceService = createExperienceService();

export type ExperienceService = ReturnType<typeof createExperienceService>;