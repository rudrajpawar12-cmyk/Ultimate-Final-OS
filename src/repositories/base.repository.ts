/**
 * Base repository — shared database utilities for Supabase repositories.
 *
 * Provides:
 * - Typed query helpers
 * - Error normalization
 * - Pagination support
 * - Common CRUD patterns
 *
 * Concrete repositories extend this base to inherit shared behavior.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { AppError, toAppError } from "@/lib/errors";

/** Pagination parameters */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** Paginated response */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Sort parameters */
export interface SortParams {
  column: string;
  ascending?: boolean;
}

/**
 * Base repository class.
 * Provides shared utilities for all Supabase-backed repositories.
 */
export abstract class BaseRepository {
  protected readonly client: SupabaseClient<Database>;

  /**
   * Explicit user id, used when the repository runs on the server where the
   * Supabase client has no persisted browser session (the caller's identity
   * comes from the verified bearer token instead).
   */
  protected readonly explicitUserId: string | null;

  constructor(client: SupabaseClient<Database>, explicitUserId?: string | null) {
    this.client = client;
    this.explicitUserId = explicitUserId ?? null;
  }

  /**
   * Get the current authenticated user's ID.
   * Throws AUTH_REQUIRED if no session exists.
   */
  protected async getCurrentUserId(): Promise<string> {
    if (this.explicitUserId) return this.explicitUserId;

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user?.id) {
      throw new AppError("Authentication required", "AUTH_REQUIRED", 401);
    }
    return session.user.id;
  }

  /**
   * Execute a Supabase query and normalize the result.
   * Throws an AppError on failure.
   */
  protected async query<T>(
    operation: () => Promise<{ data: T | null; error: { message: string; code?: string; status?: number } | null }>,
  ): Promise<T> {
    try {
      const { data, error } = await operation();

      if (error) {
        throw new AppError(
          error.message,
          error.status === 401
            ? "AUTH_REQUIRED"
            : error.status === 404
              ? "NOT_FOUND"
              : error.status === 409
                ? "CONFLICT"
                : "SERVER_ERROR",
          error.status ?? 500,
        );
      }

      if (data === null) {
        throw new AppError("No data returned", "NOT_FOUND", 404);
      }

      return data;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw toAppError(err);
    }
  }

  /**
   * Execute a paginated query.
   */
  protected async paginatedQuery<T>(
    tableName: string,
    params: PaginationParams = {},
    options?: {
      filters?: Record<string, unknown>;
      sort?: SortParams;
      select?: string;
    },
  ): Promise<PaginatedResult<T>> {
    const { page = 1, pageSize = 20 } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let queryBuilder = this.client
      .from(tableName)
      .select(options?.select ?? "*", { count: "exact" });

    // Apply filters
    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null) {
          queryBuilder = queryBuilder.eq(key, value);
        }
      }
    }

    // Apply sort
    if (options?.sort) {
      queryBuilder = queryBuilder.order(options.sort.column, {
        ascending: options.sort.ascending ?? true,
      });
    }

    // Apply pagination
    queryBuilder = queryBuilder.range(from, to);

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new AppError(error.message, "SERVER_ERROR", 500);
    }

    const total = count ?? 0;

    return {
      data: (data ?? []) as T[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}