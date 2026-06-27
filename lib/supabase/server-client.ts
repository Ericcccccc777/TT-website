import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a fresh Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Uses the public anon key — RLS policies control access.
 * Call once per request; do NOT cache across requests on the server.
 */
export function getSupabaseServerClient(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  if (!url || !key) {
    throw new Error(
      "Supabase URL or anon key is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
