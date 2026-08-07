/**
 * Realtime → React Query bridge.
 *
 * `useRealtimeSync()` is mounted once (root layout). It watches the tables that
 * back the hiring platform and invalidates the matching query keys so both the
 * recruiter and the candidate side re-render within milliseconds of a change,
 * across tabs and across sessions. Row visibility is enforced by RLS on the
 * database side — a listener only ever receives rows it is allowed to read.
 */

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { candidateKeys } from "@/hooks/use-candidate";
import { hiringKeys } from "@/hooks/use-hiring";
import { platformKeys } from "@/hooks/use-platform";
import { recruiterKeys } from "@/hooks/use-recruiter";
import { configureNotificationSound, playNotificationSound } from "@/lib/notification-sound";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase/client";
import {
  closeAllRealtimeChannels,
  setRealtimeAuth,
  subscribeToTable,
  type RealtimeListener,
  type RealtimeSubscription,
} from "@/lib/realtime/realtime-manager";

/**
 * Subscribe a component to a single table. The listener identity may change on
 * every render — it is held in a ref so the channel is not torn down/rebuilt.
 */
export function useRealtimeTable(
  subscription: RealtimeSubscription | null,
  listener: RealtimeListener,
  enabled = true,
) {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  const table = subscription?.table;
  const filter = subscription?.filter;
  const event = subscription?.event;

  useEffect(() => {
    if (!enabled || !table || !isSupabaseConfigured) return;
    return subscribeToTable(
      { table, ...(filter ? { filter } : {}), ...(event ? { event } : {}) },
      (payload) => listenerRef.current(payload),
    );
  }, [enabled, table, filter, event]);
}

/** Coalesces bursts of realtime events into a single invalidation pass. */
function createInvalidator(queryClient: QueryClient) {
  let pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const registry = new Map<string, readonly unknown[]>();

  return (key: readonly unknown[]) => {
    const id = JSON.stringify(key);
    registry.set(id, key);
    pending.add(id);
    if (timer) return;
    timer = setTimeout(() => {
      const batch = pending;
      pending = new Set();
      timer = null;
      for (const entry of batch) {
        const queryKey = registry.get(entry);
        if (queryKey) void queryClient.invalidateQueries({ queryKey });
      }
    }, 120);
  };
}

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? null;
  const role = user?.role ?? null;

  const invalidate = useMemo(() => createInvalidator(queryClient), [queryClient]);
  const seenNotifications = useRef<Set<string>>(new Set());

  /* Load this account's saved sound preference (single source of truth). */
  useEffect(() => {
    configureNotificationSound(userId);
  }, [userId]);


  /* Keep the realtime socket authenticated so RLS stays correct. */
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    const supabase = getSupabaseClient();

    void supabase.auth.getSession().then(({ data }) => {
      if (active) setRealtimeAuth(data.session?.access_token ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        closeAllRealtimeChannels();
        seenNotifications.current.clear();
        setRealtimeAuth(null);
        return;
      }
      setRealtimeAuth(session?.access_token ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  /* Tear everything down when the provider unmounts. */
  useEffect(() => () => closeAllRealtimeChannels(), []);

  const enabled = isAuthenticated && !!userId && isSupabaseConfigured;

  /* ------------------------------ notifications ----------------------------- */
  useRealtimeTable(
    userId ? { table: "notifications", filter: `user_id=eq.${userId}` } : null,
    (payload) => {
      invalidate(platformKeys.notifications);
      if (payload.eventType !== "INSERT") return;
      const row = payload.new as { id?: string; title?: string; message?: string };
      if (!row?.id || seenNotifications.current.has(row.id)) return;
      seenNotifications.current.add(row.id);
      playNotificationSound();
      toast(row.title ?? "New notification", {
        ...(row.message ? { description: row.message } : {}),
      });
    },
    enabled,
  );

  /* -------------------------------- applications ---------------------------- */
  useRealtimeTable(
    { table: "applications" },
    () => {
      invalidate(candidateKeys.applications());
      invalidate(candidateKeys.dashboard());
      invalidate(candidateKeys.analytics());
      invalidate(hiringKeys.all);
    },
    enabled,
  );

  useRealtimeTable(
    { table: "application_events" },
    () => {
      invalidate(candidateKeys.applications());
      invalidate(hiringKeys.applicants());
    },
    enabled,
  );

  useRealtimeTable(
    { table: "application_notes" },
    () => invalidate(hiringKeys.applicants()),
    enabled && role === "recruiter",
  );

  /* ----------------------------------- jobs --------------------------------- */
  useRealtimeTable(
    { table: "jobs" },
    () => {
      invalidate(candidateKeys.all);
      invalidate(hiringKeys.jobs());
      invalidate(hiringKeys.overview());
      invalidate(hiringKeys.analytics());
    },
    enabled,
  );

  useRealtimeTable(
    userId ? { table: "saved_jobs", filter: `user_id=eq.${userId}` } : null,
    () => {
      invalidate(candidateKeys.all);
    },
    enabled && role === "candidate",
  );

  /* -------------------------------- interviews ------------------------------ */
  useRealtimeTable(
    { table: "interviews" },
    () => {
      invalidate(candidateKeys.interviews());
      invalidate(candidateKeys.dashboard());
      invalidate(hiringKeys.interviews());
      invalidate(hiringKeys.overview());
    },
    enabled,
  );

  /* --------------------------- profiles and resumes ------------------------- */
  useRealtimeTable(
    { table: "candidate_profiles" },
    () => {
      invalidate(candidateKeys.profile());
      invalidate(candidateKeys.dashboard());
      invalidate(hiringKeys.applicants());
    },
    enabled,
  );

  useRealtimeTable(
    userId ? { table: "resumes", filter: `user_id=eq.${userId}` } : null,
    () => {
      invalidate(candidateKeys.resumes());
      invalidate(candidateKeys.dashboard());
    },
    enabled && role === "candidate",
  );

  useRealtimeTable(
    userId ? { table: "recruiters", filter: `user_id=eq.${userId}` } : null,
    () => {
      invalidate(recruiterKeys.profile());
      invalidate(hiringKeys.settings());
    },
    enabled && role === "recruiter",
  );
}

/** Mountable component wrapper so the root layout stays declarative. */
export function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  useRealtimeSync();
  return <>{children}</>;
}
