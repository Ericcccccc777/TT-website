-- Migration: 0009_bucket_summary_write_path
--
-- ⚠️ THE TRIGGER IN THIS FILE IS WRONG — SUPERSEDED BY 0010. Do not copy its shape.
-- It makes capture a BEFORE INSERT OR UPDATE trigger, and PostgreSQL fires BEFORE INSERT
-- for an `INSERT … ON CONFLICT DO UPDATE` even when the statement ends up doing the UPDATE,
-- so every sync wrote a phantom "first-ever registration" history row. 0010 splits it into
-- AFTER INSERT (capture) + BEFORE UPDATE (capture and blank), which is the correct shape.
-- Kept in place because it has been applied to production and 0010 builds on it; the
-- reasoning below about the write path (defect 1) and stale summaries (defect 2) still holds.
--
-- Fixes a defect in 0008 that would have silently broken EVERY score upload from the
-- new desktop client, and closes a false-accusation hazard 0008 left open.
--
-- ── Defect 1: the client could not write a column it cannot read ──────────────
-- 0008 revoked anon's SELECT on bkt_n/bkt_max/bkt_sum/bkt_span so the four evidence
-- numbers stay private. But the client writes its row with PostgREST's upsert, which is
-- INSERT … ON CONFLICT (user_id) DO UPDATE SET … = EXCLUDED.…, and PostgreSQL requires
-- SELECT privilege on every column an ON CONFLICT DO UPDATE reads. So the upsert died
-- with 42501 "permission denied for table leaderboard" the moment the payload carried a
-- bkt_* column — on an upload path the app fails silently on.
--
-- The fix is client-side and needs no SQL: the client now sends the four numbers in a
-- plain PATCH (UPDATE … WHERE user_id = …) BEFORE the score upsert, and the upsert itself
-- carries no bkt_* at all. A plain UPDATE needs UPDATE privilege on the target columns and
-- SELECT only on the columns named in its WHERE clause (user_id — which anon still has).
-- Write-without-read: exactly the asymmetry we wanted. 0008's column revoke stands, and
-- keeps doing the privacy work.
--
-- ── Defect 2: a stale summary could be pinned to the wrong delta ──────────────
-- The evidence sat on the live row indefinitely after being captured. Any later score
-- change that did not refresh it first would make the trigger staple the PREVIOUS upload's
-- summary onto a brand-new delta. Σbuckets then fails to match, and lib/ranger/analysis.ts
-- reads that mismatch as "this score is not backed by the token log" — i.e. it accuses an
-- honest user of cheating. Reachable in the real world: an older client (which knows
-- nothing about bkt_* and never PATCHes) syncing the same account from a second machine
-- does exactly this.
--
-- Fix: the capture trigger becomes BEFORE and CONSUMES the evidence — it copies the four
-- numbers into leaderboard_history, then blanks them on the row being stored. The live row
-- is therefore always NULL at rest. A score change with no fresh summary now captures NULL,
-- and NULL means "no evidence", never "suspicious". The invariant becomes structural
-- instead of depending on every client, of every version, behaving.
--
-- (No CHECK constraint enforcing "always NULL at rest": the client's PATCH sets those
-- columns and does NOT touch score, so it does not fire the trigger — a CHECK would reject
-- the PATCH itself and take the whole feature down with it.)
--
-- ⚠️ Run by hand in the Supabase SQL Editor. Idempotent. Assumes 0001–0008 applied.

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

  -- Consume the evidence. Unconditional on purpose: the row must never carry a summary at
  -- rest, whether or not this particular statement captured one. Blanking on a no-op
  -- re-sync loses nothing — the client only produces a summary when the score actually
  -- grew, and it re-sends it on the next attempt from its own on-disk ledger.
  new.bkt_n := null;
  new.bkt_max := null;
  new.bkt_sum := null;
  new.bkt_span := null;

  return new;   -- BEFORE trigger: returning NULL would CANCEL the write entirely.
end;
$$;

-- AFTER → BEFORE. Same firing conditions (insert, or an update that touches score).
drop trigger if exists leaderboard_capture_history on public.leaderboard;
create trigger leaderboard_capture_history
  before insert or update of score on public.leaderboard
  for each row execute function public.capture_leaderboard_history();

notify pgrst, 'reload schema';
