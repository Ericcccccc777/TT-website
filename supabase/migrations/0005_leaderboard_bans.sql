-- Migration: 0005_leaderboard_bans
-- Anti-cheat: lets an admin (the /ranger page, via the service_role key) hide a
-- cheating user from the PUBLIC leaderboard by their auth user_id. The row is
-- NOT deleted — the desktop app keeps owning/syncing it — it is simply filtered
-- out of every public read (and the global stats), so renaming / changing region
-- does nothing: the ban is keyed on the stable auth.users id.
--
-- Design (matches the chosen "hide only" model):
--   • leaderboard_bans(user_id) holds banned identities.
--   • A SECURITY DEFINER is_banned() bypasses RLS on that table so the public
--     SELECT policy can consult it. (A bare sub-select in the policy would run
--     as the anon role, which cannot read leaderboard_bans, and would therefore
--     hide nobody — hence the definer function.)
--   • The public SELECT policy on leaderboard excludes banned rows.
--   • get_leaderboard_stats() (already SECURITY DEFINER) excludes banned rows.
--   • Only the service_role (used server-side by /ranger) can read/write the
--     bans table — RLS is enabled with NO anon/authenticated policy = deny all.
--
-- Idempotent: guards + drop-before-create throughout. Assumes 0001–0004 applied.

-- ── 1. Bans table ─────────────────────────────────────────────────────────────
create table if not exists public.leaderboard_bans (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  reason     text,
  banned_by  text,
  created_at timestamptz not null default now()
);

alter table public.leaderboard_bans enable row level security;
-- No anon/authenticated policies on purpose: RLS-enabled + no policy denies all
-- non-privileged access. The service_role (server-side /ranger only) bypasses RLS.

-- ── 1b. Capture out-of-band columns the reads depend on ───────────────────────
-- lib/leaderboard.ts (public read) and lib/ranger/data.ts (admin read) both
-- select leaderboard.tree and leaderboard.region. Those columns exist in the
-- live project but were added out-of-band (see 0004's header) — declare them
-- here (IF NOT EXISTS = no-op in prod) so the schema is reproducible from
-- migrations alone (fresh staging / disaster recovery / teammate rebuild).
alter table public.leaderboard
  add column if not exists tree   text,
  add column if not exists region text;

-- ── 2. is_banned() — SECURITY DEFINER so the public policy can see the bans ────
create or replace function public.is_banned(uid uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select exists (select 1 from public.leaderboard_bans b where b.user_id = uid);
$$;

grant execute on function public.is_banned(uuid) to anon, authenticated;

-- ── 3. Public SELECT now hides banned rows ────────────────────────────────────
drop policy if exists "leaderboard_select_public" on public.leaderboard;
create policy "leaderboard_select_public"
  on public.leaderboard
  for select
  to anon, authenticated
  using (not public.is_banned(user_id));

-- ── 4. Global stats exclude banned rows ───────────────────────────────────────
create or replace function public.get_leaderboard_stats()
  returns table(total_trees bigint, total_tokens bigint)
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select
    count(*)::bigint                 as total_trees,
    coalesce(sum(l.score), 0)::bigint as total_tokens
  from public.leaderboard l
  where not public.is_banned(l.user_id);
$$;

grant execute on function public.get_leaderboard_stats() to anon, authenticated;

-- ── 5. Grant service_role the privileges the /ranger admin console needs ───────
-- This project has "Automatically expose new tables" OFF (see 0001's note) and
-- only ever granted anon/authenticated — service_role was never granted, so the
-- admin client (service_role) hits "42501 permission denied". Grant it here:
--   • SELECT on leaderboard so the admin can read the full board (incl. user_id
--     and rows hidden from the public), and
--   • full DML on leaderboard_bans so the admin can hide / unhide users.
-- service_role also bypasses RLS, so these grants are all it needs.
grant select on public.leaderboard to service_role;
grant select, insert, update, delete on public.leaderboard_bans to service_role;
