-- Migration: 0007_leaderboard_history_reviews
-- Lets an admin ACKNOWLEDGE a specific score-change history row as "reviewed, looks
-- fine" from the /ranger detail page. The analyzer flags rows heuristically; once a
-- row is acknowledged it renders as normal and drops out of the flagged counts.
--
-- Keyed on leaderboard_history.id (a specific change), NOT the user — the admin
-- clears individual entries. Mirrors the 0005/0006 pattern: RLS-enabled with no
-- anon/authenticated policy (deny-all); only the service_role (server-side /ranger)
-- can read/write it.
--
-- Idempotent. Assumes 0006 applied (references leaderboard_history).

create table if not exists public.leaderboard_history_reviews (
  history_id  bigint primary key references public.leaderboard_history(id) on delete cascade,
  reviewed_by text,
  note        text,
  at          timestamptz not null default now()
);

alter table public.leaderboard_history_reviews enable row level security;
-- Deny-all for anon/authenticated (no policy); service_role bypasses RLS but still
-- needs the table grant ("Automatically expose new tables" is OFF — see 0001).
grant select, insert, update, delete on public.leaderboard_history_reviews to service_role;

-- Reload PostgREST's schema cache so the new table is visible immediately
-- (otherwise reads/writes 404 with "Could not find the table … in the schema cache").
notify pgrst, 'reload schema';
