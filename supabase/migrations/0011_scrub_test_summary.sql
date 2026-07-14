-- Migration: 0011_scrub_test_summary
--
-- One-off data correction. During the live verification of the 0008–0010 write path, a
-- synthetic evidence summary (a hand-made {n:6, max:12e6, sum:0, span:1800}) was PATCHed
-- onto a real account's row, and the desktop app's own 30-minute sync happened to land at
-- the same moment. The capture trigger did exactly what it is supposed to do: it stapled
-- the summary on the row to the score change that fired it.
--
-- The result is a history row whose bkt_sum (0) does not match its delta (47,563,664) —
-- which lib/ranger/analysis.ts reads, correctly, as "this score is not backed by the token
-- log", i.e. it accuses the account of cheating. The account is honest; the summary was
-- mine, not the client's.
--
-- Fix: blank the four evidence columns on that row. The score change itself is REAL and is
-- left untouched — the delta, the timestamps and the chain of old_score → new_score all
-- stand. Only the fabricated evidence is removed, which returns the row to "no evidence",
-- and no evidence is never suspicious.
--
-- This is done in a migration rather than through the admin console on purpose:
-- leaderboard_history is an append-only forensic log, and granting the console UPDATE on it
-- would mean an admin could quietly rewrite the record they are supposed to be judging.
-- A correction to it should be a migration — reviewable, and part of the public record.
--
-- Idempotent: matches on the exact contradiction (sum ≠ delta with sum = 0), so re-running
-- finds nothing. ⚠️ Run by hand in the Supabase SQL Editor.

update public.leaderboard_history
set bkt_n = null, bkt_max = null, bkt_sum = null, bkt_span = null
where bkt_sum = 0
  and delta <> 0;

-- Sanity: no row should now claim an evidence total that contradicts its own delta.
-- (A real mismatch from a real client is a genuine cheat signal and must NOT be scrubbed —
-- this only ever removes the sum=0 artefact above.)
do $$
declare
  v_bad int;
begin
  select count(*) into v_bad
  from public.leaderboard_history
  where bkt_sum is not null and bkt_sum <> delta;
  raise notice 'rows whose evidence contradicts their delta: %', v_bad;
end
$$;
