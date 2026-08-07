/**
 * Recruiter Dashboard Service
 *
 * Business logic layer for recruiter dashboard read operations.
 * Delegates all data access to RecruiterDashboardRepository.
 *
 * UI → Hooks → Service → Repository → Supabase
 */

import type {
  RecruiterDashboardRepository,
  DashboardOverviewDTO,
  RecruiterStatsDTO,
  RecentActivityDTO,
} from "@/repositories/supabase-recruiter-dashboard.repository";
import { SupabaseRecruiterDashboardRepository } from "@/repositories/supabase-recruiter-dashboard.repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

/**
 * Creates a RecruiterDashboardService bound to the given repository implementation.
 *
 * The repository is resolved lazily on first use so that importing this module
 * never throws when Supabase is not configured.
 */
export function createRecruiterDashboardService(
  repository?: RecruiterDashboardRepository,
) {
  let resolved: RecruiterDashboardRepository | null = repository ?? null;

  const repo = (): RecruiterDashboardRepository => {
    if (!resolved) resolved = getDefaultRecruiterDashboardRepository();
    return resolved;
  };

  return {
    /**
     * Get the dashboard overview for the authenticated recruiter.
     * Returns aggregated profile and company information.
     * Throws NOT_FOUND if no recruiter profile exists.
     */
    async getDashboardOverview(): Promise<DashboardOverviewDTO> {
      const overview = await repo().getDashboardOverview();

      if (!overview) {
        throw new AppError(
          "Recruiter profile not found. Please complete onboarding first.",
          "NOT_FOUND",
          404,
        );
      }

      return overview;
    },

    /**
     * Get detailed statistics for the authenticated recruiter.
     * Returns hiring metrics, profile completeness, and activity timelines.
     * Throws NOT_FOUND if no recruiter profile exists.
     */
    async getRecruiterStatistics(): Promise<RecruiterStatsDTO> {
      const stats = await repo().getRecruiterStats();

      if (!stats) {
        throw new AppError(
          "Recruiter profile not found. Please complete onboarding first.",
          "NOT_FOUND",
          404,
        );
      }

      return stats;
    },

    /**
     * Get recent activity for the authenticated recruiter.
     * Returns a chronologically sorted list of profile and company events.
     */
    async getRecentActivity(): Promise<RecentActivityDTO> {
      return repo().getRecentActivity();
    },
  };
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRecruiterDashboardRepository(): RecruiterDashboardRepository {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Recruiter dashboard requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabaseRecruiterDashboardRepository(client);
}

/** Singleton service instance for recruiter dashboard */
export const recruiterDashboardService = createRecruiterDashboardService();
export type RecruiterDashboardService = ReturnType<typeof createRecruiterDashboardService>;