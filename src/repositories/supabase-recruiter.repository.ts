/**
 * Supabase-backed Recruiter Profile repository.
 *
 * Implements CRUD operations for the recruiters table.
 * Each profile belongs exclusively to the authenticated user (RLS enforced).
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

/** Shape returned from the recruiters table */
type RecruiterRow = Database["public"]["Tables"]["recruiters"]["Row"];
type RecruiterInsert = Database["public"]["Tables"]["recruiters"]["Insert"];
type RecruiterUpdate = Database["public"]["Tables"]["recruiters"]["Update"];

/** Domain-level recruiter profile DTO */
export interface RecruiterProfileDTO {
  id: string;
  userId: string;
  fullName: string;
  jobTitle: string;
  department: string | null;
  workEmail: string | null;
  phone: string | null;
  companyName: string | null;
  companyLogoUrl: string | null;
  companyWebsite: string | null;
  companyIndustry: string | null;
  companySize: string | null;
  companyHeadquarters: string | null;
  hiringRoles: string[];
  hiringLocations: string[];
  workModes: string[];
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a recruiter profile */
export interface CreateRecruiterProfileInput {
  fullName: string;
  jobTitle: string;
  department?: string | null;
  workEmail?: string | null;
  phone?: string | null;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  companyWebsite?: string | null;
  companyIndustry?: string | null;
  companySize?: string | null;
  companyHeadquarters?: string | null;
  hiringRoles?: string[];
  hiringLocations?: string[];
  workModes?: string[];
}

/** Input for updating a recruiter profile */
export interface UpdateRecruiterProfileInput {
  fullName?: string;
  jobTitle?: string;
  department?: string | null;
  workEmail?: string | null;
  phone?: string | null;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  companyWebsite?: string | null;
  companyIndustry?: string | null;
  companySize?: string | null;
  companyHeadquarters?: string | null;
  hiringRoles?: string[];
  hiringLocations?: string[];
  workModes?: string[];
}

/**
 * Interface for Recruiter Profile persistence operations.
 */
export interface RecruiterProfileRepository {
  create(input: CreateRecruiterProfileInput): Promise<RecruiterProfileDTO>;
  getByUserId(): Promise<RecruiterProfileDTO | null>;
  update(input: UpdateRecruiterProfileInput): Promise<RecruiterProfileDTO>;
  delete(): Promise<void>;
}

/**
 * Maps a database row to the domain DTO.
 */
function mapRowToDTO(row: RecruiterRow): RecruiterProfileDTO {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    jobTitle: row.job_title,
    department: row.department,
    workEmail: row.work_email,
    phone: row.phone,
    companyName: row.company_name,
    companyLogoUrl: row.company_logo_url,
    companyWebsite: row.company_website,
    companyIndustry: row.company_industry,
    companySize: row.company_size,
    companyHeadquarters: row.company_headquarters,
    hiringRoles: row.hiring_roles,
    hiringLocations: row.hiring_locations,
    workModes: row.work_modes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Supabase implementation of RecruiterProfileRepository.
 * Extends BaseRepository for shared utilities (auth, query helpers).
 */
export class SupabaseRecruiterRepository
  extends BaseRepository
  implements RecruiterProfileRepository
{
  private readonly TABLE = "recruiters";

  /**
   * Create a new recruiter profile for the authenticated user.
   * Throws CONFLICT if a profile already exists.
   */
  async create(input: CreateRecruiterProfileInput): Promise<RecruiterProfileDTO> {
    const userId = await this.getCurrentUserId();

    // Check if profile already exists
    const existing = await this.getByUserId();
    if (existing) {
      throw new AppError(
        "Recruiter profile already exists for this user",
        "CONFLICT",
        409,
      );
    }

    const insertData: RecruiterInsert = {
      user_id: userId,
      full_name: input.fullName,
      job_title: input.jobTitle,
      department: input.department ?? null,
      work_email: input.workEmail ?? null,
      phone: input.phone ?? null,
      company_name: input.companyName ?? null,
      company_logo_url: input.companyLogoUrl ?? null,
      company_website: input.companyWebsite ?? null,
      company_industry: input.companyIndustry ?? null,
      company_size: input.companySize ?? null,
      company_headquarters: input.companyHeadquarters ?? null,
      hiring_roles: input.hiringRoles ?? [],
      hiring_locations: input.hiringLocations ?? [],
      work_modes: input.workModes ?? [],
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
      throw new AppError("Failed to create recruiter profile", "SERVER_ERROR", 500);
    }

    return mapRowToDTO(data as RecruiterRow);
  }

  /**
   * Get the recruiter profile for the authenticated user.
   * Returns null if no profile exists.
   */
  async getByUserId(): Promise<RecruiterProfileDTO | null> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return data ? mapRowToDTO(data as RecruiterRow) : null;
  }

  /**
   * Update the recruiter profile for the authenticated user.
   * Throws NOT_FOUND if no profile exists.
   */
  async update(input: UpdateRecruiterProfileInput): Promise<RecruiterProfileDTO> {
    const userId = await this.getCurrentUserId();

    const updateData: RecruiterUpdate = {
      ...(input.fullName !== undefined && { full_name: input.fullName }),
      ...(input.jobTitle !== undefined && { job_title: input.jobTitle }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.workEmail !== undefined && { work_email: input.workEmail }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.companyName !== undefined && { company_name: input.companyName }),
      ...(input.companyLogoUrl !== undefined && { company_logo_url: input.companyLogoUrl }),
      ...(input.companyWebsite !== undefined && { company_website: input.companyWebsite }),
      ...(input.companyIndustry !== undefined && { company_industry: input.companyIndustry }),
      ...(input.companySize !== undefined && { company_size: input.companySize }),
      ...(input.companyHeadquarters !== undefined && { company_headquarters: input.companyHeadquarters }),
      ...(input.hiringRoles !== undefined && { hiring_roles: input.hiringRoles }),
      ...(input.hiringLocations !== undefined && { hiring_locations: input.hiringLocations }),
      ...(input.workModes !== undefined && { work_modes: input.workModes }),
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
      throw new AppError("Recruiter profile not found", "NOT_FOUND", 404);
    }

    return mapRowToDTO(data as RecruiterRow);
  }

  /**
   * Delete the recruiter profile for the authenticated user.
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