-- Migration: 0002_leaderboard_identity
-- Extends the leaderboard table created in 0001:
--   • Binds each row to an auth.users identity (user_id, UNIQUE — one row per user)
--   • Promotes score to bigint (total_tokens can reach ~1e9 across years of usage)
--   • Adds stage_index (0–7, mirrors the 8 growth stages in the desktop app)
--   • Adds updated_at for "last active" display on the leaderboard page
--   • Replaces the permissive 0001 INSERT policy with a user-scoped INSERT + UPDATE
--   • Adds a get_leaderboard_stats() helper function for the global stats banner
--
-- NOTE: Anonymous sign-ins must be enabled in Supabase Dashboard →
--       Authentication → Providers → Anonymous. The desktop app authenticates
--       silently as an anonymous user so it can claim its leaderboard row.
--
-- Run order: this migration assumes 0001_leaderboard.sql has already been applied.
-- Idempotency: column additions use IF NOT EXISTS; policies are dropped before
-- recreation so re-running this file is safe (no duplicate-policy errors).

-- ── 1. Add user_id column ────────────────────────────────────────────────────
alter table public.leaderboard
  add column if not exists user_id uuid
    references auth.users(id) on delete cascade;

-- Back-fill existing rows with a synthetic uuid so the NOT NULL constraint
-- can be applied without violating existing data. In production, rows with
-- synthetic ids will never match a real auth.users entry and will be pruned
-- naturally as real users claim their spots (or via manual cleanup).
update public.leaderboard
  set user_id = gen_random_uuid()
  where user_id is null;

alter table public.leaderboard
  alter column user_id set not null;

-- Add UNIQUE constraint idempotently via index (Postgres allows IF NOT EXISTS).
create unique index if not exists leaderboard_user_id_unique
  on public.leaderboard(user_id);

-- ── 2. Promote score to bigint ───────────────────────────────────────────────
-- integer maxes out at ~2.1 billion; bigint comfortably holds any realistic
-- cumulative token count (Claude Sonnet 4 is ~$3/M tokens; 1e9 tokens ≈ $3 000).
alter table public.leaderboard
  alter column score type bigint using score::bigint;

-- ── 3. Add stage_index ───────────────────────────────────────────────────────
-- Mirrors the 8 growth stages (0 = seedling, 7 = full fruit tree).
-- The desktop app writes the current growth stage when it upserts the row.
alter table public.leaderboard
  add column if not exists stage_index smallint not null default 0;

-- ── 4. Add updated_at ────────────────────────────────────────────────────────
alter table public.leaderboard
  add column if not exists updated_at timestamptz not null default now();

-- Trigger to keep updated_at fresh on every UPDATE (idempotent via replace).
create or replace function public.set_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Drop-then-create is idempotent for triggers.
drop trigger if exists leaderboard_set_updated_at on public.leaderboard;
create trigger leaderboard_set_updated_at
  before update on public.leaderboard
  for each row execute function public.set_updated_at();

-- ── 5. Replace RLS policies ──────────────────────────────────────────────────
-- Drop 0001 policies (names may vary; use IF EXISTS to be safe).
drop policy if exists "Public read access" on public.leaderboard;
drop policy if exists "Authenticated insert"  on public.leaderboard;

-- 5a. Public SELECT — any visitor (anon or authenticated) can read rankings.
create policy "leaderboard_select_public"
  on public.leaderboard
  for select
  to anon, authenticated
  using (true);

-- 5b. Authenticated INSERT — user can only create a row for themselves.
create policy "leaderboard_insert_own"
  on public.leaderboard
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 5c. Authenticated UPDATE — user can only mutate their own row.
create policy "leaderboard_update_own"
  on public.leaderboard
  for update
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 6. Table-level grants (idempotent — GRANT is a no-op if already granted) ─
grant select          on public.leaderboard to anon, authenticated;
grant insert, update  on public.leaderboard to authenticated;

-- ── 7. get_leaderboard_stats() ───────────────────────────────────────────────
-- Returns aggregate stats for the global banner on the leaderboard page.
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS so
-- the aggregate always reflects the full table, including rows the caller
-- cannot see individually (there are none in this schema, but future policies
-- might restrict visibility).
create or replace function public.get_leaderboard_stats()
  returns table(total_trees bigint, total_tokens bigint)
  language sql
  security definer
  stable
as $$
  select
    count(*)::bigint        as total_trees,
    coalesce(sum(score), 0)::bigint as total_tokens
  from public.leaderboard;
$$;

-- Grant execute to anonymous callers so the website can call it via RPC
-- without requiring the visitor to be signed in.
grant execute on function public.get_leaderboard_stats() to anon;
grant execute on function public.get_leaderboard_stats() to authenticated;
