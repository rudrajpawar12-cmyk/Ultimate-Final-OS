import { useEffect } from "react";
import type { ReactNode } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase/client";

/**
 * Auth state listener provider.
 *
 * Mounts a global Supabase auth state listener that fires callbacks on
 * sign-in, sign-out, token refresh, etc. This is intentionally separate
 * from the session provider so that side-effects (analytics, redirects)
 * can be wired without coupling to session state.
 *
 * Usage:
 *   <SupabaseAuthListener onAuthChange={(event, session) => { ... }}>
 *     {children}
 *   </SupabaseAuthListener>
 */

type AuthChangeHandler = (
  event: AuthChangeEvent,
  session: import("@supabase/supabase-js").Session | null,
) => void;

interface Props {
  children: ReactNode;
  onAuthChange?: AuthChangeHandler;
}

export function SupabaseAuthListener({ children, onAuthChange }: Props) {
  useEffect(() => {
    if (!isSupabaseConfigured || !onAuthChange) return;

    const client = getSupabaseClient();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(onAuthChange);

    return () => {
      subscription.unsubscribe();
    };
  }, [onAuthChange]);

  return <>{children}</>;
}