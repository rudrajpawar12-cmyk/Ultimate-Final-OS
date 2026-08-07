/**
 * Education Service.
 *
 * Business logic layer for education CRUD operations.
 * Delegates persistence to the EducationRepository.
 *
 * UI → Hooks → Service → Repository → Supabase
 */

import type {
  EducationDTO,
  EducationRepository,
  CreateEducationInput,
  UpdateEducationInput,
} from "@/repositories/supabase-education.repository";
import { SupabaseEducationRepository } from "@/repositories/supabase-education.repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

/**
 * Creates an EducationService bound to the active repository implementation.
 *
 * The repository is resolved lazily on first use so that importing this module
 * never throws when Supabase is not configured.
 */
export function createEducationService(repository?: EducationRepository) {
  let resolved: EducationRepository | null = repository ?? null;

  const repo = (): EducationRepository => {
    if (!resolved) resolved = getDefaultRepository();
    return resolved;
  };

  return {
    /**
     * Create a new education record for the current user.
     * Validates required fields before persisting.
     */
    async createEducation(input: CreateEducationInput): Promise<EducationDTO> {
      if (!input.institution || input.institution.trim().length < 2) {
        throw new AppError(
          "Institution name must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      if (!input.degree || input.degree.trim().length < 2) {
        throw new AppError(
          "Degree must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      return repo().create({
        institution: input.institution.trim(),
        degree: input.degree.trim(),
        fieldOfStudy: input.fieldOfStudy?.trim() || null,
        startDate: input.startDate?.trim() || null,
        endDate: input.endDate?.trim() || null,
        grade: input.grade?.trim() || null,
        description: input.description?.trim() || null,
      });
    },

    /**
     * Get all education records for the current user.
     */
    async getEducation(): Promise<EducationDTO[]> {
      return repo().getAll();
    },

    /**
     * Get a single education record by ID.
     */
    async getEducationById(id: string): Promise<EducationDTO | null> {
      return repo().getById(id);
    },

    /**
     * Update an education record.
     * Only provided fields are updated; others remain unchanged.
     */
    async updateEducation(id: string, input: UpdateEducationInput): Promise<EducationDTO> {
      if (input.institution !== undefined && input.institution.trim().length < 2) {
        throw new AppError(
          "Institution name must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      if (input.degree !== undefined && input.degree.trim().length < 2) {
        throw new AppError(
          "Degree must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      return repo().update(id, {
        ...(input.institution !== undefined && { institution: input.institution.trim() }),
        ...(input.degree !== undefined && { degree: input.degree.trim() }),
        ...(input.fieldOfStudy !== undefined && { fieldOfStudy: input.fieldOfStudy?.trim() || null }),
        ...(input.startDate !== undefined && { startDate: input.startDate?.trim() || null }),
        ...(input.endDate !== undefined && { endDate: input.endDate?.trim() || null }),
        ...(input.grade !== undefined && { grade: input.grade?.trim() || null }),
        ...(input.description !== undefined && { description: input.description?.trim() || null }),
      });
    },

    /**
     * Delete an education record.
     */
    async deleteEducation(id: string): Promise<void> {
      return repo().delete(id);
    },
  };
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRepository(): EducationRepository {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Education persistence requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabaseEducationRepository(client);
}

/** Singleton service instance */
export const educationService = createEducationService();

export type EducationService = ReturnType<typeof createEducationService>;