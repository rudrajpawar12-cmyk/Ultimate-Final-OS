/**
 * Company Service.
 *
 * Business logic layer for company CRUD operations.
 * Delegates persistence to the CompanyRepository.
 *
 * UI → Hooks → Service → Repository → Supabase
 */

import type {
  CompanyDTO,
  CompanyRepository,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "@/repositories/supabase-company.repository";
import { SupabaseCompanyRepository } from "@/repositories/supabase-company.repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

/** Minimum length accepted for a company name */
const MIN_COMPANY_NAME_LENGTH = 2;

/**
 * Validates a required identifier argument.
 */
function assertId(id: string, label: string): void {
  if (!id || id.trim().length === 0) {
    throw new AppError(`${label} is required`, "VALIDATION_ERROR", 422);
  }
}

/**
 * Validates a company name value.
 */
function assertCompanyName(companyName: string | undefined): void {
  if (!companyName || companyName.trim().length < MIN_COMPANY_NAME_LENGTH) {
    throw new AppError(
      `Company name must be at least ${MIN_COMPANY_NAME_LENGTH} characters`,
      "VALIDATION_ERROR",
      422,
    );
  }
}

/**
 * Validates an optional email value.
 * Empty values are allowed; malformed values are rejected.
 */
function assertEmail(email: string | null | undefined): void {
  const value = email?.trim();
  if (!value) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new AppError("Email must be a valid email address", "VALIDATION_ERROR", 422);
  }
}

/**
 * Validates an optional website value.
 * Empty values are allowed; malformed URLs are rejected.
 */
function assertWebsite(website: string | null | undefined): void {
  const value = website?.trim();
  if (!value) return;
  if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(value)) {
    throw new AppError(
      "Website must be a valid URL starting with http:// or https://",
      "VALIDATION_ERROR",
      422,
    );
  }
}

/**
 * Normalizes an optional free-text field to a trimmed value or null.
 */
function normalize(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

/**
 * Creates a CompanyService bound to the active repository implementation.
 *
 * The repository is resolved lazily on first use so that importing this module
 * never throws when Supabase is not configured.
 */
export function createCompanyService(repository?: CompanyRepository) {
  let resolved: CompanyRepository | null = repository ?? null;

  const repo = (): CompanyRepository => {
    if (!resolved) resolved = getDefaultRepository();
    return resolved;
  };

  return {
    /**
     * Create a new company record for the given recruiter.
     * Validates required fields and normalizes optional fields before persisting.
     */
    async createCompany(input: CreateCompanyInput): Promise<CompanyDTO> {
      assertId(input.recruiterId, "Recruiter ID");
      assertCompanyName(input.companyName);
      assertEmail(input.email);
      assertWebsite(input.website);

      return repo().create({
        recruiterId: input.recruiterId.trim(),
        companyName: input.companyName.trim(),
        legalName: normalize(input.legalName),
        companySize: normalize(input.companySize),
        industry: normalize(input.industry),
        website: normalize(input.website),
        email: normalize(input.email)?.toLowerCase() ?? null,
        phone: normalize(input.phone),
        address: normalize(input.address),
        city: normalize(input.city),
        state: normalize(input.state),
        country: normalize(input.country),
        postalCode: normalize(input.postalCode),
        logoUrl: normalize(input.logoUrl),
        description: normalize(input.description),
      });
    },

    /**
     * Get a single company by ID.
     * Returns null when no accessible record exists.
     */
    async getCompany(id: string): Promise<CompanyDTO | null> {
      assertId(id, "Company ID");
      return repo().getById(id);
    },

    /**
     * Get a company by the owning recruiter's profile ID.
     * Returns null when no company exists for the given recruiter.
     */
    async getCompanyByRecruiterId(recruiterId: string): Promise<CompanyDTO | null> {
      assertId(recruiterId, "Recruiter ID");
      return repo().getByRecruiterId(recruiterId);
    },

    /**
     * Update a company record.
     * Only provided fields are updated; others remain unchanged.
     */
    async updateCompany(id: string, input: UpdateCompanyInput): Promise<CompanyDTO> {
      assertId(id, "Company ID");

      if (input.companyName !== undefined) {
        assertCompanyName(input.companyName);
      }
      if (input.email !== undefined) {
        assertEmail(input.email);
      }
      if (input.website !== undefined) {
        assertWebsite(input.website);
      }

      const payload: UpdateCompanyInput = {
        ...(input.companyName !== undefined && { companyName: input.companyName.trim() }),
        ...(input.legalName !== undefined && { legalName: normalize(input.legalName) }),
        ...(input.companySize !== undefined && { companySize: normalize(input.companySize) }),
        ...(input.industry !== undefined && { industry: normalize(input.industry) }),
        ...(input.website !== undefined && { website: normalize(input.website) }),
        ...(input.email !== undefined && {
          email: normalize(input.email)?.toLowerCase() ?? null,
        }),
        ...(input.phone !== undefined && { phone: normalize(input.phone) }),
        ...(input.address !== undefined && { address: normalize(input.address) }),
        ...(input.city !== undefined && { city: normalize(input.city) }),
        ...(input.state !== undefined && { state: normalize(input.state) }),
        ...(input.country !== undefined && { country: normalize(input.country) }),
        ...(input.postalCode !== undefined && { postalCode: normalize(input.postalCode) }),
        ...(input.logoUrl !== undefined && { logoUrl: normalize(input.logoUrl) }),
        ...(input.description !== undefined && { description: normalize(input.description) }),
      };

      if (Object.keys(payload).length === 0) {
        throw new AppError("No fields provided to update", "VALIDATION_ERROR", 422);
      }

      return repo().update(id, payload);
    },

    /**
     * Delete a company record.
     */
    async deleteCompany(id: string): Promise<void> {
      assertId(id, "Company ID");
      return repo().delete(id);
    },
  };
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRepository(): CompanyRepository {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Company persistence requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabaseCompanyRepository(client);
}

/** Singleton service instance */
export const companyService = createCompanyService();

export type CompanyService = ReturnType<typeof createCompanyService>;