/**
 * Supabase-backed Skills repository.
 *
 * Implements CRUD operations for the skills table.
 * Each skill record belongs exclusively to the authenticated user (RLS enforced).
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

/** Shape returned from the skills table */
type SkillRow = Database["public"]["Tables"]["skills"]["Row"];
type SkillInsert = Database["public"]["Tables"]["skills"]["Insert"];
type SkillUpdate = Database["public"]["Tables"]["skills"]["Update"];

/** Domain-level skill DTO */
export interface SkillDTO {
  id: string;
  userId: string;
  skillName: string;
  proficiencyLevel: string;
  yearsOfExperience: number | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a skill record */
export interface CreateSkillInput {
  skillName: string;
  proficiencyLevel?: string;
  yearsOfExperience?: number | null;
  category?: string | null;
}

/** Input for updating a skill record */
export interface UpdateSkillInput {
  skillName?: string;
  proficiencyLevel?: string;
  yearsOfExperience?: number | null;
  category?: string | null;
}

/**
 * Interface for Skills persistence operations.
 */
export interface SkillsRepository {
  create(input: CreateSkillInput): Promise<SkillDTO>;
  getAll(): Promise<SkillDTO[]>;
  getById(id: string): Promise<SkillDTO | null>;
  update(id: string, input: UpdateSkillInput): Promise<SkillDTO>;
  delete(id: string): Promise<void>;
}

/**
 * Maps a database row to the domain DTO.
 */
function mapRowToDTO(row: SkillRow): SkillDTO {
  return {
    id: row.id,
    userId: row.user_id,
    skillName: row.skill_name,
    proficiencyLevel: row.proficiency_level,
    yearsOfExperience: row.years_of_experience,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Supabase implementation of SkillsRepository.
 * Extends BaseRepository for shared utilities (auth, query helpers).
 */
export class SupabaseSkillsRepository
  extends BaseRepository
  implements SkillsRepository
{
  private readonly TABLE = "skills";

  /**
   * Create a new skill record for the authenticated user.
   */
  async create(input: CreateSkillInput): Promise<SkillDTO> {
    const userId = await this.getCurrentUserId();

    const insertData: SkillInsert = {
      user_id: userId,
      skill_name: input.skillName,
      proficiency_level: input.proficiencyLevel ?? "intermediate",
      years_of_experience: input.yearsOfExperience ?? null,
      category: input.category ?? null,
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
      throw new AppError("Failed to create skill record", "SERVER_ERROR", 500);
    }

    return mapRowToDTO(data as SkillRow);
  }

  /**
   * Get all skill records for the authenticated user.
   * Returns empty array if none exist.
   */
  async getAll(): Promise<SkillDTO[]> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return (data ?? []).map((row: SkillRow) => mapRowToDTO(row));
  }

  /**
   * Get a single skill record by ID for the authenticated user.
   * Returns null if not found.
   */
  async getById(id: string): Promise<SkillDTO | null> {
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

    return data ? mapRowToDTO(data as SkillRow) : null;
  }

  /**
   * Update a skill record for the authenticated user.
   * Throws NOT_FOUND if no record exists with the given ID.
   */
  async update(id: string, input: UpdateSkillInput): Promise<SkillDTO> {
    const userId = await this.getCurrentUserId();

    const updateData: SkillUpdate = {
      ...(input.skillName !== undefined && { skill_name: input.skillName }),
      ...(input.proficiencyLevel !== undefined && { proficiency_level: input.proficiencyLevel }),
      ...(input.yearsOfExperience !== undefined && { years_of_experience: input.yearsOfExperience }),
      ...(input.category !== undefined && { category: input.category }),
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
      throw new AppError("Skill record not found", "NOT_FOUND", 404);
    }

    return mapRowToDTO(data as SkillRow);
  }

  /**
   * Delete a skill record for the authenticated user.
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