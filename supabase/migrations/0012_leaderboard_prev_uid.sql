-- Migration: 0012_leaderboard_prev_uid
-- When a desktop client's anonymous session dies (refresh token revoked by Supabase's
-- reuse detection), it can no longer authenticate as its old user_id — so it re-signs-up
-- as a NEW anonymous user and writes a NEW row. The OLD row is orphaned: RLS lets only
-- its owner update/delete it, and that owner (the dead session) is gone. Result: TWO
-- rows for the same person on the board.
--
-- prev_uid lets the new row point back at the uid it superseded, so the /ranger admin
-- console can PAIR them ("this is the new one; that stale one is safe to delete") and an
-- admin can purge the orphan with the service role. Null on every normal row.
--
-- Idempotent. Assumes 0002 (leaderboard identity) applied.

alter table public.leaderboard
  add column if not exists prev_uid uuid;

-- 0008 revoked the table-wide SELECT and re-granted it column-by-column, so a brand-new
-- column is NOT anon-selectable by default. The desktop client upserts its own row with
-- ON CONFLICT (user_id) DO UPDATE, which requires SELECT on every column in the payload
-- (the exact 42501 trap the bkt_* columns documented). prev_uid is a non-identifying uuid
-- link — safe to expose — so grant anon/authenticated SELECT on it.
grant select (prev_uid) on public.leaderboard to anon, authenticated;

-- Reverse lookup "which row superseded this uid" — the admin console pairs rows by it.
create index if not exists leaderboard_prev_uid_idx
  on public.leaderboard (prev_uid)
  where prev_uid is not null;

-- Nudge PostgREST to reload its schema cache so prev_uid is queryable immediately (matches
-- 0007–0010; without it the first requests can 404 / PGRST204 on the new column).
notify pgrst, 'reload schema';
