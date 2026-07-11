import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Admin auth for the /ranger page. Uses Supabase Auth email+password as the
 * credential store and @supabase/ssr for cookie-based sessions, then gates on a
 * small allow-list so that merely HAVING a Supabase account is not enough —
 * only these emails may act as admins.
 *
 * The allow-list defaults to the project owner and can be overridden/extended
 * via RANGER_ADMIN_EMAILS (comma-separated). It is not a secret; the actual
 * gate is "a valid Supabase session whose email is on this list".
 */
const ADMIN_EMAILS: string[] = (process.env.RANGER_ADMIN_EMAILS ?? "poieticstudio777@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * A request-scoped Supabase client bound to the session cookies. Reads work in
 * both Server Components and Server Actions; cookie WRITES (session refresh,
 * sign-in/out) only take effect inside a Server Action or Route Handler, so the
 * setAll is wrapped defensively — a failed write during a Server Component
 * render is harmless (the session simply isn't refreshed on that render).
 */
export async function getRangerServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — ignore; writes happen in
          // the sign-in/out Server Actions.
        }
      },
    },
  });
}

/**
 * Full admin authorization gate on a Supabase user. Requires ALL of:
 *   • a non-anonymous session (the desktop app signs in anonymously — never admin),
 *   • a CONFIRMED email — so admin status does not silently depend on the
 *     Supabase "Confirm email" project setting being on, and an attacker cannot
 *     claim an allow-listed-but-unregistered address via an unconfirmed signup,
 *   • that email on the allow-list.
 */
export function isAuthorizedAdmin(user: User | null | undefined): boolean {
  return (
    !!user && user.is_anonymous !== true && !!user.email_confirmed_at && isAdminEmail(user.email)
  );
}

/**
 * Returns the current admin user, or null. getUser() re-validates the token
 * against Supabase on every call, so a forged/expired cookie yields null.
 */
export async function getAdminUser(): Promise<User | null> {
  const supabase = await getRangerServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAuthorizedAdmin(user) ? user : null;
}
