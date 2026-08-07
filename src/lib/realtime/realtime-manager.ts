/**
 * Realtime channel manager.
 *
 * Owns every Supabase Realtime subscription in the app. Subscribers register a
 * listener for a `schema.table` + optional filter; the manager keeps exactly one
 * channel per distinct target and reference-counts listeners so that:
 *
 * - Multiple components/hooks watching the same table share one websocket topic.
 * - Unmounting the last listener removes the channel (no leaks, no zombie topics).
 * - Auth token changes are propagated to the socket so Realtime keeps enforcing
 *   RLS as the signed-in user (rows the user cannot select are never delivered).
 *
 * This module is browser-only: nothing here runs during SSR.
 */

import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimeSubscription {
  /** Table name inside the `public` schema, e.g. `applications`. */
  table: string;
  /** Optional PostgREST-style filter, e.g. `user_id=eq.<uuid>`. */
  filter?: string;
  /** Which change types to listen for. Defaults to `*`. */
  event?: RealtimeEvent;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RealtimeListener = (payload: RealtimePostgresChangesPayload<any>) => void;

interface ManagedChannel {
  channel: RealtimeChannel;
  listeners: Set<RealtimeListener>;
  /** Pending removal timer — lets fast remount/StrictMode reuse the channel. */
  disposeTimer: ReturnType<typeof setTimeout> | null;
}

const CHANNEL_TEARDOWN_DELAY_MS = 1_000;

const channels = new Map<string, ManagedChannel>();

function topicFor({ table, filter, event }: RealtimeSubscription): string {
  return `db:${table}:${event ?? "*"}:${filter ?? "all"}`;
}

function client(): SupabaseClient | null {
  if (typeof window === "undefined" || !isSupabaseConfigured) return null;
  try {
    return getSupabaseClient() as unknown as SupabaseClient;
  } catch {
    return null;
  }
}

/**
 * Subscribe to postgres changes. Returns an unsubscribe function that MUST be
 * called on cleanup (React effect teardown).
 */
export function subscribeToTable(
  subscription: RealtimeSubscription,
  listener: RealtimeListener,
): () => void {
  const supabase = client();
  if (!supabase) return () => {};

  const topic = topicFor(subscription);
  let managed = channels.get(topic);

  if (managed) {
    if (managed.disposeTimer) {
      clearTimeout(managed.disposeTimer);
      managed.disposeTimer = null;
    }
  } else {
    const listeners = new Set<RealtimeListener>();
    const channel = supabase.channel(topic);

    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      {
        event: subscription.event ?? "*",
        schema: "public",
        table: subscription.table,
        ...(subscription.filter ? { filter: subscription.filter } : {}),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: RealtimePostgresChangesPayload<any>) => {
        for (const fn of listeners) {
          try {
            fn(payload);
          } catch (error) {
            console.error("[realtime] listener failed", error);
          }
        }
      },
    );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`[realtime] ${topic} status: ${status}`);
      }
    });

    managed = { channel, listeners, disposeTimer: null };
    channels.set(topic, managed);
  }

  managed.listeners.add(listener);
  const active = managed;

  return () => {
    active.listeners.delete(listener);
    if (active.listeners.size > 0 || active.disposeTimer) return;

    active.disposeTimer = setTimeout(() => {
      if (active.listeners.size > 0) {
        active.disposeTimer = null;
        return;
      }
      channels.delete(topic);
      void supabase.removeChannel(active.channel);
    }, CHANNEL_TEARDOWN_DELAY_MS);
  };
}

/**
 * Push the current access token onto the realtime socket so RLS keeps being
 * evaluated as the signed-in user after login / token refresh.
 */
export function setRealtimeAuth(accessToken: string | null): void {
  const supabase = client();
  if (!supabase) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase.realtime as any).setAuth(accessToken ?? undefined);
  } catch (error) {
    console.warn("[realtime] setAuth failed", error);
  }
}

/** Tear every channel down — used on sign-out so no stale topic survives. */
export function closeAllRealtimeChannels(): void {
  const supabase = client();
  for (const [topic, managed] of channels) {
    if (managed.disposeTimer) clearTimeout(managed.disposeTimer);
    channels.delete(topic);
    if (supabase) void supabase.removeChannel(managed.channel);
  }
}

/** Introspection helper (tests/debugging). */
export function activeRealtimeTopics(): string[] {
  return [...channels.keys()];
}
