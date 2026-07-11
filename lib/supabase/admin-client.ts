import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client using the SERVICE ROLE key — bypasses RLS.
 *
 * SERVER-ONLY. The service role key must never reach the browser: it is read
 * from SUPABASE_SERVICE_ROLE_KEY (NOT a NEXT_PUBLIC_ var), so importing this in
 * a client component would fail to find the key. Only the /ranger admin server
 * actions and data loaders use it, and only after the caller is verified as an
 * allow-listed admin.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!url || !key) {
    throw new Error(
      "Supabase admin client not configured. Set SUPABASE_SERVICE_ROLE_KEY (server-only) in the environment.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
