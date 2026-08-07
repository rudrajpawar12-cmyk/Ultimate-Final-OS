import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { authService } from "@/services/auth.service";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase/client";
import type { AuthStatus, AuthUser, SignInPayload, SignUpPayload, UserRole } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  signIn: (payload: SignInPayload) => Promise<AuthUser>;
  signUp: (payload: SignUpPayload) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  selectRole: (role: UserRole) => Promise<AuthUser>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let active = true;

    // Initialize: get current session
    authService
      .getCurrentUser()
      .then((current) => {
        if (!active) return;
        setUser(current);
        setStatus(current ? "authenticated" : "unauthenticated");
      })
      .catch(() => active && setStatus("unauthenticated"));

    // Subscribe to Supabase auth state changes for session recovery,
    // token refresh, and cross-tab sync
    if (!isSupabaseConfigured) {
      return () => { active = false; };
    }

    const client = getSupabaseClient();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      // Map session user to AuthUser on any auth event
      const supabaseUser = session.user;
      const mapped: AuthUser = {
        id: supabaseUser.id,
        email: supabaseUser.email ?? "",
        fullName:
          (supabaseUser.user_metadata?.full_name as string) ??
          (supabaseUser.user_metadata?.fullName as string) ??
          "",
        role: (supabaseUser.user_metadata?.role as UserRole) ?? null,
        avatarUrl: (supabaseUser.user_metadata?.avatar_url as string) ?? null,
        emailVerified: !!supabaseUser.email_confirmed_at,
        plan: (supabaseUser.user_metadata?.plan as "free" | "pro") ?? "free",
      };

      setUser(mapped);
      setStatus("authenticated");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (payload: SignInPayload) => {
    const next = await authService.signIn(payload);
    setUser(next);
    setStatus("authenticated");
    return next;
  }, []);

  const signUp = useCallback(async (payload: SignUpPayload) => {
    const next = await authService.signUp(payload);
    // No email verification gate: the account is usable immediately.
    setUser(next);
    setStatus("authenticated");
    return next;
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const selectRole = useCallback(async (role: UserRole) => {
    const next = await authService.selectRole(role);
    setUser(next);
    return next;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await authService.requestPasswordReset(email);
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    await authService.resetPassword(token, password);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      signIn,
      signUp,
      signOut,
      selectRole,
      requestPasswordReset,
      resetPassword,
      hasRole: (role: UserRole) => user?.role === role,
    }),
    [user, status, signIn, signUp, signOut, selectRole, requestPasswordReset, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
