import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/lib/supabase/types";

/**
 * Supabase client accessor.
 *
 * The actual client is created in `src/integrations/supabase/client.ts`
 * (Cloud-generated). That client knows how to talk to the backend with the
 * current publishable API key format, so we must not construct a second one
 * here — doing so caused 401 Unauthorized responses on /auth/v1/* endpoints
 * and split the persisted session across two storage keys.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "";

/**
 * Whether Supabase is properly configured in the current environment.
 * Services/repositories use this to decide between local and remote implementations.
 */
export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseKey.length > 0;

/**
 * Returns the shared Supabase client instance.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "[CareerOS] Supabase is not configured. Connect Lovable Cloud so VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are available.",
    );
  }

  return supabase as unknown as SupabaseClient<Database>;
}
