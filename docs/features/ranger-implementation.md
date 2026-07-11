# Ranger — implementation notes

## Route & rendering

- `app/ranger/page.tsx` — locale-free route (NOT under `[locale]`), so it is
  excluded from the next-intl middleware matcher (`middleware.ts`) to avoid a
  `/ranger → /en/ranger` redirect.
- `export const dynamic = "force-dynamic"` (session-dependent, never cached) and
  `metadata.robots = { index: false, follow: false }` (never indexed).

## Auth (admin gate)

- Credential store: **Supabase Auth email+password**. Sessions via
  `@supabase/ssr` cookie client (`lib/ranger/auth.ts::getRangerServerClient`).
- Authorization: `isAuthorizedAdmin(user)` requires ALL of — non-anonymous
  session, **confirmed email** (`email_confirmed_at`), and email on the
  allow-list. The confirmed-email check means admin access does not silently
  depend on the Supabase "Confirm email" project setting.
- Allow-list: `RANGER_ADMIN_EMAILS` (comma-separated, case-insensitive),
  default `poieticstudio777@gmail.com`. Not a secret; the gate is "valid
  confirmed session whose email is on the list".
- Every privileged action (`banAction`, `unbanAction`) **re-verifies**
  `getAdminUser()` before any write — not just the page render.

## Ban model ("hide only")

- Keyed on `leaderboard.user_id` = the stable Supabase auth user id.
- `supabase/migrations/0005_leaderboard_bans.sql`:
  - `leaderboard_bans(user_id PK → auth.users, reason, banned_by, created_at)`,
    RLS enabled with **no** anon/authenticated policy = deny-all (only
    `service_role` reads/writes it).
  - `is_banned(uuid)` `SECURITY DEFINER` (so the public SELECT policy can consult
    the deny-all bans table), `set search_path = ''`.
  - `leaderboard` public SELECT policy → `using (not public.is_banned(user_id))`
    → banned rows invisible to anon AND to the banned user's own session.
  - `get_leaderboard_stats()` excludes banned rows.
  - Also declares the out-of-band `tree` / `region` columns (`if not exists`) so
    the schema rebuilds from migrations alone.
- The row is NOT deleted — the desktop app keeps owning/syncing it; it is only
  filtered from public reads. `banAction`/`unbanAction` (service_role) upsert /
  delete a bans row, then `revalidatePath("/ranger")` + revalidate the public
  ISR surfaces (`/[locale]/leaderboard`, `/[locale]/dashboard`, `/[locale]`) so
  the change shows immediately rather than after the 60s ISR window.

## Env required to activate

- `SUPABASE_SERVICE_ROLE_KEY` — **server-only secret** (never `NEXT_PUBLIC_`,
  never committed). Used by `lib/supabase/admin-client.ts` only.
- Optional `RANGER_ADMIN_EMAILS`.
- Migration `0005` must be applied.

## Security review — accepted / deferred (from the adversarial review)

- **Re-mint bypass (accepted, v1):** the desktop app authenticates anonymously,
  so a full reinstall mints a new `user_id` and evades a `user_id` ban. Catching
  it needs a device fingerprint (desktop-app + privacy-policy change). Documented
  in `ranger.md`.
- **Anon can select `user_id` via a direct PostgREST query (LOW, pre-existing):**
  the base `grant select on leaderboard to anon` (0001/0002) exposes all columns;
  the website itself never returns `user_id`. Hardening (column grants / a view)
  is orthogonal to this feature and left as a follow-up.
- **`is_banned(uuid)` is EXECUTE-granted to anon (LOW):** required for the RLS
  policy; lets a caller probe ban status for a known uuid. Inherent to the design.
- **No session-refresh middleware (LOW):** `/ranger` is excluded from middleware,
  so the admin re-logs in when the access token expires. Acceptable for an
  occasional admin tool.

## Files

`app/ranger/{page,actions}.tsx` · `components/ranger/login-form.tsx` ·
`lib/ranger/{auth,data,types}.ts` · `lib/supabase/admin-client.ts` ·
`supabase/migrations/0005_leaderboard_bans.sql` · `middleware.ts` (matcher).
