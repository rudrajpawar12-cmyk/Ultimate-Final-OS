import { localAuthRepository, type AuthRepository } from "@/repositories/auth.repository";
import { supabaseAuthRepository } from "@/repositories/supabase-auth.repository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { SignInPayload, SignUpPayload, UserRole } from "@/types/auth";

/**
 * Selects the appropriate repository based on environment configuration.
 * When Supabase is configured, uses the real implementation.
 * Falls back to local mock for development without Supabase.
 */
function getDefaultRepository(): AuthRepository {
  return isSupabaseConfigured ? supabaseAuthRepository : localAuthRepository;
}

/**
 * Service layer: business rules live here, never in components.
 * UI -> Hooks -> Services -> Repository -> Data source.
 */
export function createAuthService(repository: AuthRepository = getDefaultRepository()) {
  return {
    getCurrentUser: () => repository.getCurrentUser(),
    signIn: (payload: SignInPayload) => repository.signIn(payload),
    signUp: (payload: SignUpPayload) => repository.signUp(payload),
    signOut: () => repository.signOut(),
    requestPasswordReset: (email: string) => repository.requestPasswordReset(email),
    resetPassword: (token: string, password: string) => repository.resetPassword(token, password),
    selectRole: (role: UserRole) => repository.setRole(role),
    homePathForRole: (role: UserRole | null) =>
      role === "recruiter" ? "/recruiter" : role === "candidate" ? "/candidate" : "/role-selection",
  };
}

export const authService = createAuthService();
export type AuthService = ReturnType<typeof createAuthService>;
