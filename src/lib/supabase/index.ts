/**
 * Supabase module barrel export.
 * Import from "@/lib/supabase" for all Supabase-related utilities.
 */

export { getSupabaseClient, isSupabaseConfigured } from "./client";
export type { Database } from "./types";
export { SupabaseSessionProvider, useSupabaseSession } from "./session-provider";
export { SupabaseAuthListener } from "./auth-provider";