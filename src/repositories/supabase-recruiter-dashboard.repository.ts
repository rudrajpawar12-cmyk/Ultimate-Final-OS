/**
 * Supabase-backed Recruiter Dashboard repository.
 *
 * Implements read-only data access operations for the Recruiter Dashboard.
 * Aggregates data from recruiters, companies, and related tables to provide
 * dashboard overview, stats, and recent activity.
 *
 * Persistence layer only — no business logic, no validation rules.
 */

import { BaseRepository } from "@/repositories/base.repository";
import { AppError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

/** Shape returned from the recruiters table */
type RecruiterRow = Database["public"]["Tables"]["recruiters"]["Row"];
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

/** Dashboard overview DTO */
export interface DashboardOverviewDTO {
  recruiterId: string;
  fullName: string;
  jobTitle: string;
  companyName: string | null;
  companyIndustry: string | null;
  companySize: string | null;
  hiringRolesCount: number;
  hiringLocationsCount: number;
  workModesCount: number;
  hasCompanyProfile: boolean;
  profileCreatedAt: string;
  profileUpdatedAt: string;
}

/** Recruiter stats DTO */
export interface RecruiterStatsDTO {
  totalHiringRoles: number;
  totalHiringLocations: number;
  totalWorkModes: number;
  hiringRoles: string[];
  hiringLocations: string[];
  workModes: string[];
  profileCompleteness: number;
  daysSinceCreation: number;
  daysSinceLastUpdate: number;
}

/** Recent activity item DTO */
export interface RecentActivityItemDTO {
  id: string;
  type: "profile_created" | "profile_updated" | "company_added" | "company_updated";
  description: string;
  timestamp: string;
}

/** Recent activity DTO */
export interface RecentActivityDTO {
  items: RecentActivityItemDTO[];
  totalCount: number;
}

/**
 * Interface for Recruiter Dashboard read operations.
 */
export interface RecruiterDashboardRepository {
  getDashboardOverview(): Promise<DashboardOverviewDTO | null>;
  getRecruiterStats(): Promise<RecruiterStatsDTO | null>;
  getRecentActivity(): Promise<RecentActivityDTO>;
}

/**
 * Supabase implementation of RecruiterDashboardRepository.
 * Extends BaseRepository for shared utilities (auth, query helpers).
 *
 * All methods are read-only — no mutations are performed.
 */
export class SupabaseRecruiterDashboardRepository
  extends BaseRepository
  implements RecruiterDashboardRepository
{
  private readonly RECRUITERS_TABLE = "recruiters";
  private readonly COMPANIES_TABLE = "companies";

  /**
   * Get the dashboard overview for the authenticated recruiter.
   * Returns null if no recruiter profile exists.
   */
  async getDashboardOverview(): Promise<DashboardOverviewDTO | null> {
    const userId = await this.getCurrentUserId();

    // Fetch recruiter profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recruiter, error: recruiterError } = await (this.client.from(this.RECRUITERS_TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (recruiterError) {
      throw new AppError(recruiterError.message, "SERVER_ERROR", 500);
    }

    if (!recruiter) {
      return null;
    }

    const row = recruiter as RecruiterRow;

    // Check if company profile exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: company, error: companyError } = await (this.client.from(this.COMPANIES_TABLE) as any)
      .select("id")
      .eq("recruiter_id", row.id)
      .maybeSingle();

    if (companyError) {
      throw new AppError(companyError.message, "SERVER_ERROR", 500);
    }

    return {
      recruiterId: row.id,
      fullName: row.full_name,
      jobTitle: row.job_title,
      companyName: row.company_name,
      companyIndustry: row.company_industry,
      companySize: row.company_size,
      hiringRolesCount: row.hiring_roles.length,
      hiringLocationsCount: row.hiring_locations.length,
      workModesCount: row.work_modes.length,
      hasCompanyProfile: !!company,
      profileCreatedAt: row.created_at,
      profileUpdatedAt: row.updated_at,
    };
  }

  /**
   * Get detailed stats for the authenticated recruiter.
   * Returns null if no recruiter profile exists.
   */
  async getRecruiterStats(): Promise<RecruiterStatsDTO | null> {
    const userId = await this.getCurrentUserId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recruiter, error } = await (this.client.from(this.RECRUITERS_TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    if (!recruiter) {
      return null;
    }

    const row = recruiter as RecruiterRow;

    // Calculate profile completeness based on filled fields
    const completenessFields = [
      row.full_name,
      row.job_title,
      row.department,
      row.work_email,
      row.phone,
      row.company_name,
      row.company_website,
      row.company_industry,
      row.company_size,
      row.company_headquarters,
    ];
    const filledFields = completenessFields.filter((field) => field !== null && field !== "").length;
    const profileCompleteness = Math.round((filledFields / completenessFields.length) * 100);

    // Calculate days since creation and last update
    const now = Date.now();
    const createdAt = new Date(row.created_at).getTime();
    const updatedAt = new Date(row.updated_at).getTime();
    const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    const daysSinceLastUpdate = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));

    return {
      totalHiringRoles: row.hiring_roles.length,
      totalHiringLocations: row.hiring_locations.length,
      totalWorkModes: row.work_modes.length,
      hiringRoles: row.hiring_roles,
      hiringLocations: row.hiring_locations,
      workModes: row.work_modes,
      profileCompleteness,
      daysSinceCreation,
      daysSinceLastUpdate,
    };
  }

  /**
   * Get recent activity for the authenticated recruiter.
   * Aggregates timestamps from recruiter profile and company records.
   */
  async getRecentActivity(): Promise<RecentActivityDTO> {
    const userId = await this.getCurrentUserId();

    const items: RecentActivityItemDTO[] = [];

    // Fetch recruiter profile for activity timestamps
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recruiter, error: recruiterError } = await (this.client.from(this.RECRUITERS_TABLE) as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (recruiterError) {
      throw new AppError(recruiterError.message, "SERVER_ERROR", 500);
    }

    if (recruiter) {
      const row = recruiter as RecruiterRow;

      // Profile creation activity
      items.push({
        id: `activity-profile-created-${row.id}`,
        type: "profile_created",
        description: `Recruiter profile created for ${row.full_name}`,
        timestamp: row.created_at,
      });

      // Profile update activity (only if updated after creation)
      if (row.updated_at !== row.created_at) {
        items.push({
          id: `activity-profile-updated-${row.id}`,
          type: "profile_updated",
          description: `Profile updated — ${row.job_title} at ${row.company_name ?? "Unknown Company"}`,
          timestamp: row.updated_at,
        });
      }

      // Fetch company records for activity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: companies, error: companyError } = await (this.client.from(this.COMPANIES_TABLE) as any)
        .select("*")
        .eq("recruiter_id", row.id)
        .order("created_at", { ascending: false });

      if (companyError) {
        throw new AppError(companyError.message, "SERVER_ERROR", 500);
      }

      if (companies && Array.isArray(companies)) {
        for (const company of companies as CompanyRow[]) {
          items.push({
            id: `activity-company-created-${company.id}`,
            type: "company_added",
            description: `Company profile added: ${company.company_name}`,
            timestamp: company.created_at,
          });

          if (company.updated_at !== company.created_at) {
            items.push({
              id: `activity-company-updated-${company.id}`,
              type: "company_updated",
              description: `Company profile updated: ${company.company_name}`,
              timestamp: company.updated_at,
            });
          }
        }
      }
    }

    // Sort by timestamp descending (most recent first)
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      items,
      totalCount: items.length,
    };
  }
}