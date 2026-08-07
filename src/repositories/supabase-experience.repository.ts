/**
 * Supabase-backed Experience repository.
 *
 * Implements CRUD operations for the experience table.
 * Each experience record belongs exclusively to the authenticated user (RLS enforced).
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

/** Shape returned from the experience table */
type ExperienceRow = Database["public"]["Tables"]["experience"]["Row"];
type ExperienceInsert = Database["public"]["Tables"]["experience"]["Insert"];
type ExperienceUpdate = Database["public"]["Tables"]["experience"]["Update"];

/** Domain-level experience DTO */
export interface ExperienceDTO {
  id: string;
  userId: string;
  companyName: string;
  jobTitle: string;
  employmentType: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  currentlyWorking: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating an experience record */
export interface CreateExperienceInput {
  companyName: string;
  jobTitle: string;
  employmentType?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  currentlyWorking?: boolean;
  description?: string | null;
}

/** Input for updating an experience record */
export interface UpdateExperienceInput {
  companyName?: string;
  jobTitle?: string;
  employmentType?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  currentlyWorking?: boolean;
  description?: string | null;
}

/**
 * Interface for Experience persistence operations.
 */
export interface ExperienceRepository {
  create(input: CreateExperienceInput): Promise<ExperienceDTO>;
  getAll(): Promise<ExperienceDTO[]>;
  getById(id: string): Promise<ExperienceDTO | null>;
  update(id: string, input: UpdateExperienceInput): Promise<ExperienceDTO>;
  delete(id: string): Promise<void>;
}

/**
 * Maps a database row to the domain DTO.
 */
function mapRowToDTO(row: ExperienceRow): ExperienceDTO {
  return {
    id: row.id,
    userId: row.user_id,
    companyName: row.company_name,
    jobTitle: row.job_title,
    employmentType: row.employment_type,
    location: row.location,
    startDate: row.start_date,
    endDate: row.end_date,
    currentlyWorking: row.currently_working,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Supabase implementation of ExperienceRepository.
 * Extends BaseRepository for shared utilities (auth, query helpers).
 */
export class SupabaseExperienceRepository
  extends BaseRepository
  implements ExperienceRepository
{
  private readonly TABLE = "experience";

  /**
   * Create a new experience record for the authenticated user.
   */
  async create(input: CreateExperienceInput): Promise<ExperienceDTO> {
    const userId = await this.getCurrentUserId();

    const insertData: ExperienceInsert = {
      user_id: userId,
      company_name: input.companyName,
      job_title: input.jobTitle,
      employment_type: input.employmentType ?? null,
      location: input.location ?? null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      currently_working: input.currentlyWorking ?? false,
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
      throw new AppError("Failed to create experience record", "SERVER_ERROR", 500);
    }

    return mapRowToDTO(data as ExperienceRow);
  }

  /**
   * Get all experience records for the authenticated user.
   * Returns empty array if none exist.
   */
  async getAll(): Promise<ExperienceDTO[]> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false });

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return (data ?? []).map((row: ExperienceRow) => mapRowToDTO(row));
  }

  /**
   * Get a single experience record by ID for the authenticated user.
   * Returns null if not found.
   */
  async getById(id: string): Promise<ExperienceDTO | null> {
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

    return data ? mapRowToDTO(data as ExperienceRow) : null;
  }

  /**
   * Update an experience record for the authenticated user.
   * Throws NOT_FOUND if no record exists with the given ID.
   */
  async update(id: string, input: UpdateExperienceInput): Promise<ExperienceDTO> {
    const userId = await this.getCurrentUserId();

    const updateData: ExperienceUpdate = {
      ...(input.companyName !== undefined && { company_name: input.companyName }),
      ...(input.jobTitle !== undefined && { job_title: input.jobTitle }),
      ...(input.employmentType !== undefined && { employment_type: input.employmentType }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.startDate !== undefined && { start_date: input.startDate }),
      ...(input.endDate !== undefined && { end_date: input.endDate }),
      ...(input.currentlyWorking !== undefined && {
        currently_working: input.currentlyWorking,
      }),
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
      throw new AppError("Experience record not found", "NOT_FOUND", 404);
    }

    return mapRowToDTO(data as ExperienceRow);
  }

  /**
   * Delete an experience record for the authenticated user.
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