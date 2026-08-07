/**
 * Structured error handling layer for CareerOS.
 *
 * Provides typed application errors that flow cleanly through the
 * Repository → Service → Hook → UI pipeline.
 */

/** Error codes used across the application */
export type AppErrorCode =
  | "NETWORK_ERROR"
  | "AUTH_REQUIRED"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_SESSION_EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "UNKNOWN";

/**
 * Base application error.
 * All errors thrown by repositories and services extend this.
 */
export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: AppErrorCode = "UNKNOWN",
    statusCode = 500,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  /** Whether this error should trigger a sign-out / redirect to login */
  get isAuthError(): boolean {
    return this.code === "AUTH_REQUIRED" || this.code === "AUTH_SESSION_EXPIRED";
  }

  /** Whether this error is retryable */
  get isRetryable(): boolean {
    return this.code === "NETWORK_ERROR" || this.code === "RATE_LIMITED" || this.code === "SERVER_ERROR";
  }
}

/** Map HTTP status codes to AppErrorCode */
export function httpStatusToCode(status: number): AppErrorCode {
  switch (status) {
    case 401:
      return "AUTH_REQUIRED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "VALIDATION_ERROR";
    case 429:
      return "RATE_LIMITED";
    default:
      return status >= 500 ? "SERVER_ERROR" : "UNKNOWN";
  }
}

/**
 * Normalize any thrown value into an AppError.
 * Use at repository/service boundaries to ensure consistent error types.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Error) {
    // Handle Supabase errors which have a `status` property
    const status = (error as { status?: number }).status;
    if (status) {
      return new AppError(error.message, httpStatusToCode(status), status);
    }
    return new AppError(error.message, "UNKNOWN", 500);
  }

  if (typeof error === "string") {
    return new AppError(error, "UNKNOWN", 500);
  }

  return new AppError("An unexpected error occurred", "UNKNOWN", 500);
}

/**
 * User-friendly error messages for display in the UI.
 */
export function getUserMessage(error: AppError): string {
  switch (error.code) {
    case "NETWORK_ERROR":
      return "Unable to connect. Please check your internet connection and try again.";
    case "AUTH_REQUIRED":
      return "Please sign in to continue.";
    case "AUTH_INVALID_CREDENTIALS":
      return "Invalid email or password.";
    case "AUTH_SESSION_EXPIRED":
      return "Your session has expired. Please sign in again.";
    case "FORBIDDEN":
      return "You don't have permission to perform this action.";
    case "NOT_FOUND":
      return "The requested resource was not found.";
    case "VALIDATION_ERROR":
      return error.message || "Please check your input and try again.";
    case "CONFLICT":
      return "This action conflicts with existing data.";
    case "RATE_LIMITED":
      return "Too many requests. Please wait a moment and try again.";
    case "SERVER_ERROR":
      return "Something went wrong on our end. Please try again later.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}