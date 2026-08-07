/**
 * Supabase-backed Preferences repository.
 *
 * Implements upsert/get operations for the candidate_preferences table.
 * Each user has exactly one preferences record (1:1 relationship, RLS enforced).
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

/** Shape returned from the candidate_preferences table */
type PreferencesRow = Database["public"]["Tables"]["candidate_preferences"]["Row"];
type PreferencesInsert = Database["public"]["Tables"]["candidate_preferences"]["Insert"];
type PreferencesUpdate = Database["public"]["Tables"]["candidate_preferences"]["Update"];

/** Domain-level preferences DTO */
export interface PreferencesDTO {
  id: string;
  userId: string;
  desiredRoles: string[];
  locations: string[];
  workMode: string;
  minSalary: number;
  noticePeriod: string | null;
  openToRelocate: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating/updating preferences */
export interface UpsertPreferencesInput {
  desiredRoles?: string[];
  locations?: string[];
  workMode?: string;
  minSalary?: number;
  noticePeriod?: string | null;
  openToRelocate?: boolean;
}

/**
 * Interface for Preferences persistence operations.
 */
export interface PreferencesRepository {
  get(): Promise<PreferencesDTO | null>;
  upsert(input: UpsertPreferencesInput): Promise<PreferencesDTO>;
  delete(): Promise<void>;
}

/**
 * Maps a database row to the domain DTO.
 */
function mapRowToDTO(row: PreferencesRow): PreferencesDTO {
  return {
    id: row.id,
    userId: row.user_id,
    desiredRoles: row.desired_roles,
    locations: row.locations,
    workMode: row.work_mode,
    minSalary: row.min_salary,
    noticePeriod: row.notice_period,
    openToRelocate: row.open_to_relocate,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Supabase implementation of PreferencesRepository.
 * Extends BaseRepository for shared utilities (auth, query helpers).
 */
export class SupabasePreferencesRepository
  extends BaseRepository
  implements PreferencesRepository
{
  private readonly TABLE = "candidate_preferences";

  /**
   * Get the preferences record for the authenticated user.
   * Returns null if no record exists yet.
   */
  async get(): Promise<PreferencesDTO | null> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return data ? mapRowToDTO(data as PreferencesRow) : null;
  }

  /**
   * Upsert (create or update) the preferences record for the authenticated user.
   * Uses the unique constraint on user_id for conflict resolution.
   */
  async upsert(input: UpsertPreferencesInput): Promise<PreferencesDTO> {
    const userId = await this.getCurrentUserId();

    // Check if a record already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (this.client.from(this.TABLE) as any)
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const updateData: PreferencesUpdate = {
        ...(input.desiredRoles !== undefined && { desired_roles: input.desiredRoles }),
        ...(input.locations !== undefined && { locations: input.locations }),
        ...(input.workMode !== undefined && { work_mode: input.workMode }),
        ...(input.minSalary !== undefined && { min_salary: input.minSalary }),
        ...(input.noticePeriod !== undefined && { notice_period: input.noticePeriod }),
        ...(input.openToRelocate !== undefined && { open_to_relocate: input.openToRelocate }),
        updated_at: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (this.client.from(this.TABLE) as any)
        .update(updateData)
        .eq("id", existing.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) {
        throw new AppError(error.message, "SERVER_ERROR", 500);
      }

      if (!data) {
        throw new AppError("Failed to update preferences", "SERVER_ERROR", 500);
      }

      return mapRowToDTO(data as PreferencesRow);
    } else {
      // Insert new record
      const insertData: PreferencesInsert = {
        user_id: userId,
        desired_roles: input.desiredRoles ?? [],
        locations: input.locations ?? [],
        work_mode: input.workMode ?? "remote",
        min_salary: input.minSalary ?? 0,
        notice_period: input.noticePeriod ?? null,
        open_to_relocate: input.openToRelocate ?? false,
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
        throw new AppError("Failed to create preferences", "SERVER_ERROR", 500);
      }

      return mapRowToDTO(data as PreferencesRow);
    }
  }

  /**
   * Delete the preferences record for the authenticated user.
   */
  async delete(): Promise<void> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.client.from(this.TABLE) as any)
      .delete()
      .eq("user_id", userId);

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }
  }
}