/**
 * Loading state infrastructure for CareerOS.
 *
 * Provides utilities for managing loading states across the application,
 * including granular loading tracking for multiple concurrent operations.
 */

/** Possible loading states */
export type LoadingState = "idle" | "loading" | "success" | "error";

/** Loading state with metadata */
export interface LoadingStatus {
  state: LoadingState;
  message?: string;
  startedAt?: number;
}

/** Initial idle state */
export const IDLE_STATUS: LoadingStatus = { state: "idle" };

/** Create a loading status */
export function loadingStatus(message?: string): LoadingStatus {
  return { state: "loading", message, startedAt: Date.now() };
}

/** Create a success status */
export function successStatus(message?: string): LoadingStatus {
  return { state: "success", message };
}

/** Create an error status */
export function errorStatus(message?: string): LoadingStatus {
  return { state: "error", message };
}

/**
 * Track multiple named loading operations.
 * Useful for pages/components with several independent async operations.
 */
export class LoadingTracker {
  private _operations = new Map<string, LoadingStatus>();
  private _listeners = new Set<() => void>();

  /** Start tracking a named operation */
  start(key: string, message?: string): void {
    this._operations.set(key, loadingStatus(message));
    this._notify();
  }

  /** Mark a named operation as complete */
  complete(key: string, message?: string): void {
    this._operations.set(key, successStatus(message));
    this._notify();
  }

  /** Mark a named operation as failed */
  fail(key: string, message?: string): void {
    this._operations.set(key, errorStatus(message));
    this._notify();
  }

  /** Reset a named operation to idle */
  reset(key: string): void {
    this._operations.set(key, IDLE_STATUS);
    this._notify();
  }

  /** Get the status of a named operation */
  get(key: string): LoadingStatus {
    return this._operations.get(key) ?? IDLE_STATUS;
  }

  /** Whether any operation is currently loading */
  get isAnyLoading(): boolean {
    for (const status of this._operations.values()) {
      if (status.state === "loading") return true;
    }
    return false;
  }

  /** Whether all tracked operations have completed (success or error) */
  get isAllDone(): boolean {
    if (this._operations.size === 0) return true;
    for (const status of this._operations.values()) {
      if (status.state === "loading" || status.state === "idle") return false;
    }
    return true;
  }

  /** Subscribe to state changes */
  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      listener();
    }
  }
}