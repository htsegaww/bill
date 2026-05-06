import { createClient } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Server-only admin client using the service role key.
 * Bypasses RLS — never expose this to the client.
 * Only use for operations that are already user-scoped (e.g. membership lookup by user_id).
 */
export function createAdminSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
