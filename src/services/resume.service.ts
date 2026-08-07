/**
 * Resume Service.
 *
 * Business logic layer for resume metadata CRUD operations.
 * Delegates persistence to the ResumesRepository.
 *
 * UI → Hooks → Service → Repository → Supabase
 */

import type {
  ResumeDTO,
  ResumesRepository,
  CreateResumeInput,
  UpdateResumeInput,
} from "@/repositories/supabase-resumes.repository";
import { SupabaseResumesRepository } from "@/repositories/supabase-resumes.repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

/**
 * Creates a ResumeService bound to the active repository implementation.
 *
 * The repository is resolved lazily on first use so that importing this module
 * never throws when Supabase is not configured.
 */
export function createResumeService(repository?: ResumesRepository) {
  let resolved: ResumesRepository | null = repository ?? null;

  const repo = (): ResumesRepository => {
    if (!resolved) resolved = getDefaultRepository();
    return resolved;
  };

  return {
    /**
     * Create a new resume metadata record for the current user.
     * Validates required fields before persisting.
     */
    async createResume(input: CreateResumeInput): Promise<ResumeDTO> {
      if (!input.fileName || input.fileName.trim().length < 1) {
        throw new AppError(
          "File name is required",
          "VALIDATION_ERROR",
          422,
        );
      }
      if (!input.originalFileName || input.originalFileName.trim().length < 1) {
        throw new AppError(
          "Original file name is required",
          "VALIDATION_ERROR",
          422,
        );
      }
      if (input.fileSize < 0) {
        throw new AppError(
          "File size must be non-negative",
          "VALIDATION_ERROR",
          422,
        );
      }
      return repo().create({
        fileName: input.fileName.trim(),
        originalFileName: input.originalFileName.trim(),
        fileSize: input.fileSize,
        mimeType: input.mimeType?.trim() || "application/pdf",
        storagePath: input.storagePath ?? null,
      });
    },

    /**
     * Get all resume metadata records for the current user.
     */
    async getResumes(): Promise<ResumeDTO[]> {
      return repo().getAll();
    },

    /**
     * Get a single resume metadata record by ID.
     */
    async getResumeById(id: string): Promise<ResumeDTO | null> {
      return repo().getById(id);
    },

    /**
     * Get the currently active resume for the current user.
     */
    async getActiveResume(): Promise<ResumeDTO | null> {
      return repo().getActive();
    },

    /**
     * Update a resume metadata record.
     * Only provided fields are updated; others remain unchanged.
     */
    async updateResume(id: string, input: UpdateResumeInput): Promise<ResumeDTO> {
      if (input.fileName !== undefined && input.fileName.trim().length < 1) {
        throw new AppError(
          "File name is required",
          "VALIDATION_ERROR",
          422,
        );
      }
      return repo().update(id, {
        ...(input.fileName !== undefined && { fileName: input.fileName.trim() }),
        ...(input.originalFileName !== undefined && {
          originalFileName: input.originalFileName.trim(),
        }),
        ...(input.fileSize !== undefined && { fileSize: input.fileSize }),
        ...(input.mimeType !== undefined && { mimeType: input.mimeType?.trim() }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.storagePath !== undefined && { storagePath: input.storagePath }),
      });
    },

    /**
     * Delete a resume metadata record.
     */
    async deleteResume(id: string): Promise<void> {
      return repo().delete(id);
    },

    /**
     * Set a specific resume as active, deactivating all others.
     * Returns the full updated list.
     */
    async setActiveResume(id: string): Promise<ResumeDTO[]> {
      return repo().setActive(id);
    },
  };
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRepository(): ResumesRepository {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Resume persistence requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabaseResumesRepository(client);
}

/** Singleton service instance */
export const resumeService = createResumeService();

export type ResumeService = ReturnType<typeof createResumeService>;