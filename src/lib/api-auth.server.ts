/**
 * Server-only request authentication for TanStack API routes.
 *
 * The generated `requireSupabaseAuth` middleware only works for server
 * functions. API routes under `src/routes/api/*` receive a raw `Request`, so
 * this helper performs the equivalent bearer-token verification and returns a
 * Supabase client scoped to the caller (RLS applies as that user).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export interface AuthedRequestContext {
  supabase: SupabaseClient<Database>;
  userId: string;
}

function isOpaqueKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isOpaqueKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

/** Error thrown when a request cannot be authenticated. */
export class ApiAuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
  }
}

/**
 * Verifies the `Authorization: Bearer <jwt>` header and returns a user-scoped
 * Supabase client. Throws {@link ApiAuthError} when the caller is anonymous.
 */
export async function authenticateRequest(request: Request): Promise<AuthedRequestContext> {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!supabaseUrl || !publishableKey) {
    throw new ApiAuthError("The backend is not configured.", 500);
  }

  const authHeader = request.headers.get("authorization");
  console.log("========== AUTH DEBUG ==========");
console.log("URL:", request.url);
console.log("Authorization Header:", authHeader);
  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiAuthError("Sign in to use this feature.");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  console.log("Token Length:", token.length);
console.log("JWT Parts:", token.split(".").length);
  if (token.split(".").length !== 3) {
    throw new ApiAuthError("Sign in to use this feature.");
  }

  const supabase = createClient<Database>(supabaseUrl, publishableKey, {
    global: {
      fetch: createSupabaseFetch(publishableKey),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  console.log("Claims Data:", data);
console.log("Claims Error:", error);
console.log("===============================");
  const userId = data?.claims?.sub;
  if (error || !userId) {
    throw new ApiAuthError("Your session has expired. Sign in again.");
  }

  return { supabase, userId: String(userId) };
}
