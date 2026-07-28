-- Migration: 0016_leaderboard_quarantine
--
-- Suspicious GAINS stop counting; the PLAYER stays on the board.
--
-- Earlier drafts of this file hid the whole account. That was the wrong unit. A
-- player who cheats for one afternoon still has months of honest tokens, and
-- removing them wholesale is both unfair and unnecessary: the thing we distrust
-- is a specific score increase, not a person. So the unit is the individual
-- score increase, and a held one simply does not reach the public total. The row
-- stays, the rank drops, nobody is told anything.
--
-- ── WHY THE EXISTING EVIDENCE LAYER IS NOT ENOUGH ────────────────────────────
-- 0008's bkt_* summary answers "do your own numbers contradict each other?" It
-- catches editing the score in garden.json, because the token log then stops
-- matching. It does NOT catch the attack that works: point Claude Code at a fake
-- endpoint via ANTHROPIC_BASE_URL, return whatever `usage` you like, and loop.
-- The CLI writes that to its own log in good faith, so the desktop app reads a
-- genuine, well-formed, correctly-timestamped log and every reconciliation
-- passes. Confirmed in an authorised test: 11 of 11 summaries reconciled exactly
-- for a run that spent zero real tokens.
--
-- Nothing derived from the log can settle this, because the attacker writes the
-- log. What is left is throughput: a fabricated run must either look physically
-- impossible or throttle itself to human speed, and throttling is the cost.
--
-- ── THE FOUR RULES, AND THE FOUR THAT WERE THROWN OUT ────────────────────────
-- Calibrated per-event against the live board (265 events, 20 accounts).
--
--   peak       bkt_max/300 > 250,000 tok/s
--              honest max 184,736 · cheat 286,121
--   rate       bkt_sum / (bkt_n × 5min) > 400 M/hour
--              honest max 337 · cheat up to 860
--   wallclock  increase / GREATEST(seconds since previous event, bkt_span)
--              honest max 334 · cheat median 515, max 1,004
--   impossible_windows  Σ(bkt_n × 300) > account lifetime + 24h grace
--              honest max 23% · a forged 83-hour span in a young account reads 346%
--   relaunder  a non-first INSERT that raises the total
--              honest accounts have exactly one INSERT (their first); the cheat
--              run has six, two carrying +41M and +302M with no evidence at all
--
-- `wallclock` is the load-bearing one. The other three all read values the
-- client supplies, so omitting the summary switches them off; the server's own
-- clock cannot be switched off, and it is what turns cheating from free into
-- slow. The other three still earn their place by catching a throttled run that
-- stays under the wall-clock ceiling.
--
-- `rate` divides EVIDENCED tokens by EVIDENCED windows. Using the raw increase
-- instead looked obvious and was wrong: the honest developer account's first
-- sync raised the total by 8.05e9 while its bucket ledger only accounted for
-- 4.98e8 of that, so the naive form read 1,179 M/h and held 71% of a legitimate
-- account's history. Numerator and denominator must come from the same source.
--
-- Discarded after testing against real data — do not re-add:
--   • peak/mean ratio ("loops burn evenly"): honest median 1.68 / p90 2.99,
--     cheat 1.78 / 2.80. Completely overlapping.
--   • duty cycle ("loops never idle"): every account scores exactly 1.00, since
--     syncs are 30 minutes apart and buckets are contiguous by construction.
--   • share of evidence-free score: backwards. Honest developer 70%, legacy
--     clients 100%, the cheat run 31%.
--   • "large increase with no evidence": holds 71% of the honest developer
--     account. 0008 documents exactly when an honest client sends no summary
--     (upgraded mid-stream, closed between collecting and syncing), and it is
--     common. Only the INSERT form of it (relaunder) is specific enough to use.
--
-- Replayed over the live board: 0 events held for honest accounts, 9 events and
-- 99% of the gains held for the authorised cheat run.
--
-- ── HOW THE NUMBERS FLOW ─────────────────────────────────────────────────────
--   raw_score    what the client says its total is. Client-owned.
--   held_tokens  Σ of the increases we are not counting.
--   score        raw_score − held_tokens. THE PUBLIC NUMBER, and still the
--                column every existing reader orders by — the website needs no
--                change for holds to take effect.
--
-- The client keeps writing its total into `score`; the intake trigger moves that
-- to raw_score and replaces `score` with the public figure before the row is
-- stored. Everything downstream — the board, the badge, the stats RPC — keeps
-- reading `score` and is simply correct.
--
-- A held increase is not lost. It stays in raw_score, so the player's own total
-- keeps growing, and releasing it later restores it to the public score in full.
--
-- ── WHAT AN ADMIN DOES ───────────────────────────────────────────────────────
--   release_leaderboard_event(id)  count this increase after all; score goes up
--   hold_leaderboard_event(id)     stop counting one the machine let through
--   leaderboard_bans (0005)        the separate, human, whole-account hide —
--                                  reversible, and the player's data keeps
--                                  updating underneath while hidden
--
-- Both are sticky: `decided_by` marks an event a human has ruled on, and
-- re-evaluation never overrides it.
--
-- ⚠️ Must be run by hand in the Supabase SQL Editor. Idempotent — safe to re-run.
-- Assumes 0001–0015 applied. Supersedes 0010's capture-on-update function.

-- ── 1. Columns ────────────────────────────────────────────────────────────────
alter table public.leaderboard
  add column if not exists raw_score   bigint not null default 0,
  add column if not exists held_tokens bigint not null default 0
    check (held_tokens >= 0);

-- Existing rows: today's `score` IS the raw client total, nothing held yet.
update public.leaderboard set raw_score = score where raw_score = 0 and score <> 0;

alter table public.leaderboard_history
  add column if not exists quarantined boolean not null default false,
  add column if not exists hold_reasons text[],
  add column if not exists true_delta  bigint,
  add column if not exists decided_by  text,
  add column if not exists decided_at  timestamptz;

create index if not exists leaderboard_history_quarantined_idx
  on public.leaderboard_history (user_id, id) where quarantined;

-- ── 2. The judgement, in one place ───────────────────────────────────────────
-- private, not public: PostgREST serves every function in the schemas it
-- exposes, and a public one would let anyone probe the thresholds directly.
create schema if not exists private;
grant usage on schema private to service_role;

-- p_elapsed = seconds since this account's previous event, on the SERVER's clock.
-- It is the only input the client does not supply, and therefore the only rule it
-- cannot switch off: `peak` and `rate` both read bkt_* values the client PATCHes,
-- so omitting the summary — or sending bkt_sum = 0 with a huge bkt_n — would slip
-- a gain past both. `wallclock` still applies, turning "omit the evidence" from a
-- free bypass into "then wait".
--
-- The caller passes GREATEST(elapsed, bkt_span), not elapsed alone. Elapsed alone
-- is wrong and a live probe caught it holding an ordinary 5e5 gain: the wall-clock
-- gap measures the time between two SYNCS, while the tokens were burned earlier.
-- A player who keeps the app in capsule form all day hoards bubbles — expiry is
-- frozen there (buckets.py) — then collects them at once, so a legitimate 8-hour
-- burn lands in one 30-minute sync window. bkt_span is exactly the span those
-- tokens were actually spent over, which is why 0008 uploads it. When it is
-- absent, elapsed stands alone and the rule bites as before.
--
-- Honest maximum on the live board is 334 M/h under both forms; the cheat run
-- reached 1,004 (930 under this form, with every one of those events still held
-- by peak or rate as well).
create or replace function private.hold_reasons(
    p_bkt_max bigint, p_bkt_n integer, p_bkt_sum bigint,
    p_true_delta bigint, p_is_relaunder boolean, p_elapsed double precision,
    p_window_load double precision default null)
  returns text[]
  language sql
  immutable
as $$
  select coalesce(array_agg(r), '{}')
  from (
    select 'peak' as r
      where p_bkt_max is not null and p_bkt_max / 300.0 > 250000
    union all
    select 'rate'
      where p_bkt_n is not null and p_bkt_n > 0 and p_bkt_sum is not null
        and p_bkt_sum / (p_bkt_n * 300.0 / 3600.0) > 400000000
    union all
    select 'wallclock'
      where p_elapsed is not null and p_elapsed > 0 and p_true_delta > 0
        and p_true_delta / (p_elapsed / 3600.0) > 600000000
    union all
    select 'relaunder'
      where p_is_relaunder and p_true_delta > 0
    union all
    -- p_window_load = Σ(bkt_n × 300) over the account's whole history, divided by
    -- the time it has existed plus a day's grace. Every 5-minute bucket is a
    -- distinct, non-overlapping slice of real time, so their total cannot exceed
    -- how long the account has been alive — and the denominator comes from server
    -- timestamps, which the client cannot touch.
    --
    -- This exists because `wallclock` alone was defeatable. bkt_span is
    -- client-supplied, and GREATEST(elapsed, bkt_span) — added to stop a real
    -- false positive — let an attacker claim a huge span and switch the rule off.
    -- A payload of n=1000 / span=83h / max=1e6 / sum=1e9 slips past peak, rate AND
    -- wallclock simultaneously. It cannot slip past this: 83 hours of claimed
    -- buckets in a young account reads 346%.
    --
    -- The grace covers the honest case it would otherwise catch — the app running
    -- for hours before the player switches the leaderboard on, so the first sync
    -- carries a backlog older than the account. Live board: heaviest honest
    -- account 23%, so the 100% line has 4.3x of headroom.
    select 'impossible_windows'
      where p_window_load is not null and p_window_load > 1.0
  ) t;
$$;


-- Σ(bkt_n × 300) for the account, over its lifetime + a day's grace. NULL when
-- the account has no bucket evidence at all (nothing to measure).
create or replace function private.window_load(p_user_id uuid, p_extra_n integer)
  returns double precision
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select case when coalesce(sum(h.bkt_n), 0) + coalesce(p_extra_n, 0) = 0 then null
              else (coalesce(sum(h.bkt_n), 0) + coalesce(p_extra_n, 0)) * 300.0
                   / (greatest(extract(epoch from (now() - min(h.at))), 0) + 86400.0)
         end
  from public.leaderboard_history h
  where h.user_id = p_user_id;
$$;

revoke all on function private.window_load(uuid, integer) from public;
grant execute on function private.window_load(uuid, integer) to service_role;

-- ── 3. Intake: raw in, public out, history written, holds applied ────────────
-- This replaces 0010's capture_leaderboard_history_update. Same trigger point
-- (BEFORE UPDATE OF score, where NEW is still writable) and it still consumes
-- the evidence for the same reason 0010 gives; it additionally owns the
-- raw/public split so that no second UPDATE — and therefore no recursion — is
-- ever needed to apply a hold.
create or replace function public.capture_leaderboard_history_update()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_raw_new bigint := new.score;      -- the client wrote its own total here
  v_raw_old bigint := coalesce(old.raw_score, old.score, 0);
  v_delta   bigint;
  v_why     text[];
  v_prev_at timestamptz;
begin
  -- An admin adjustment writes `score` directly and must not be mistaken for a
  -- client sync. release/hold set this for the duration of their statement.
  if coalesce(current_setting('tokenforest.admin_adjust', true), '') = '1' then
    return new;
  end if;

  v_delta := v_raw_new - v_raw_old;

  if v_delta <> 0 then
    select h.at into v_prev_at
    from public.leaderboard_history h
    where h.user_id = new.user_id order by h.id desc limit 1;

    v_why := private.hold_reasons(
      new.bkt_max, new.bkt_n, new.bkt_sum, v_delta, false,
      case when v_prev_at is null then null
           else greatest(extract(epoch from (now() - v_prev_at)),
                         coalesce(new.bkt_span, 0)) end,
      private.window_load(new.user_id, new.bkt_n));

    insert into public.leaderboard_history
      (user_id, old_score, new_score, delta, true_delta, reason,
       bkt_n, bkt_max, bkt_sum, bkt_span, app_version,
       quarantined, hold_reasons)
    values
      (new.user_id, v_raw_old, v_raw_new, v_delta, v_delta, 'update',
       new.bkt_n, new.bkt_max, new.bkt_sum, new.bkt_span, new.app_version,
       array_length(v_why, 1) is not null,
       case when array_length(v_why, 1) is null then null else v_why end);

  end if;

  -- Base on OLD, never on NEW: the BEFORE INSERT trigger has already overwritten
  -- new.held_tokens on the upsert path, and its rebuilt value must not be added
  -- to on top of itself.
  new.held_tokens := coalesce(old.held_tokens, 0)
                   + case when array_length(v_why, 1) is not null and v_delta > 0
                          then v_delta else 0 end;
  new.raw_score := v_raw_new;
  new.score     := greatest(v_raw_new - new.held_tokens, 0);

  -- Consume the evidence (0010's reasoning, unchanged): the live row must never
  -- carry a summary at rest, or a later change that did not refresh it would get
  -- this one stapled to its delta.
  new.bkt_n := null;
  new.bkt_max := null;
  new.bkt_sum := null;
  new.bkt_span := null;

  return new;   -- BEFORE trigger: returning NULL would CANCEL the write.
end;
$$;

-- INSERT path. A first INSERT is a baseline and is never held: it carries
-- whatever the player accumulated offline before switching the board on, and by
-- construction has no evidence (upsert_score PATCHes the summary onto an
-- existing row, which does not exist yet). A LATER insert means the row was
-- deleted and re-added, which is the laundering path — that one is judged.
create or replace function public.capture_leaderboard_history_insert()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_prev    bigint;
  v_delta   bigint;
  v_why     text[];
  v_prev_at timestamptz;
begin
  select h.new_score into v_prev
  from public.leaderboard_history h
  where h.user_id = new.user_id
  order by h.id desc
  limit 1;

  select h.at into v_prev_at
  from public.leaderboard_history h
  where h.user_id = new.user_id order by h.id desc limit 1;

  v_delta := new.raw_score - coalesce(v_prev, 0);
  v_why := case when v_prev is null then '{}'::text[]
                else private.hold_reasons(
                  new.bkt_max, new.bkt_n, new.bkt_sum, v_delta, true,
                  case when v_prev_at is null then null
                       else greatest(extract(epoch from (now() - v_prev_at)),
                                     coalesce(new.bkt_span, 0)) end,
                  private.window_load(new.user_id, new.bkt_n)) end;

  insert into public.leaderboard_history
    (user_id, old_score, new_score, delta, true_delta, reason,
     bkt_n, bkt_max, bkt_sum, bkt_span, app_version,
     quarantined, hold_reasons)
  values
    (new.user_id, v_prev, new.raw_score, new.raw_score, v_delta, 'insert',
     new.bkt_n, new.bkt_max, new.bkt_sum, new.bkt_span, new.app_version,
     array_length(v_why, 1) is not null,
     case when array_length(v_why, 1) is null then null else v_why end);

  -- Always run, not only when holding: the BEFORE INSERT trigger deliberately
  -- leaves `score` at the raw figure, and a re-entry may already carry rebuilt
  -- holds that must be applied even when this event itself is clean.
  -- The guard is mandatory — this UPDATE touches `score`, and without it the
  -- BEFORE UPDATE capture would read the reduced figure as a fresh client total,
  -- write a bogus negative event and subtract the hold twice.
  perform set_config('tokenforest.admin_adjust', '1', true);
  update public.leaderboard
     set held_tokens = held_tokens
                     + case when array_length(v_why, 1) is not null and v_delta > 0
                            then v_delta else 0 end,
         score = greatest(raw_score - (held_tokens
                     + case when array_length(v_why, 1) is not null and v_delta > 0
                            then v_delta else 0 end), 0)
   where user_id = new.user_id;
  perform set_config('tokenforest.admin_adjust', '0', true);

  return null;   -- AFTER trigger
end;
$$;

-- BEFORE INSERT. It records the raw total and rebuilds any surviving holds, but
-- it must NOT reduce `score` here.
--
-- PostgreSQL fires BEFORE INSERT triggers on an INSERT ... ON CONFLICT DO UPDATE
-- *before* it detects the conflict, so on every client upsert this runs first and
-- whatever it leaves in NEW is what the BEFORE UPDATE trigger then sees. An
-- earlier version reduced `score` here, so capture read an already-reduced figure
-- as the client's raw total and every subsequent delta drifted downwards — the
-- raw total fell to 101.6e6 while the client was uploading 202.1e6. Caught by an
-- end-to-end probe, not by review.
--
-- So: raw and held here, reduction in the AFTER INSERT trigger (genuine inserts)
-- or in capture_leaderboard_history_update (the conflict path), each of which
-- owns exactly one of the two routes.
create or replace function public.leaderboard_intake_insert()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_held bigint;
begin
  -- Withdrawing deletes the row but NOT the history, so re-enabling would
  -- otherwise arrive with held_tokens = 0 and quietly republish every held gain,
  -- making "turn it off and on again" a complete bypass via the very path the
  -- cheat run already used. Rebuild from the surviving history instead.
  select coalesce(sum(greatest(coalesce(h.true_delta, h.delta), 0)), 0)
    into v_held
  from public.leaderboard_history h
  where h.user_id = new.user_id and h.quarantined;

  new.raw_score := new.score;
  new.held_tokens := v_held;
  return new;
end;
$$;

drop trigger if exists leaderboard_aa0_intake_ins on public.leaderboard;
create trigger leaderboard_aa0_intake_ins
  before insert on public.leaderboard
  for each row execute function public.leaderboard_intake_insert();

-- ── 4. Admin verdicts ────────────────────────────────────────────────────────
create or replace function public.release_leaderboard_event(p_id bigint, p_admin text)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_user uuid;
  v_delta bigint;
begin
  update public.leaderboard_history
     set quarantined = false, decided_by = p_admin, decided_at = now()
   where id = p_id and quarantined
   returning user_id, greatest(coalesce(true_delta, delta), 0) into v_user, v_delta;
  if v_user is null then
    return;
  end if;

  perform set_config('tokenforest.admin_adjust', '1', true);
  update public.leaderboard
     set held_tokens = greatest(held_tokens - v_delta, 0),
         score = greatest(raw_score - greatest(held_tokens - v_delta, 0), 0)
   where user_id = v_user;
  perform set_config('tokenforest.admin_adjust', '0', true);
end;
$$;

create or replace function public.hold_leaderboard_event(p_id bigint, p_admin text)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_user uuid;
  v_delta bigint;
begin
  update public.leaderboard_history
     set quarantined = true, decided_by = p_admin, decided_at = now()
   where id = p_id and not quarantined
   returning user_id, greatest(coalesce(true_delta, delta), 0) into v_user, v_delta;
  if v_user is null then
    return;
  end if;

  perform set_config('tokenforest.admin_adjust', '1', true);
  update public.leaderboard
     set held_tokens = held_tokens + v_delta,
         score = greatest(raw_score - (held_tokens + v_delta), 0)
   where user_id = v_user;
  perform set_config('tokenforest.admin_adjust', '0', true);
end;
$$;

drop function if exists private.hold_reasons(bigint, integer, bigint, bigint, boolean);                    -- earlier signature
drop function if exists private.hold_reasons(bigint, integer, bigint, bigint, boolean, double precision);  -- earlier signature
revoke all on function private.hold_reasons(bigint, integer, bigint, bigint, boolean, double precision, double precision) from public;
revoke all on function public.release_leaderboard_event(bigint, text) from public;
revoke all on function public.hold_leaderboard_event(bigint, text) from public;
grant execute on function public.release_leaderboard_event(bigint, text) to service_role;
grant execute on function public.hold_leaderboard_event(bigint, text) to service_role;

-- ── 5. The client must not touch the new columns ─────────────────────────────
-- 0002 grants authenticated UPDATE on the whole row, so without column grants a
-- held account could simply PATCH held_tokens=0. raw_score is likewise off
-- limits: writing it directly would forge the baseline every delta is measured
-- against. `score` stays writable — that is where the client puts its total, and
-- the intake trigger overwrites it before storage anyway.
do $$
declare
  v_write text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into v_write
  from information_schema.columns
  where table_schema = 'public' and table_name = 'leaderboard'
    and column_name not in ('raw_score', 'held_tokens');

  if v_write is null then
    raise exception 'public.leaderboard not found — run 0001 first';
  end if;

  execute 'revoke insert, update on public.leaderboard from anon, authenticated';
  execute format('grant insert (%s) on public.leaderboard to authenticated', v_write);
  execute format('grant update (%s) on public.leaderboard to authenticated', v_write);
end
$$;

grant select, update on public.leaderboard to service_role;
grant select, update on public.leaderboard_history to service_role;

-- ── 6. Backfill: judge the history we already have ───────────────────────────
-- true_delta is recomputed from scratch rather than trusting `delta`: a
-- re-insert records delta = the whole score, so summing those would over-hold.
-- The real increase is always new_score minus the previous row's new_score.
do $$
declare
  u record;
  h record;
  v_prev bigint;
  v_delta bigint;
  v_why text[];
  v_held bigint;
  v_first boolean;
  v_prev_at timestamptz;
begin
  for u in select user_id, raw_score from public.leaderboard loop
    v_prev := 0; v_held := 0; v_first := true; v_prev_at := null;
    for h in
      select * from public.leaderboard_history
      where user_id = u.user_id order by id asc
    loop
      v_delta := h.new_score - v_prev;
      v_prev := h.new_score;

      if h.decided_by is not null then          -- a human already ruled: leave it
        if h.quarantined then v_held := v_held + greatest(v_delta, 0); end if;
        update public.leaderboard_history set true_delta = v_delta where id = h.id;
        v_first := false;
        v_prev_at := h.at;
        continue;
      end if;

      v_why := case
        when h.reason = 'insert' and v_first then '{}'::text[]
        else private.hold_reasons(h.bkt_max, h.bkt_n, h.bkt_sum, v_delta,
                                  h.reason = 'insert',
                                  case when v_prev_at is null then null
                                       else greatest(extract(epoch from (h.at - v_prev_at)),
                                                     coalesce(h.bkt_span, 0)) end,
                                  private.window_load(h.user_id, 0))
      end;
      v_first := false;

      update public.leaderboard_history
         set true_delta   = v_delta,
             quarantined  = array_length(v_why, 1) is not null,
             hold_reasons = case when array_length(v_why, 1) is null then null else v_why end
       where id = h.id;

      if array_length(v_why, 1) is not null then
        v_held := v_held + greatest(v_delta, 0);
      end if;
      v_prev_at := h.at;
    end loop;

    perform set_config('tokenforest.admin_adjust', '1', true);
    update public.leaderboard
       set held_tokens = v_held,
           score = greatest(raw_score - v_held, 0)
     where user_id = u.user_id;
    perform set_config('tokenforest.admin_adjust', '0', true);
  end loop;
end
$$;

notify pgrst, 'reload schema';
