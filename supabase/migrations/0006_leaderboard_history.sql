-- Migration: 0006_leaderboard_history
-- Records a user's score over time so the /ranger admin console can show a
-- per-user history and judge whether a jump looks like cheating before deciding
-- to hide them.
--
-- Why a trigger (not the desktop app): the leaderboard keeps only ONE row per
-- user (UNIQUE user_id, upserted), so every sync overwrites the previous score
-- and no history survives. A trigger on the leaderboard table snapshots each
-- score change into an append-only log. This works with the CURRENT desktop
-- clients (they upsert the row directly) — it does NOT depend on any anti-cheat
-- gate being deployed. When the score-validation gate lands later, it can enrich
-- these rows (flagged / reason) — the columns are already here.
--
-- Design (mirrors 0005_leaderboard_bans):
--   • leaderboard_history is append-only, RLS-enabled with NO anon/authenticated
--     policy = deny all. Only the service_role (server-side /ranger) can read it.
--   • The capture trigger function is SECURITY DEFINER so it can insert into that
--     locked-down table even though the triggering writer is the anon desktop user
--     (who has no privileges on leaderboard_history).
--   • Not FK-constrained to auth.users on purpose: it is a forensic log that
--     should survive even if the user row is later deleted.
--
-- Idempotent: create-if-not-exists + create-or-replace + drop-before-create.
-- Assumes 0001–0005 applied.

-- ── 1. History table (append-only) ────────────────────────────────────────────
create table if not exists public.leaderboard_history (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null,
  old_score  bigint,                        -- null on the first (insert) snapshot
  new_score  bigint      not null,
  delta      bigint      not null,          -- new_score - coalesce(old_score, 0)
  flagged    boolean     not null default false,  -- forward-compat: set by the future score-validation gate
  reason     text,                          -- 'insert' | 'update' | 'backfill' (+ gate reasons later)
  at         timestamptz not null default now()
);

create index if not exists leaderboard_history_user_at
  on public.leaderboard_history (user_id, at desc);

alter table public.leaderboard_history enable row level security;
-- No anon/authenticated policy on purpose: RLS-enabled + no policy = deny all.
-- service_role (server-side /ranger only) bypasses RLS but still needs the
-- table-level grant because "Automatically expose new tables" is OFF (see 0001).
grant select on public.leaderboard_history to service_role;

-- ── 2. Capture trigger — snapshots every score change ─────────────────────────
-- SECURITY DEFINER (owner = postgres) so the anon desktop writer, which has no
-- privilege on leaderboard_history, can still cause a row to be logged.
create or replace function public.capture_leaderboard_history()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.leaderboard_history (user_id, old_score, new_score, delta, reason)
    values (new.user_id, null, new.score, new.score, 'insert');
  elsif tg_op = 'UPDATE' and new.score is distinct from old.score then
    insert into public.leaderboard_history (user_id, old_score, new_score, delta, reason)
    values (new.user_id, old.score, new.score, new.score - old.score, 'update');
  end if;
  return null;  -- AFTER trigger: return value is ignored
end;
$$;

-- `of score` limits the UPDATE firing to statements that actually SET score
-- (metadata-only updates like a rename don't fire); the function double-checks
-- the value truly changed. INSERT fires for every new row.
drop trigger if exists leaderboard_capture_history on public.leaderboard;
create trigger leaderboard_capture_history
  after insert or update of score on public.leaderboard
  for each row execute function public.capture_leaderboard_history();

-- ── 3. Backfill one baseline snapshot per existing user ───────────────────────
-- Existing rows predate the trigger, so seed a single 'backfill' snapshot (using
-- the row's own updated_at, no clock call needed) so the admin sees at least the
-- current value immediately. NOT EXISTS guard makes re-running safe.
insert into public.leaderboard_history (user_id, old_score, new_score, delta, reason, at)
select l.user_id, null, l.score, l.score, 'backfill', l.updated_at
from public.leaderboard l
where not exists (
  select 1 from public.leaderboard_history h where h.user_id = l.user_id
);
