export type UserRole = "candidate" | "recruiter";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
  plan: "free" | "pro";
}

export interface SignUpPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
