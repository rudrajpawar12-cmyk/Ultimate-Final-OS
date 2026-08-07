/**
 * Supabase-backed Resumes repository.
 *
 * Implements CRUD operations for the resumes table (metadata only).
 * Each resume record belongs exclusively to the authenticated user (RLS enforced).
 *
 * NOTE: This phase only persists metadata. File upload to Supabase Storage
 * will be implemented in a future phase.
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

/** Shape returned from the resumes table */
type ResumeRow = Database["public"]["Tables"]["resumes"]["Row"];
type ResumeInsert = Database["public"]["Tables"]["resumes"]["Insert"];
type ResumeUpdate = Database["public"]["Tables"]["resumes"]["Update"];

/** Domain-level resume metadata DTO */
export interface ResumeDTO {
  id: string;
  userId: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  isActive: boolean;
  storagePath: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a resume metadata record */
export interface CreateResumeInput {
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType?: string;
  storagePath?: string | null;
}

/** Input for updating a resume metadata record */
export interface UpdateResumeInput {
  fileName?: string;
  originalFileName?: string;
  fileSize?: number;
  mimeType?: string;
  isActive?: boolean;
  storagePath?: string | null;
}

/**
 * Interface for Resume metadata persistence operations.
 */
export interface ResumesRepository {
  create(input: CreateResumeInput): Promise<ResumeDTO>;
  getAll(): Promise<ResumeDTO[]>;
  getById(id: string): Promise<ResumeDTO | null>;
  getActive(): Promise<ResumeDTO | null>;
  update(id: string, input: UpdateResumeInput): Promise<ResumeDTO>;
  delete(id: string): Promise<void>;
  setActive(id: string): Promise<ResumeDTO[]>;
}

/**
 * Maps a database row to the domain DTO.
 */
function mapRowToDTO(row: ResumeRow): ResumeDTO {
  return {
    id: row.id,
    userId: row.user_id,
    fileName: row.file_name,
    originalFileName: row.original_file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    uploadedAt: row.uploaded_at,
    isActive: row.is_active,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Supabase implementation of ResumesRepository.
 * Extends BaseRepository for shared utilities (auth, query helpers).
 */
export class SupabaseResumesRepository
  extends BaseRepository
  implements ResumesRepository
{
  private readonly TABLE = "resumes";

  /**
   * Create a new resume metadata record for the authenticated user.
   * Automatically deactivates all other resumes and sets this one as active.
   */
  async create(input: CreateResumeInput): Promise<ResumeDTO> {
    const userId = await this.getCurrentUserId();

    // Deactivate all existing resumes for this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.client.from(this.TABLE) as any)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    const insertData: ResumeInsert = {
      user_id: userId,
      file_name: input.fileName,
      original_file_name: input.originalFileName,
      file_size: input.fileSize,
      mime_type: input.mimeType ?? "application/pdf",
      is_active: true,
      storage_path: input.storagePath ?? null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    if (!data) {
      throw new AppError("Failed to create resume record", "SERVER_ERROR", 500);
    }

    return mapRowToDTO(data as ResumeRow);
  }

  /**
   * Get all resume metadata records for the authenticated user.
   * Returns empty array if none exist. Ordered by most recent first.
   */
  async getAll(): Promise<ResumeDTO[]> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return (data ?? []).map((row: ResumeRow) => mapRowToDTO(row));
  }

  /**
   * Get a single resume metadata record by ID for the authenticated user.
   * Returns null if not found.
   */
  async getById(id: string): Promise<ResumeDTO | null> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return data ? mapRowToDTO(data as ResumeRow) : null;
  }

  /**
   * Get the currently active resume for the authenticated user.
   * Returns null if no active resume exists.
   */
  async getActive(): Promise<ResumeDTO | null> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return data ? mapRowToDTO(data as ResumeRow) : null;
  }

  /**
   * Update a resume metadata record for the authenticated user.
   * Throws NOT_FOUND if no record exists with the given ID.
   */
  async update(id: string, input: UpdateResumeInput): Promise<ResumeDTO> {
    const userId = await this.getCurrentUserId();

    const updateData: ResumeUpdate = {
      ...(input.fileName !== undefined && { file_name: input.fileName }),
      ...(input.originalFileName !== undefined && { original_file_name: input.originalFileName }),
      ...(input.fileSize !== undefined && { file_size: input.fileSize }),
      ...(input.mimeType !== undefined && { mime_type: input.mimeType }),
      ...(input.isActive !== undefined && { is_active: input.isActive }),
      ...(input.storagePath !== undefined && { storage_path: input.storagePath }),
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      throw new AppError(
        error.message,
        error.code === "PGRST116" ? "NOT_FOUND" : "SERVER_ERROR",
        error.code === "PGRST116" ? 404 : 500,
      );
    }

    if (!data) {
      throw new AppError("Resume record not found", "NOT_FOUND", 404);
    }

    return mapRowToDTO(data as ResumeRow);
  }

  /**
   * Delete a resume metadata record for the authenticated user.
   * If the deleted resume was active, promotes the most recent remaining one.
   */
  async delete(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();

    // Check if the resume being deleted is active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: target } = await (this.client.from(this.TABLE) as any)
      .select("is_active")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.client.from(this.TABLE) as any)
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    // If the deleted resume was active, promote the most recent remaining one
    if (target?.is_active) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: remaining } = await (this.client.from(this.TABLE) as any)
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (remaining && remaining.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.client.from(this.TABLE) as any)
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq("id", remaining[0].id)
          .eq("user_id", userId);
      }
    }
  }

  /**
   * Set a specific resume as active, deactivating all others.
   * Returns the full updated list of resumes.
   */
  async setActive(id: string): Promise<ResumeDTO[]> {
    const userId = await this.getCurrentUserId();

    // Deactivate all resumes for this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.client.from(this.TABLE) as any)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    // Activate the target resume
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.client.from(this.TABLE) as any)
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    // Return the full updated list
    return this.getAll();
  }
}