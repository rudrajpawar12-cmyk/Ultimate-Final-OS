import type { AuthUser, SignInPayload, SignUpPayload, UserRole } from "@/types/auth";
import type { AuthRepository } from "@/repositories/auth.repository";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AppError } from "@/lib/errors";
import type { AppErrorCode } from "@/lib/errors";

/**
 * Maps a Supabase user + session to the app's AuthUser type.
 */
function mapSupabaseUser(
  user: { id: string; email?: string; user_metadata?: Record<string, unknown>; email_confirmed_at?: string | null },
): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: (user.user_metadata?.full_name as string) ?? (user.user_metadata?.fullName as string) ?? "",
    role: (user.user_metadata?.role as UserRole) ?? null,
    avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
    emailVerified: !!user.email_confirmed_at,
    plan: (user.user_metadata?.plan as "free" | "pro") ?? "free",
  };
}

/**
 * Supabase-backed implementation of AuthRepository.
 * Follows the same interface contract as localAuthRepository.
 */
export const supabaseAuthRepository: AuthRepository = {
  async getCurrentUser() {
    const client = getSupabaseClient();
    const { data: { session }, error } = await client.auth.getSession();

    if (error || !session?.user) return null;
    return mapSupabaseUser(session.user);
  },

  async signIn(payload: SignInPayload) {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });

    if (error) {
      const mapped = mapAuthError(error.message);
      throw new AppError(mapped.message, mapped.code, mapped.statusCode);
    }

    if (!data.user) {
      throw new AppError("Sign in failed. Please try again.", "UNKNOWN", 500);
    }

    return mapSupabaseUser(data.user);
  },

async signUp(payload: SignUpPayload) {
  const client = getSupabaseClient();

  const { data, error } = await client.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName,
        fullName: payload.fullName,
      },
    },
  });

  console.log("SIGNUP DATA:", data);
console.log("SIGNUP USER:", data.user);
console.log("SIGNUP SESSION:", data.session);
console.log("SIGNUP ERROR:", error);

  if (error) throw error;

  return mapSupabaseUser(data.user!);
},
  async signOut() {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) {
      throw new AppError("Sign out failed. Please try again.", "UNKNOWN", 500);
    }
  },

  async requestPasswordReset(email: string) {
    const client = getSupabaseClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      const mapped = mapAuthError(error.message);
      throw new AppError(mapped.message, mapped.code, mapped.statusCode);
    }
  },

  async resetPassword(_token: string, password: string) {
    const client = getSupabaseClient();
    // Supabase handles the token via the URL fragment automatically
    // when detectSessionInUrl is true. We just need to update the password.
    const { error } = await client.auth.updateUser({ password });

    if (error) {
      const mapped = mapAuthError(error.message);
      throw new AppError(mapped.message, mapped.code, mapped.statusCode);
    }
  },

  async setRole(role: UserRole) {
  const client = getSupabaseClient();

  console.log("Updating role:", role);

  // 👇 ADD THESE LINES
  const {
    data: { session },
  } = await client.auth.getSession();

  console.log("CURRENT SESSION:", session);

  // 👇 KEEP THIS AS IT IS
  const { data, error } = await client.auth.updateUser({
    data: { role },
  });

  console.log("updateUser data:", data);
  console.log("updateUser error:", error);

    console.log("updateUser data:", data);
    console.log("updateUser error:", error);

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("No active session");
    }

    console.log("Creating role records...");

    const mappedUser = mapSupabaseUser(data.user);

console.log("MAPPED USER:", mappedUser);

await ensureRoleRecords(data.user.id, mappedUser, role);

    return mapSupabaseUser(data.user);
  }, // <-- Trailing comma after setRole method inside the object
}; // <-- Closing brace and semicolon for supabaseAuthRepository

/**
 * Maps Supabase error messages to user-friendly messages and AppErrorCodes.
 */
function mapAuthError(message: string): { message: string; code: AppErrorCode; statusCode: number } {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return {
      message: "Invalid email or password. Please check your credentials and try again.",
      code: "AUTH_INVALID_CREDENTIALS",
      statusCode: 401,
    };
  }
  if (lower.includes("email not confirmed")) {
    return {
      message: "Please verify your email address before signing in. Check your inbox for the verification link.",
      code: "FORBIDDEN",
      statusCode: 403,
    };
  }
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return {
      message: "An account with this email already exists. Try logging in instead.",
      code: "CONFLICT",
      statusCode: 409,
    };
  }
  if (lower.includes("password") && lower.includes("weak")) {
    return {
      message: "Password is too weak. Use at least 8 characters with a mix of letters and numbers.",
      code: "VALIDATION_ERROR",
      statusCode: 422,
    };
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return {
      message: "Too many attempts. Please wait a moment and try again.",
      code: "RATE_LIMITED",
      statusCode: 429,
    };
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return {
      message: "Network error. Please check your connection and try again.",
      code: "NETWORK_ERROR",
      statusCode: 0,
    };
  }
  if (lower.includes("expired") || lower.includes("invalid otp") || lower.includes("token")) {
    return {
      message: "This link has expired or is invalid. Please request a new one.",
      code: "AUTH_SESSION_EXPIRED",
      statusCode: 401,
    };
  }

  return { message, code: "UNKNOWN", statusCode: 500 };
}

/**
 * Creates the role-specific records a new account needs.
 *
 * Candidate -> candidate_profiles row.
 * Recruiter -> recruiters row + companies row.
 *
 * Idempotent: existing rows are left untouched, so calling it again after a
 * role switch or a re-login never duplicates data. Failures here are logged
 * but never block sign-in — the profile screens can create the row later.
 */
async function ensureRoleRecords(userId: string, user: AuthUser, role: UserRole) {
  console.log("USER RECEIVED IN ensureRoleRecords:", user);
  // The legacy hand-written Database type doesn't describe these tables, so use
  // an untyped view of the client for these inserts.
  const client = getSupabaseClient() as unknown as {
    from: (table: string) => any;
  };
  console.log("USER RECEIVED:", user);

const fullName =
  user.fullName ??
  user.email?.split("@")[0] ??
  "New User";
console.log("COMPUTED FULL NAME:", fullName);
console.log("FULL NAME BEFORE INSERT:", fullName);
  console.log("===== ROLE RECORD DEBUG =====");
console.log("USER:", user);
console.log("FULL NAME:", fullName);
console.log("EMAIL:", user.email);
console.log("=============================");

  try {
    if (role === "candidate") {
      const { data: existing } = await client
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existing) {
        await client.from("candidate_profiles").insert({
          user_id: userId,
          full_name: fullName,
        });
      }
      return;
    }

    const { data: existingRecruiter } = await client
      .from("recruiters")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let recruiterId = existingRecruiter?.id ?? null;

    if (!recruiterId) {
  console.log("INSERTING RECRUITER:", {
    user_id: userId,
    full_name: fullName,
    work_email: user.email,
  });

  const payload = {
  user_id: userId,
  full_name: fullName,
  work_email: user.email,
};

console.log("FULL NAME VARIABLE:", fullName);
console.log("USER OBJECT:", user);
console.log("INSERT PAYLOAD:", payload);

const { data: inserted, error } = await client
  .from("recruiters")
  .insert(payload)
  .select("id")
  .single();

console.log("RECRUITER INSERT RESULT:", inserted);
console.log("RECRUITER INSERT ERROR:", error);

if (error) {
  console.error("FULL INSERT ERROR:", error);
  return;
}

  recruiterId = inserted?.id ?? null;
}

    if (!recruiterId) return;

    const { data: existingCompany } = await client
      .from("companies")
      .select("id")
      .eq("recruiter_id", recruiterId)
      .maybeSingle();

    if (!existingCompany) {
      await client.from("companies").insert({
        recruiter_id: recruiterId,
        company_name: "My company",
      });
    }
  } catch (err) {
    console.error("[CareerOS] Failed to create role records", err);
  }
}