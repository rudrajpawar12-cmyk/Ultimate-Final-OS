/**
 * Supabase-backed Company repository.
 *
 * Implements CRUD operations for the companies table.
 * Each company record belongs exclusively to a recruiter (RLS enforced).
 *
 * Persistence layer only — no business logic, no validation rules.
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

/** Shapes returned from / accepted by the companies table */
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

/** Domain-level company DTO */
export interface CompanyDTO {
  id: string;
  recruiterId: string;
  companyName: string;
  legalName: string | null;
  companySize: string | null;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  logoUrl: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a company */
export interface CreateCompanyInput {
  recruiterId: string;
  companyName: string;
  legalName?: string | null;
  companySize?: string | null;
  industry?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  logoUrl?: string | null;
  description?: string | null;
}

/** Input for updating a company */
export interface UpdateCompanyInput {
  companyName?: string;
  legalName?: string | null;
  companySize?: string | null;
  industry?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  logoUrl?: string | null;
  description?: string | null;
}

/**
 * Interface for Company persistence operations.
 */
export interface CompanyRepository {
  create(input: CreateCompanyInput): Promise<CompanyDTO>;
  getById(id: string): Promise<CompanyDTO | null>;
  getByRecruiterId(recruiterId: string): Promise<CompanyDTO | null>;
  update(id: string, input: UpdateCompanyInput): Promise<CompanyDTO>;
  delete(id: string): Promise<void>;
}

/**
 * Maps a database row to the domain DTO.
 */
function mapRowToDTO(row: CompanyRow): CompanyDTO {
  return {
    id: row.id,
    recruiterId: row.recruiter_id,
    companyName: row.company_name,
    legalName: row.legal_name,
    companySize: row.company_size,
    industry: row.industry,
    website: row.website,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    postalCode: row.postal_code,
    logoUrl: row.logo_url,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Supabase implementation of CompanyRepository.
 * Extends BaseRepository for shared utilities (auth, query helpers).
 */
export class SupabaseCompanyRepository
  extends BaseRepository
  implements CompanyRepository
{
  private readonly TABLE = "companies";

  /**
   * Create a new company record for the given recruiter.
   */
  async create(input: CreateCompanyInput): Promise<CompanyDTO> {
    await this.getCurrentUserId();

    const insertData: CompanyInsert = {
      recruiter_id: input.recruiterId,
      company_name: input.companyName,
      legal_name: input.legalName ?? null,
      company_size: input.companySize ?? null,
      industry: input.industry ?? null,
      website: input.website ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      country: input.country ?? null,
      postal_code: input.postalCode ?? null,
      logo_url: input.logoUrl ?? null,
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
      throw new AppError("Failed to create company", "SERVER_ERROR", 500);
    }

    return mapRowToDTO(data as CompanyRow);
  }

  /**
   * Get a single company by its identifier.
   * Returns null if no accessible record exists.
   */
  async getById(id: string): Promise<CompanyDTO | null> {
    await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return data ? mapRowToDTO(data as CompanyRow) : null;
  }

  /**
   * Get a company by the owning recruiter's profile ID.
   * Returns null if no company exists for the given recruiter.
   */
  async getByRecruiterId(recruiterId: string): Promise<CompanyDTO | null> {
    await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .select("*")
      .eq("recruiter_id", recruiterId)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    return data ? mapRowToDTO(data as CompanyRow) : null;
  }

  /**
   * Update a company record by its identifier.
   * Throws NOT_FOUND if no accessible record exists.
   */
  async update(id: string, input: UpdateCompanyInput): Promise<CompanyDTO> {
    await this.getCurrentUserId();

    const updateData: CompanyUpdate = {
      ...(input.companyName !== undefined && { company_name: input.companyName }),
      ...(input.legalName !== undefined && { legal_name: input.legalName }),
      ...(input.companySize !== undefined && { company_size: input.companySize }),
      ...(input.industry !== undefined && { industry: input.industry }),
      ...(input.website !== undefined && { website: input.website }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.state !== undefined && { state: input.state }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.postalCode !== undefined && { postal_code: input.postalCode }),
      ...(input.logoUrl !== undefined && { logo_url: input.logoUrl }),
      ...(input.description !== undefined && { description: input.description }),
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.client.from(this.TABLE) as any)
      .update(updateData)
      .eq("id", id)
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
      throw new AppError("Company not found", "NOT_FOUND", 404);
    }

    return mapRowToDTO(data as CompanyRow);
  }

  /**
   * Delete a company record by its identifier.
   */
  async delete(id: string): Promise<void> {
    await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.client.from(this.TABLE) as any)
      .delete()
      .eq("id", id);

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }
  }
}