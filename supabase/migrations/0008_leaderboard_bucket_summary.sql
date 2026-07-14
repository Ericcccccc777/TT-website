-- Migration: 0008_leaderboard_bucket_summary
--
-- Anti-cheat, evidence layer. Today a score is just a number the desktop client
-- asserts; the server has no way to ask "how did you earn it?". This adds a small,
-- privacy-preserving answer to that question.
--
-- The client buckets its tokens into 5-minute windows keyed by the CLAUDE CODE
-- LOG'S OWN TIMESTAMPS (when the tokens were actually burned — not when the app
-- noticed, not when the user clicked the bubble) and uploads four aggregates
-- alongside the score:
--
--   bkt_n     how many 5-minute windows this score increase is spread across
--   bkt_max   tokens in the busiest single window
--   bkt_sum   Σ over all windows — must equal the score delta the SERVER computes
--   bkt_span  seconds from the earliest window to the latest
--
-- What this buys:
--   • It kills the false positives. The tree freezes bubble expiry while minimised,
--     so an honest heavy user can hoard a whole workday and bank ~5.5e8 tokens in a
--     single click. Judged as one instantaneous jump that looks like cheating; judged
--     as "96 windows over 8 hours, busiest 2e7" it obviously isn't.
--   • It makes the cheapest cheat self-evident. Editing the cumulative total in
--     garden.json moves the score but not the token log, so bkt_sum stops matching
--     the delta — a contradiction in the cheater's own submission.
--
-- What it deliberately does NOT do: upload the per-window timeline. Four aggregates
-- cannot reconstruct when someone works or sleeps; a 5-minute activity trace could.
-- The precise buckets never leave the user's machine.
--
-- It is NOT a gate. The client is still untrusted and a determined forger can
-- fabricate four self-consistent numbers. The time-scaled jump ceiling in
-- lib/ranger/analysis.ts therefore stays in force regardless. Everything here is
-- evidence for a human admin, not enforcement.
--
-- ⚠️ Must be run by hand in the Supabase SQL Editor. Idempotent — safe to re-run.
-- Assumes 0001–0007 applied.

-- ── 1. Columns on the live row (the client writes these in its normal upsert) ──
-- Nullable on purpose. NULL means "no evidence", never "suspicious":
--   • clients older than this feature send nothing, and
--   • a current client that cannot prove its local ledger accounts for the whole
--     delta (e.g. it was upgraded mid-stream, or crashed between collecting a
--     bubble and syncing) declines to assert a summary rather than send a wrong one.
alter table public.leaderboard
  add column if not exists bkt_n       integer,
  add column if not exists bkt_max     bigint,
  add column if not exists bkt_sum     bigint,
  add column if not exists bkt_span    integer,
  add column if not exists app_version text;

-- ── 2. Same columns on the append-only history, so each captured score change
--       carries the evidence that produced it. ────────────────────────────────
alter table public.leaderboard_history
  add column if not exists bkt_n       integer,
  add column if not exists bkt_max     bigint,
  add column if not exists bkt_sum     bigint,
  add column if not exists bkt_span    integer,
  add column if not exists app_version text;

-- ── 3. Widen the capture trigger to snapshot them ─────────────────────────────
-- Unchanged firing conditions (after insert or update OF score, and only when the
-- score actually moved) — the client only attaches a summary to an upload that
-- moves the score, so the two stay aligned. Because the summary rides along in the
-- SAME upsert as the score, NEW.bkt_* and NEW.score are guaranteed to be the same
-- write: bkt_sum can never be checked against a delta it didn't belong to.
create or replace function public.capture_leaderboard_history()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.leaderboard_history
      (user_id, old_score, new_score, delta, reason,
       bkt_n, bkt_max, bkt_sum, bkt_span, app_version)
    values
      (new.user_id, null, new.score, new.score, 'insert',
       new.bkt_n, new.bkt_max, new.bkt_sum, new.bkt_span, new.app_version);
  elsif tg_op = 'UPDATE' and new.score is distinct from old.score then
    insert into public.leaderboard_history
      (user_id, old_score, new_score, delta, reason,
       bkt_n, bkt_max, bkt_sum, bkt_span, app_version)
    values
      (new.user_id, old.score, new.score, new.score - old.score, 'update',
       new.bkt_n, new.bkt_max, new.bkt_sum, new.bkt_span, new.app_version);
  end if;
  return null;  -- AFTER trigger: return value is ignored
end;
$$;

-- Recreate the trigger binding defensively (create or replace function above keeps
-- the existing binding valid, but this makes the migration self-contained).
drop trigger if exists leaderboard_capture_history on public.leaderboard;
create trigger leaderboard_capture_history
  after insert or update of score on public.leaderboard
  for each row execute function public.capture_leaderboard_history();

-- ── 4. Hide the evidence columns from the public ──────────────────────────────
-- public.leaderboard is world-readable (0005's SELECT policy lets anon read every
-- non-banned row), and RLS is ROW-level: it does not stop anon from asking for any
-- COLUMN. Without this block, anyone holding the public anon key could read every
-- user's bkt_span / bkt_n and start reconstructing activity patterns. So: drop the
-- table-wide SELECT and grant it back column by column, minus the four.
--
-- The column list is built from information_schema rather than hardcoded, because
-- some columns on this table were added out-of-band and are not reproducible from
-- the migrations alone (see 0005's header). Hardcoding a list risks silently
-- dropping a column the public leaderboard reads. app_version stays public — it is
-- not sensitive and nothing depends on hiding it.
--
-- NOTE anon keeps select(user_id): DELETE ... WHERE user_id = $1 (the app's
-- "remove me from the leaderboard" path) requires SELECT privilege on any column
-- named in its WHERE clause.
do $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into v_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'leaderboard'
    and column_name not in ('bkt_n', 'bkt_max', 'bkt_sum', 'bkt_span');

  if v_cols is null then
    raise exception 'public.leaderboard not found — run 0001 first';
  end if;

  -- A table-level grant cannot be revoked column-by-column, so clear it first.
  execute 'revoke select on public.leaderboard from anon, authenticated';
  execute format('grant select (%s) on public.leaderboard to anon, authenticated', v_cols);
end
$$;

-- INSERT/UPDATE stay table-level, which covers the new columns — the client must be
-- able to WRITE the summary it cannot read back. (Writing without reading is exactly
-- the asymmetry we want here.)

-- service_role reads everything (it bypasses RLS, but still needs the grant since
-- this project does not auto-expose).
grant select on public.leaderboard         to service_role;
grant select on public.leaderboard_history to service_role;

notify pgrst, 'reload schema';   -- else PostgREST 404s / PGRST204s on the new columns
