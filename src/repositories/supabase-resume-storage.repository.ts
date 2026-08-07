/**
 * Supabase-backed Resume Storage repository.
 *
 * Encapsulates Supabase Storage operations for the private `resumes` bucket.
 * This layer is intentionally thin: it performs storage I/O and error
 * normalization only. All business rules (validation, metadata persistence,
 * active-resume management) belong to the service layer.
 *
 * Object path convention (enforced by storage RLS in 0009_resume_storage_policies.sql):
 *   `<userId>/<fileName>`
 * The first path segment MUST be the owning user id.
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";

/** Bucket created in 0008_resume_storage_bucket.sql */
const RESUME_BUCKET = "resumes";

/** Default signed URL lifetime for downloads (seconds) */
const DEFAULT_DOWNLOAD_EXPIRES_IN = 60;

/** Default signed URL lifetime for inline previews (seconds) */
const DEFAULT_PREVIEW_EXPIRES_IN = 300;

/** Input for uploading a resume file */
export interface UploadResumeFileInput {
  /** File name stored inside the user's folder (no leading slash) */
  fileName: string;
  /** Binary payload to upload */
  file: File | Blob;
  /** MIME type of the payload; defaults to the Blob type or PDF */
  contentType?: string;
  /** Overwrite an existing object at the same path */
  upsert?: boolean;
}

/** Result of a successful upload */
export interface UploadResumeFileResult {
  /** Object path inside the bucket, e.g. `<userId>/resume.pdf` */
  storagePath: string;
  /** Bucket the object was written to */
  bucket: string;
}

/** Result of a signed URL generation */
export interface SignedResumeUrlResult {
  /** Time-limited URL */
  signedUrl: string;
  /** Object path the URL points to */
  storagePath: string;
  /** Lifetime of the URL in seconds */
  expiresIn: number;
}

/**
 * Interface for Resume file storage operations.
 */
export interface ResumeStorageRepository {
  upload(input: UploadResumeFileInput): Promise<UploadResumeFileResult>;
  remove(storagePath: string): Promise<void>;
  createSignedDownloadUrl(
    storagePath: string,
    expiresIn?: number,
  ): Promise<SignedResumeUrlResult>;
  createSignedPreviewUrl(
    storagePath: string,
    expiresIn?: number,
  ): Promise<SignedResumeUrlResult>;
}

/**
 * Supabase implementation of ResumeStorageRepository.
 * Extends BaseRepository for shared utilities (auth, error normalization).
 */
export class SupabaseResumeStorageRepository
  extends BaseRepository
  implements ResumeStorageRepository
{
  private readonly BUCKET = RESUME_BUCKET;

  /**
   * Upload a resume file into the authenticated user's storage folder.
   * The resolved object path is always prefixed with the user id.
   */
  async upload(input: UploadResumeFileInput): Promise<UploadResumeFileResult> {
    const userId = await this.getCurrentUserId();
    const storagePath = this.buildObjectPath(userId, input.fileName);

    const contentType =
      input.contentType ??
      (input.file instanceof Blob && input.file.type.length > 0
        ? input.file.type
        : "application/pdf");

    const { data, error } = await this.client.storage
      .from(this.BUCKET)
      .upload(storagePath, input.file, {
        contentType,
        upsert: input.upsert ?? false,
        cacheControl: "3600",
      });

    if (error) {
      throw this.toStorageError(error, "Failed to upload resume file");
    }

    if (!data?.path) {
      throw new AppError("Failed to upload resume file", "SERVER_ERROR", 500);
    }

    return { storagePath: data.path, bucket: this.BUCKET };
  }

  /**
   * Delete a resume file owned by the authenticated user.
   */
  async remove(storagePath: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    const path = this.assertOwnedPath(userId, storagePath);

    const { error } = await this.client.storage.from(this.BUCKET).remove([path]);

    if (error) {
      throw this.toStorageError(error, "Failed to delete resume file");
    }
  }

  /**
   * Generate a time-limited signed URL that forces a file download.
   */
  async createSignedDownloadUrl(
    storagePath: string,
    expiresIn: number = DEFAULT_DOWNLOAD_EXPIRES_IN,
  ): Promise<SignedResumeUrlResult> {
    return this.createSignedUrl(storagePath, expiresIn, true);
  }

  /**
   * Generate a time-limited signed URL suitable for inline preview
   * (rendered in the browser instead of downloaded).
   */
  async createSignedPreviewUrl(
    storagePath: string,
    expiresIn: number = DEFAULT_PREVIEW_EXPIRES_IN,
  ): Promise<SignedResumeUrlResult> {
    return this.createSignedUrl(storagePath, expiresIn, false);
  }

  /**
   * Shared signed URL generation for download and preview variants.
   */
  private async createSignedUrl(
    storagePath: string,
    expiresIn: number,
    forceDownload: boolean,
  ): Promise<SignedResumeUrlResult> {
    const userId = await this.getCurrentUserId();
    const path = this.assertOwnedPath(userId, storagePath);

    if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw new AppError(
        "Signed URL expiry must be a positive number of seconds",
        "VALIDATION_ERROR",
        422,
      );
    }

    const { data, error } = await this.client.storage
      .from(this.BUCKET)
      .createSignedUrl(path, expiresIn, forceDownload ? { download: true } : undefined);

    if (error) {
      throw this.toStorageError(error, "Failed to generate signed resume URL");
    }

    if (!data?.signedUrl) {
      throw new AppError(
        "Failed to generate signed resume URL",
        "SERVER_ERROR",
        500,
      );
    }

    return { signedUrl: data.signedUrl, storagePath: path, expiresIn };
  }

  /**
   * Build a bucket object path scoped to the owning user.
   */
  private buildObjectPath(userId: string, fileName: string): string {
    const normalized = fileName.replace(/^\/+/, "").trim();

    if (normalized.length === 0) {
      throw new AppError("File name is required", "VALIDATION_ERROR", 422);
    }

    if (normalized.includes("..")) {
      throw new AppError("Invalid file name", "VALIDATION_ERROR", 422);
    }

    return normalized.startsWith(`${userId}/`)
      ? normalized
      : `${userId}/${normalized}`;
  }

  /**
   * Ensure the given object path belongs to the authenticated user.
   * Mirrors the storage RLS constraint so violations fail fast and locally.
   */
  private assertOwnedPath(userId: string, storagePath: string): string {
    const normalized = storagePath.replace(/^\/+/, "").trim();

    if (normalized.length === 0) {
      throw new AppError("Storage path is required", "VALIDATION_ERROR", 422);
    }

    if (normalized.includes("..") || !normalized.startsWith(`${userId}/`)) {
      throw new AppError(
        "You don't have access to this resume file",
        "FORBIDDEN",
        403,
      );
    }

    return normalized;
  }

  /**
   * Normalize a Supabase Storage error into an AppError.
   */
  private toStorageError(
    error: { message: string; name?: string; status?: number },
    fallbackMessage: string,
  ): AppError {
    const status = error.status ?? 500;
    const message = error.message || fallbackMessage;

    switch (status) {
      case 400:
        return new AppError(message, "VALIDATION_ERROR", 400);
      case 401:
        return new AppError(message, "AUTH_REQUIRED", 401);
      case 403:
        return new AppError(message, "FORBIDDEN", 403);
      case 404:
        return new AppError(message, "NOT_FOUND", 404);
      case 409:
        return new AppError(message, "CONFLICT", 409);
      case 413:
        return new AppError(message, "VALIDATION_ERROR", 413);
      default:
        return new AppError(message, "SERVER_ERROR", status);
    }
  }
}