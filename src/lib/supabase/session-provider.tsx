import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase/client";

/**
 * Session context — provides the raw Supabase session to the component tree.
 * Separated from AuthProvider so lower-level components can access session
 * metadata without depending on the full auth service layer.
 */

interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  isLoading: true,
  isConfigured: false,
});

export function SupabaseSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const client = getSupabaseClient();

    // Get initial session
    client.auth.getSession().then(({ data: { session: initial } }) => {
      setSession(initial);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, updatedSession) => {
      setSession(updatedSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isLoading,
      isConfigured: isSupabaseConfigured,
    }),
    [session, isLoading],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Access the raw Supabase session from any component.
 */
export function useSupabaseSession() {
  return useContext(SessionContext);
}