/**
 * Supabase-backed Education repository.
 *
 * Implements CRUD operations for the education table.
 * Each education record belongs exclusively to the authenticated user (RLS enforced).
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

/** Shape returned from the education table */
type EducationRow = Database["public"]["Tables"]["education"]["Row"];
type EducationInsert = Database["public"]["Tables"]["education"]["Insert"];
type EducationUpdate = Database["public"]["Tables"]["education"]["Update"];

/** Domain-level education DTO */
export interface EducationDTO {
  id: string;
  userId: string;
  institution: string;
  degree: string;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  grade: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating an education record */
export interface CreateEducationInput {
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  grade?: string | null;
  description?: string | null;
}

/** Input for updating an education record */
export interface UpdateEducationInput {
  institution?: string;
  degree?: string;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  grade?: string | null;
  description?: string | null;
}

/**
 * Interface for Education persistence operations.
 */
export interface EducationRepository {
  create(input: CreateEducationInput): Promise<EducationDTO>;
  getAll(): Promise<EducationDTO[]>;
  getById(id: string): Promise<EducationDTO | null>;
  update(id: string, input: UpdateEducationInput): Promise<EducationDTO>;
  delete(id: string): Promise<void>;
}

/**
 * Maps a database row to the domain DTO.
 */
function mapRowToDTO(row: EducationRow): EducationDTO {
  return {
    id: row.id,
    userId: row.user_id,
    institution: row.institution,
    degree: row.degree,
    fieldOfStudy: row.field_of_study,
    startDate: row.start_date,
    endDate: row.end_date,
    grade: row.grade,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Supabase implementation of EducationRepository.
 * Extends BaseRepository for shared utilities (auth, query helpers).
 */
export class SupabaseEducationRepository
  extends BaseRepository
  implements EducationRepository
{
  private readonly TABLE = "education";

  /**
   * Create a new education record for the authenticated user.
   */
  async create(input: CreateEducationInput): Promise<EducationDTO> {
    const userId = await this.getCurrentUserId();

    const insertData: EducationInsert = {
      user_id: userId,
      institution: input.institution,
      degree: input.degree,
      field_of_study: input.fieldOfStudy ?? null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      grade: input.grade ?? null,
      description: input.description ?? null,
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
      throw new AppError("Failed to create education record", "SERVER_ERROR", 500);
    }

    return mapRowToDTO(data as EducationRow);
  }

  /**
   * Get all education records for the authenticated user.
   * Returns empty array if none exist.
   */
  async getAll(): Promise<EducationDTO[]> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false });

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return (data ?? []).map((row: EducationRow) => mapRowToDTO(row));
  }

  /**
   * Get a single education record by ID for the authenticated user.
   * Returns null if not found.
   */
  async getById(id: string): Promise<EducationDTO | null> {
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

    return data ? mapRowToDTO(data as EducationRow) : null;
  }

  /**
   * Update an education record for the authenticated user.
   * Throws NOT_FOUND if no record exists with the given ID.
   */
  async update(id: string, input: UpdateEducationInput): Promise<EducationDTO> {
    const userId = await this.getCurrentUserId();

    const updateData: EducationUpdate = {
      ...(input.institution !== undefined && { institution: input.institution }),
      ...(input.degree !== undefined && { degree: input.degree }),
      ...(input.fieldOfStudy !== undefined && { field_of_study: input.fieldOfStudy }),
      ...(input.startDate !== undefined && { start_date: input.startDate }),
      ...(input.endDate !== undefined && { end_date: input.endDate }),
      ...(input.grade !== undefined && { grade: input.grade }),
      ...(input.description !== undefined && { description: input.description }),
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
      throw new AppError("Education record not found", "NOT_FOUND", 404);
    }

    return mapRowToDTO(data as EducationRow);
  }

  /**
   * Delete an education record for the authenticated user.
   */
  async delete(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.client.from(this.TABLE) as any)
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }
  }
}