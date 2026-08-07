/**
 * Preferences Service.
 *
 * Business logic layer for career preferences operations.
 * Delegates persistence to the PreferencesRepository.
 *
 * UI → Hooks → Service → Repository → Supabase
 */

import type {
  PreferencesDTO,
  PreferencesRepository,
  UpsertPreferencesInput,
} from "@/repositories/supabase-preferences.repository";
import { SupabasePreferencesRepository } from "@/repositories/supabase-preferences.repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

/**
 * Creates a PreferencesService bound to the active repository implementation.
 *
 * The repository is resolved lazily on first use so that importing this module
 * never throws when Supabase is not configured.
 */
export function createPreferencesService(repository?: PreferencesRepository) {
  let resolved: PreferencesRepository | null = repository ?? null;

  const repo = (): PreferencesRepository => {
    if (!resolved) resolved = getDefaultRepository();
    return resolved;
  };

  return {
    /**
     * Get the career preferences for the current user.
     * Returns null if no preferences have been saved yet.
     */
    async getPreferences(): Promise<PreferencesDTO | null> {
      return repo().get();
    },

    /**
     * Save (create or update) career preferences for the current user.
     * Validates required fields before persisting.
     */
    async savePreferences(input: UpsertPreferencesInput): Promise<PreferencesDTO> {
      if (input.minSalary !== undefined && input.minSalary < 0) {
        throw new AppError(
          "Minimum salary cannot be negative",
          "VALIDATION_ERROR",
          422,
        );
      }

      if (input.workMode !== undefined) {
        const validModes = ["remote", "hybrid", "onsite"];
        if (!validModes.includes(input.workMode)) {
          throw new AppError(
            "Work mode must be one of: remote, hybrid, onsite",
            "VALIDATION_ERROR",
            422,
          );
        }
      }

      return repo().upsert({
        desiredRoles: input.desiredRoles,
        locations: input.locations,
        workMode: input.workMode,
        minSalary: input.minSalary,
        noticePeriod: input.noticePeriod,
        openToRelocate: input.openToRelocate,
      });
    },

    /**
     * Delete career preferences for the current user.
     */
    async deletePreferences(): Promise<void> {
      return repo().delete();
    },
  };
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRepository(): PreferencesRepository {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Preferences persistence requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabasePreferencesRepository(client);
}

/** Singleton service instance */
export const preferencesService = createPreferencesService();

export type PreferencesService = ReturnType<typeof createPreferencesService>;