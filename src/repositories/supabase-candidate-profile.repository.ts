/**
 * Supabase-backed Candidate Profile repository.
 *
 * Implements CRUD operations for the candidate_profiles table.
 * Each profile belongs exclusively to the authenticated user (RLS enforced).
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

/** Shape returned from the candidate_profiles table */
type CandidateProfileRow = Database["public"]["Tables"]["candidate_profiles"]["Row"];
type CandidateProfileInsert = Database["public"]["Tables"]["candidate_profiles"]["Insert"];
type CandidateProfileUpdate = Database["public"]["Tables"]["candidate_profiles"]["Update"];

/** Domain-level candidate profile DTO */
export interface CandidateProfileDTO {
  id: string;
  userId: string;
  fullName: string;
  bio: string | null;
  phone: string | null;
  location: string | null;
  profilePhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a candidate profile */
export interface CreateCandidateProfileInput {
  fullName: string;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  profilePhotoUrl?: string | null;
}

/** Input for updating a candidate profile */
export interface UpdateCandidateProfileInput {
  fullName?: string;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  profilePhotoUrl?: string | null;
}

/**
 * Interface for Candidate Profile persistence operations.
 */
export interface CandidateProfileRepository {
  create(input: CreateCandidateProfileInput): Promise<CandidateProfileDTO>;
  getByUserId(): Promise<CandidateProfileDTO | null>;
  update(input: UpdateCandidateProfileInput): Promise<CandidateProfileDTO>;
  delete(): Promise<void>;
}

/**
 * Maps a database row to the domain DTO.
 */
function mapRowToDTO(row: CandidateProfileRow): CandidateProfileDTO {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    bio: row.bio,
    phone: row.phone,
    location: row.location,
    profilePhotoUrl: row.profile_photo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Supabase implementation of CandidateProfileRepository.
 * Extends BaseRepository for shared utilities (auth, query helpers).
 */
export class SupabaseCandidateProfileRepository
  extends BaseRepository
  implements CandidateProfileRepository
{
  private readonly TABLE = "candidate_profiles";

  /**
   * Create a new candidate profile for the authenticated user.
   * Throws CONFLICT if a profile already exists.
   */
  async create(input: CreateCandidateProfileInput): Promise<CandidateProfileDTO> {
    const userId = await this.getCurrentUserId();

    // Check if profile already exists
    const existing = await this.getByUserId();
    if (existing) {
      throw new AppError(
        "Candidate profile already exists for this user",
        "CONFLICT",
        409,
      );
    }

    const insertData: CandidateProfileInsert = {
      user_id: userId,
      full_name: input.fullName,
      bio: input.bio ?? null,
      phone: input.phone ?? null,
      location: input.location ?? null,
      profile_photo_url: input.profilePhotoUrl ?? null,
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
      throw new AppError("Failed to create profile", "SERVER_ERROR", 500);
    }

    return mapRowToDTO(data as CandidateProfileRow);
  }

  /**
   * Get the candidate profile for the authenticated user.
   * Returns null if no profile exists.
   */
  async getByUserId(): Promise<CandidateProfileDTO | null> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return data ? mapRowToDTO(data as CandidateProfileRow) : null;
  }

  /**
   * Update the candidate profile for the authenticated user.
   * Throws NOT_FOUND if no profile exists.
   */
  async update(input: UpdateCandidateProfileInput): Promise<CandidateProfileDTO> {
    const userId = await this.getCurrentUserId();

    const updateData: CandidateProfileUpdate = {
      ...(input.fullName !== undefined && { full_name: input.fullName }),
      ...(input.bio !== undefined && { bio: input.bio }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.profilePhotoUrl !== undefined && { profile_photo_url: input.profilePhotoUrl }),
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .update(updateData)
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
      throw new AppError("Profile not found", "NOT_FOUND", 404);
    }

    return mapRowToDTO(data as CandidateProfileRow);
  }

  /**
   * Delete the candidate profile for the authenticated user.
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