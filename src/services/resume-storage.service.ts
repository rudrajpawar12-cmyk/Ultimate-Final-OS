/**
 * Resume Storage Service.
 *
 * Business logic layer for resume file storage operations (upload, delete,
 * signed URL generation). Delegates all I/O to the ResumeStorageRepository.
 *
 * UI → Hooks → Service → Repository → Supabase Storage
 */

import type {
  ResumeStorageRepository,
  UploadResumeFileInput,
  UploadResumeFileResult,
  SignedResumeUrlResult,
} from "@/repositories/supabase-resume-storage.repository";
import { SupabaseResumeStorageRepository } from "@/repositories/supabase-resume-storage.repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

/** Maximum allowed file size: 10 MB */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types for resume uploads */
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/**
 * Creates a ResumeStorageService bound to the active repository implementation.
 *
 * The repository is resolved lazily on first use so that importing this module
 * never throws when Supabase is not configured.
 */
export function createResumeStorageService(repository?: ResumeStorageRepository) {
  let resolved: ResumeStorageRepository | null = repository ?? null;

  const repo = (): ResumeStorageRepository => {
    if (!resolved) resolved = getDefaultRepository();
    return resolved;
  };

  return {
    /**
     * Upload a resume file for the authenticated user.
     * Validates file size and MIME type before delegating to the repository.
     */
    async uploadResume(input: UploadResumeFileInput): Promise<UploadResumeFileResult> {
      // Validate file name
      if (!input.fileName || input.fileName.trim().length === 0) {
        throw new AppError(
          "File name is required",
          "VALIDATION_ERROR",
          422,
        );
      }

      // Validate file payload
      if (!input.file) {
        throw new AppError(
          "File payload is required",
          "VALIDATION_ERROR",
          422,
        );
      }

      // Validate file size
      const fileSize = input.file.size;
      if (fileSize <= 0) {
        throw new AppError(
          "File is empty",
          "VALIDATION_ERROR",
          422,
        );
      }
      if (fileSize > MAX_FILE_SIZE_BYTES) {
        throw new AppError(
          `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`,
          "VALIDATION_ERROR",
          422,
        );
      }

      // Validate MIME type
      const mimeType =
        input.contentType ??
        (input.file instanceof Blob && input.file.type.length > 0
          ? input.file.type
          : "application/pdf");

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        throw new AppError(
          "Only PDF and Word documents are allowed",
          "VALIDATION_ERROR",
          422,
        );
      }

      return repo().upload({
        fileName: input.fileName.trim(),
        file: input.file,
        contentType: mimeType,
        upsert: input.upsert,
      });
    },

    /**
     * Delete a resume file from storage.
     * Validates the storage path before delegating to the repository.
     */
    async deleteResume(storagePath: string): Promise<void> {
      if (!storagePath || storagePath.trim().length === 0) {
        throw new AppError(
          "Storage path is required",
          "VALIDATION_ERROR",
          422,
        );
      }

      return repo().remove(storagePath.trim());
    },

    /**
     * Generate a time-limited signed URL for inline preview of a resume.
     * Suitable for rendering in an iframe or PDF viewer.
     */
    async getSignedPreviewUrl(
      storagePath: string,
      expiresIn?: number,
    ): Promise<SignedResumeUrlResult> {
      if (!storagePath || storagePath.trim().length === 0) {
        throw new AppError(
          "Storage path is required",
          "VALIDATION_ERROR",
          422,
        );
      }

      if (expiresIn !== undefined && (expiresIn <= 0 || !Number.isFinite(expiresIn))) {
        throw new AppError(
          "Expiry must be a positive number of seconds",
          "VALIDATION_ERROR",
          422,
        );
      }

      return repo().createSignedPreviewUrl(storagePath.trim(), expiresIn);
    },

    /**
     * Generate a time-limited signed URL that forces a file download.
     */
    async getSignedDownloadUrl(
      storagePath: string,
      expiresIn?: number,
    ): Promise<SignedResumeUrlResult> {
      if (!storagePath || storagePath.trim().length === 0) {
        throw new AppError(
          "Storage path is required",
          "VALIDATION_ERROR",
          422,
        );
      }

      if (expiresIn !== undefined && (expiresIn <= 0 || !Number.isFinite(expiresIn))) {
        throw new AppError(
          "Expiry must be a positive number of seconds",
          "VALIDATION_ERROR",
          422,
        );
      }

      return repo().createSignedDownloadUrl(storagePath.trim(), expiresIn);
    },
  };
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRepository(): ResumeStorageRepository {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Resume storage requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabaseResumeStorageRepository(client);
}

/** Singleton service instance */
export const resumeStorageService = createResumeStorageService();

export type ResumeStorageService = ReturnType<typeof createResumeStorageService>;