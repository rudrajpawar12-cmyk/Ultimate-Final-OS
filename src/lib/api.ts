/**
 * Shared API abstraction for CareerOS.
 *
 * Provides a thin wrapper around fetch/Supabase calls with:
 * - Automatic error normalization
 * - Request/response typing
 * - Retry logic for transient failures
 * - Consistent headers and auth token injection
 */

import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import { AppError, toAppError } from "@/lib/errors";

/** Standard API response envelope */
export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiErrorResponse {
  data: null;
  error: AppError;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

/** Options for API requests */
interface RequestOptions {
  /** Number of retry attempts for transient failures. Default: 0 */
  retries?: number;
  /** Timeout in milliseconds. Default: 30000 */
  timeout?: number;
  /** Additional headers */
  headers?: Record<string, string>;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * Execute an async operation and wrap the result in a standardized ApiResult.
 * Use this in repositories to normalize all data access patterns.
 */
export async function apiCall<T>(
  operation: () => Promise<T>,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { retries = 0 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await operation();
      return { data, error: null };
    } catch (err) {
      lastError = err;
      const appError = toAppError(err);

      // Only retry on retryable errors
      if (!appError.isRetryable || attempt >= retries) {
        return { data: null, error: appError };
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
    }
  }

  return { data: null, error: toAppError(lastError) };
}

/**
 * Get the current auth token for API requests.
 * Returns null if Supabase is not configured or no session exists.
 */
export async function getAuthToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const client = getSupabaseClient();
    const {
      data: { session },
    } = await client.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Make an authenticated fetch request.
 * Automatically injects the Supabase auth token if available.
 */
export async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<Response> {
  const { timeout = 30000, headers: extraHeaders, signal } = options;

  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string>) },
      signal: signal ?? controller.signal,
    });

    if (!response.ok) {
      throw new AppError(
        `Request failed: ${response.statusText}`,
        response.status === 401 ? "AUTH_REQUIRED" : "SERVER_ERROR",
        response.status,
      );
    }

    return response;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new AppError("Request timed out", "NETWORK_ERROR", 408);
    }
    throw new AppError("Network request failed", "NETWORK_ERROR", 0);
  } finally {
    clearTimeout(timeoutId);
  }
}