-- Migration: 0010_fix_capture_trigger_and_cleanup
--
-- Fixes a defect introduced by 0009 and cleans up the rows it produced.
--
-- ── The defect ────────────────────────────────────────────────────────────────
-- 0009 turned the capture trigger into BEFORE INSERT OR UPDATE OF score, so it could
-- blank the evidence columns on the stored row. But the client writes with PostgREST's
-- upsert, i.e. INSERT … ON CONFLICT (user_id) DO UPDATE — and in PostgreSQL the
-- **BEFORE INSERT row trigger fires before the conflict is even detected**. When the
-- conflict then routes the statement to DO UPDATE, the BEFORE INSERT trigger has already
-- run and its side effects are NOT rolled back.
--
-- Result: every single score sync wrote TWO history rows —
--     the bogus one: old_score = NULL, delta = the whole score, reason = 'insert'
--     the real one:  old_score = <previous>, delta = <actual gain>, reason = 'update'
--
-- And the bogus row is the worse half. old_score = NULL is exactly how a first-ever
-- registration looks, so lib/ranger/analysis.ts classes it as a baseline — and the
-- baseline plausibility check (added to close the delete-and-re-register hole) would
-- then flag a huge "first-ever total" as suspicious. Every honest user would have been
-- accused, on every sync, forever.
--
-- AFTER INSERT does not have this behaviour: it fires only when a row was really
-- inserted. The mistake was moving the capture, not just the blanking, into BEFORE.
--
-- ── The fix: split the trigger by when it must run ────────────────────────────
--   • AFTER INSERT   — capture only. A genuinely new row. The client's upsert carries no
--     bkt_* columns at all, and its PATCH cannot have matched a row that did not yet
--     exist, so there is never any evidence here. This is the baseline row, and baseline
--     rows carry no evidence by design. Nothing to blank.
--   • BEFORE UPDATE OF score — capture AND blank. Fires only on a real update (ON CONFLICT
--     DO UPDATE reaches it only when the conflict actually happened), so no phantom row.
--     BEFORE is required: it is the only point where NEW is still writable, which is how
--     the evidence gets consumed instead of left sitting on a publicly-joined row.
--
-- ⚠️ Run by hand in the Supabase SQL Editor. Idempotent. Assumes 0001–0009 applied.

-- ── 1. Capture on a genuine INSERT (AFTER: only fires if a row was really inserted) ──
create or replace function public.capture_leaderboard_history_insert()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  insert into public.leaderboard_history
    (user_id, old_score, new_score, delta, reason,
     bkt_n, bkt_max, bkt_sum, bkt_span, app_version)
  values
    (new.user_id, null, new.score, new.score, 'insert',
     new.bkt_n, new.bkt_max, new.bkt_sum, new.bkt_span, new.app_version);
  return null;   -- AFTER trigger: the return value is ignored.
end;
$$;

-- ── 2. Capture + consume on a real score UPDATE (BEFORE: NEW is still writable) ──
create or replace function public.capture_leaderboard_history_update()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if new.score is distinct from old.score then
    insert into public.leaderboard_history
      (user_id, old_score, new_score, delta, reason,
       bkt_n, bkt_max, bkt_sum, bkt_span, app_version)
    values
      (new.user_id, old.score, new.score, new.score - old.score, 'update',
       new.bkt_n, new.bkt_max, new.bkt_sum, new.bkt_span, new.app_version);
  end if;

  -- Consume the evidence: the live row must never carry a summary at rest, or a LATER
  -- score change that did not refresh it would get this one stapled to its delta, Σbuckets
  -- would fail to match, and an honest user would be accused of cheating. Unconditional,
  -- so it holds even on a sync that changed no score.
  new.bkt_n := null;
  new.bkt_max := null;
  new.bkt_sum := null;
  new.bkt_span := null;

  return new;   -- BEFORE trigger: returning NULL would CANCEL the write.
end;
$$;

-- ── 3. Rebind ─────────────────────────────────────────────────────────────────
drop trigger if exists leaderboard_capture_history on public.leaderboard;  -- 0006/0008/0009
drop trigger if exists leaderboard_capture_history_ins on public.leaderboard;
drop trigger if exists leaderboard_capture_history_upd on public.leaderboard;

create trigger leaderboard_capture_history_ins
  after insert on public.leaderboard
  for each row execute function public.capture_leaderboard_history_insert();

create trigger leaderboard_capture_history_upd
  before update of score on public.leaderboard
  for each row execute function public.capture_leaderboard_history_update();

drop function if exists public.capture_leaderboard_history();   -- the merged version is gone

-- ── 4. Delete the phantom rows 0009 produced ─────────────────────────────────
-- A phantom is a reason='insert' row for a user who ALREADY had an earlier history row.
-- A user's genuine first registration is the earliest row they have, so it is never
-- caught by this. The 0006 backfill rows (reason='backfill') are untouched.
delete from public.leaderboard_history h
where h.reason = 'insert'
  and exists (
    select 1 from public.leaderboard_history e
    where e.user_id = h.user_id
      and e.id < h.id
  );

-- ── 5. Delete the internal self-test account's rows ───────────────────────────
-- Created while verifying the write path end-to-end against the live database, and hidden
-- from the public board immediately via leaderboard_bans. Remove it entirely.
delete from public.leaderboard_history
where user_id in (select user_id from public.leaderboard where username = 'zz-selftest');
delete from public.leaderboard_bans
where user_id in (select user_id from public.leaderboard where username = 'zz-selftest');
delete from public.leaderboard where username = 'zz-selftest';

-- ── 6. Let the admin console actually delete rows ─────────────────────────────
-- service_role was granted SELECT on leaderboard in 0005 but never DELETE, so /ranger has
-- no way to remove a row (only hide it) — and the cleanup above would have failed from the
-- REST API for the same reason. Grant it.
grant delete on public.leaderboard         to service_role;
grant delete on public.leaderboard_history to service_role;

notify pgrst, 'reload schema';
