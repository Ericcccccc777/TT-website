import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function supabasePublicUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
}

function supabasePublicAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
}

export function isSupabaseBrowserConfigured(): boolean {
  const url = supabasePublicUrl();
  const key = supabasePublicAnonKey();
  return url.length > 0 && key.length > 0 && url.startsWith("http");
}

/**
 * Singleton browser client. Only call when `isSupabaseBrowserConfigured()` is true.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      "Supabase URL or anon key is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart the dev server.",
    );
  }
  if (!browserClient) {
    browserClient = createClient(supabasePublicUrl(), supabasePublicAnonKey(), {
      auth: {
        storageKey: "tt-website-supabase",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return browserClient;
}
