/**
 * Candidate Profile Service.
 *
 * Business logic layer for candidate profile CRUD operations.
 * Delegates persistence to the CandidateProfileRepository.
 *
 * UI → Hooks → Service → Repository → Supabase
 */

import type {
  CandidateProfileDTO,
  CandidateProfileRepository,
  CreateCandidateProfileInput,
  UpdateCandidateProfileInput,
} from "@/repositories/supabase-candidate-profile.repository";
import { SupabaseCandidateProfileRepository } from "@/repositories/supabase-candidate-profile.repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

/**
 * Creates a CandidateProfileService bound to the active repository implementation.
 *
 * The repository is resolved lazily on first use so that importing this module
 * never throws when Supabase is not configured.
 */
export function createCandidateProfileService(
  repository?: CandidateProfileRepository,
) {
  let resolved: CandidateProfileRepository | null = repository ?? null;

  const repo = (): CandidateProfileRepository => {
    if (!resolved) resolved = getDefaultRepository();
    return resolved;
  };

  return {
    /**
     * Create a new candidate profile for the current user.
     * Validates required fields before persisting.
     */
    async createProfile(input: CreateCandidateProfileInput): Promise<CandidateProfileDTO> {
      if (!input.fullName || input.fullName.trim().length < 2) {
        throw new AppError(
          "Full name must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      return repo().create({
        ...input,
        fullName: input.fullName.trim(),
        bio: input.bio?.trim() || null,
        phone: input.phone?.trim() || null,
        location: input.location?.trim() || null,
        profilePhotoUrl: input.profilePhotoUrl?.trim() || null,
      });
    },

    /**
     * Get the current user's candidate profile.
     * Returns null if no profile has been created yet.
     */
    async getProfile(): Promise<CandidateProfileDTO | null> {
      return repo().getByUserId();
    },

    /**
     * Update the current user's candidate profile.
     * Only provided fields are updated; others remain unchanged.
     */
    async updateProfile(input: UpdateCandidateProfileInput): Promise<CandidateProfileDTO> {
      if (input.fullName !== undefined && input.fullName.trim().length < 2) {
        throw new AppError(
          "Full name must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      return repo().update({
        ...(input.fullName !== undefined && { fullName: input.fullName.trim() }),
        ...(input.bio !== undefined && { bio: input.bio?.trim() || null }),
        ...(input.phone !== undefined && { phone: input.phone?.trim() || null }),
        ...(input.location !== undefined && { location: input.location?.trim() || null }),
        ...(input.profilePhotoUrl !== undefined && {
          profilePhotoUrl: input.profilePhotoUrl?.trim() || null,
        }),
      });
    },

    /**
     * Delete the current user's candidate profile.
     */
    async deleteProfile(): Promise<void> {
      return repo().delete();
    },
  };
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRepository(): CandidateProfileRepository {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Candidate profile persistence requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabaseCandidateProfileRepository(client);
}

/** Singleton service instance */
export const candidateProfileService = createCandidateProfileService();

export type CandidateProfileService = ReturnType<typeof createCandidateProfileService>;