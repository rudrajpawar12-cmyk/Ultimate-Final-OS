import type { AuthUser, SignInPayload, SignUpPayload, UserRole } from "@/types/auth";

/**
 * Data source boundary.
 *
 * Every data access in CareerOS goes through a repository interface so the
 * concrete implementation (currently browser-local, later Supabase) can be
 * swapped without touching services, hooks, or UI.
 */
export interface AuthRepository {
  getCurrentUser(): Promise<AuthUser | null>;
  signIn(payload: SignInPayload): Promise<AuthUser>;
  signUp(payload: SignUpPayload): Promise<AuthUser>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  setRole(role: UserRole): Promise<AuthUser>;
}

const STORAGE_KEY = "careeros.session";

function delay(ms = 550) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function read(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function write(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(STORAGE_KEY);
}

function makeUser(email: string, fullName: string): AuthUser {
  return {
    id: crypto.randomUUID(),
    email,
    fullName,
    role: null,
    avatarUrl: null,
    emailVerified: false,
    plan: "free",
  };
}

/**
 * Local repository implementation. Replaced by SupabaseAuthRepository later —
 * the interface above is the contract that will not change.
 */
export const localAuthRepository: AuthRepository = {
  async getCurrentUser() {
    await delay(180);
    return read();
  },
  async signIn({ email }) {
    await delay();
    const existing = read();
    const user =
      existing && existing.email === email
        ? existing
        : { ...makeUser(email, email.split("@")[0] ?? "Member"), emailVerified: true };
    write(user);
    return user;
  },
  async signUp({ email, fullName }) {
    await delay();
    const user = makeUser(email, fullName);
    write(user);
    return user;
  },
  async signOut() {
    await delay(150);
    write(null);
  },
  async requestPasswordReset() {
    await delay();
  },
  async resetPassword() {
    await delay();
  },
  async setRole(role) {
    await delay(300);
    const current = read();
    if (!current) throw new Error("No active session");
    const user = { ...current, role };
    write(user);
    return user;
  },
};
