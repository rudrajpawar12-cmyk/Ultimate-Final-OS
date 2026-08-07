/**
 * Supabase-backed Profile Completion repository.
 *
 * Implements persistence operations for the profile_completion table.
 * Each record belongs exclusively to the authenticated user (RLS enforced).
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

/** Shape returned from the profile_completion table */
type ProfileCompletionRow = Database["public"]["Tables"]["profile_completion"]["Row"];
type ProfileCompletionInsert = Database["public"]["Tables"]["profile_completion"]["Insert"];
type ProfileCompletionUpdate = Database["public"]["Tables"]["profile_completion"]["Update"];

/** Domain-level profile completion DTO */
export interface ProfileCompletionDTO {
  id: string;
  userId: string;
  percentage: number;
  completedSections: string[];
  incompleteSections: string[];
  missingFields: string[];
  sectionDetails: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating/updating profile completion */
export interface UpsertProfileCompletionInput {
  percentage: number;
  completedSections: string[];
  incompleteSections: string[];
  missingFields: string[];
  sectionDetails: Record<string, unknown>;
}

/**
 * Interface for Profile Completion persistence operations.
 */
export interface ProfileCompletionRepository {
  getByUserId(): Promise<ProfileCompletionDTO | null>;
  upsert(input: UpsertProfileCompletionInput): Promise<ProfileCompletionDTO>;
  delete(): Promise<void>;
}

/**
 * Maps a database row to the domain DTO.
 */
function mapRowToDTO(row: ProfileCompletionRow): ProfileCompletionDTO {
  return {
    id: row.id,
    userId: row.user_id,
    percentage: row.percentage,
    completedSections: row.completed_sections,
    incompleteSections: row.incomplete_sections,
    missingFields: row.missing_fields,
    sectionDetails: row.section_details,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Supabase implementation of ProfileCompletionRepository.
 * Extends BaseRepository for shared utilities (auth, query helpers).
 */
export class SupabaseProfileCompletionRepository
  extends BaseRepository
  implements ProfileCompletionRepository
{
  private readonly TABLE = "profile_completion";

  /**
   * Get the profile completion record for the authenticated user.
   * Returns null if no record exists.
   */
  async getByUserId(): Promise<ProfileCompletionDTO | null> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return data ? mapRowToDTO(data as ProfileCompletionRow) : null;
  }

  /**
   * Create or update the profile completion record for the authenticated user.
   * Uses upsert semantics: creates if not exists, updates if it does.
   */
  async upsert(input: UpsertProfileCompletionInput): Promise<ProfileCompletionDTO> {
    const userId = await this.getCurrentUserId();

    const existing = await this.getByUserId();

    if (existing) {
      // Update existing record
      const updateData: ProfileCompletionUpdate = {
        percentage: input.percentage,
        completed_sections: input.completedSections,
        incomplete_sections: input.incompleteSections,
        missing_fields: input.missingFields,
        section_details: input.sectionDetails,
        updated_at: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (this.client.from(this.TABLE) as any)
        .update(updateData)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) {
        throw new AppError(error.message, "SERVER_ERROR", 500);
      }

      if (!data) {
        throw new AppError("Failed to update profile completion", "SERVER_ERROR", 500);
      }

      return mapRowToDTO(data as ProfileCompletionRow);
    } else {
      // Insert new record
      const insertData: ProfileCompletionInsert = {
        user_id: userId,
        percentage: input.percentage,
        completed_sections: input.completedSections,
        incomplete_sections: input.incompleteSections,
        missing_fields: input.missingFields,
        section_details: input.sectionDetails,
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
        throw new AppError("Failed to create profile completion", "SERVER_ERROR", 500);
      }

      return mapRowToDTO(data as ProfileCompletionRow);
    }
  }

  /**
   * Delete the profile completion record for the authenticated user.
   */
  async delete(): Promise<void> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.client.from(this.TABLE) as any).delete().eq("user_id", userId);

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }
  }
}
