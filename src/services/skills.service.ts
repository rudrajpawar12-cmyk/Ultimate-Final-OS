/**
 * Skills Service.
 *
 * Business logic layer for skills CRUD operations.
 * Delegates persistence to the SkillsRepository.
 *
 * UI → Hooks → Service → Repository → Supabase
 */

import type {
  SkillDTO,
  SkillsRepository,
  CreateSkillInput,
  UpdateSkillInput,
} from "@/repositories/supabase-skills.repository";
import { SupabaseSkillsRepository } from "@/repositories/supabase-skills.repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

/**
 * Creates a SkillsService bound to the active repository implementation.
 *
 * The repository is resolved lazily on first use so that importing this module
 * never throws when Supabase is not configured.
 */
export function createSkillsService(repository?: SkillsRepository) {
  let resolved: SkillsRepository | null = repository ?? null;

  const repo = (): SkillsRepository => {
    if (!resolved) resolved = getDefaultRepository();
    return resolved;
  };

  return {
    /**
     * Create a new skill record for the current user.
     * Validates required fields before persisting.
     */
    async createSkill(input: CreateSkillInput): Promise<SkillDTO> {
      if (!input.skillName || input.skillName.trim().length < 1) {
        throw new AppError(
          "Skill name is required",
          "VALIDATION_ERROR",
          422,
        );
      }
      return repo().create({
        skillName: input.skillName.trim(),
        proficiencyLevel: input.proficiencyLevel?.trim() || "intermediate",
        yearsOfExperience: input.yearsOfExperience ?? null,
        category: input.category?.trim() || null,
      });
    },

    /**
     * Get all skill records for the current user.
     */
    async getSkills(): Promise<SkillDTO[]> {
      return repo().getAll();
    },

    /**
     * Get a single skill record by ID.
     */
    async getSkillById(id: string): Promise<SkillDTO | null> {
      return repo().getById(id);
    },

    /**
     * Update a skill record.
     * Only provided fields are updated; others remain unchanged.
     */
    async updateSkill(id: string, input: UpdateSkillInput): Promise<SkillDTO> {
      if (input.skillName !== undefined && input.skillName.trim().length < 1) {
        throw new AppError(
          "Skill name is required",
          "VALIDATION_ERROR",
          422,
        );
      }
      return repo().update(id, {
        ...(input.skillName !== undefined && { skillName: input.skillName.trim() }),
        ...(input.proficiencyLevel !== undefined && {
          proficiencyLevel: input.proficiencyLevel.trim(),
        }),
        ...(input.yearsOfExperience !== undefined && {
          yearsOfExperience: input.yearsOfExperience,
        }),
        ...(input.category !== undefined && { category: input.category?.trim() || null }),
      });
    },

    /**
     * Delete a skill record.
     */
    async deleteSkill(id: string): Promise<void> {
      return repo().delete(id);
    },
  };
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRepository(): SkillsRepository {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Skills persistence requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabaseSkillsRepository(client);
}

/** Singleton service instance */
export const skillsService = createSkillsService();

export type SkillsService = ReturnType<typeof createSkillsService>;