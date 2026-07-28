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
-- ── THE THREE RULES, AND THE FOUR THAT WERE THROWN OUT ───────────────────────
-- Calibrated per-event against the live board (265 events, 20 accounts).
--
--   peak       bkt_max/300 > 250,000 tok/s
--              honest max 184,736 · cheat 286,121
--   rate       bkt_sum / (bkt_n × 5min) > 400 M/hour
--              honest max 337 · cheat up to 860
--   relaunder  a non-first INSERT that raises the total
--              honest accounts have exactly one INSERT (their first); the cheat
--              run has six, two carrying +41M and +302M with no evidence at all
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
-- Replayed over the live board: 0 events held for honest accounts, 8 events and
-- 94% of the gains held for the authorised cheat run.
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

create or replace function private.hold_reasons(
    p_bkt_max bigint, p_bkt_n integer, p_bkt_sum bigint,
    p_true_delta bigint, p_is_relaunder boolean)
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
    select 'relaunder'
      where p_is_relaunder and p_true_delta > 0
  ) t;
$$;

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
begin
  -- An admin adjustment writes `score` directly and must not be mistaken for a
  -- client sync. release/hold set this for the duration of their statement.
  if coalesce(current_setting('tokenforest.admin_adjust', true), '') = '1' then
    return new;
  end if;

  v_delta := v_raw_new - v_raw_old;

  if v_delta <> 0 then
    v_why := private.hold_reasons(new.bkt_max, new.bkt_n, new.bkt_sum, v_delta, false);

    insert into public.leaderboard_history
      (user_id, old_score, new_score, delta, true_delta, reason,
       bkt_n, bkt_max, bkt_sum, bkt_span, app_version,
       quarantined, hold_reasons)
    values
      (new.user_id, v_raw_old, v_raw_new, v_delta, v_delta, 'update',
       new.bkt_n, new.bkt_max, new.bkt_sum, new.bkt_span, new.app_version,
       array_length(v_why, 1) is not null,
       case when array_length(v_why, 1) is null then null else v_why end);

    if array_length(v_why, 1) is not null and v_delta > 0 then
      new.held_tokens := coalesce(old.held_tokens, 0) + v_delta;
    end if;
  end if;

  new.raw_score := v_raw_new;
  new.score     := greatest(v_raw_new - coalesce(new.held_tokens, 0), 0);

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
  v_prev  bigint;
  v_delta bigint;
  v_why   text[];
begin
  select h.new_score into v_prev
  from public.leaderboard_history h
  where h.user_id = new.user_id
  order by h.id desc
  limit 1;

  v_delta := new.raw_score - coalesce(v_prev, 0);
  v_why := case when v_prev is null then '{}'::text[]
                else private.hold_reasons(new.bkt_max, new.bkt_n, new.bkt_sum,
                                          v_delta, true) end;

  insert into public.leaderboard_history
    (user_id, old_score, new_score, delta, true_delta, reason,
     bkt_n, bkt_max, bkt_sum, bkt_span, app_version,
     quarantined, hold_reasons)
  values
    (new.user_id, v_prev, new.raw_score, new.raw_score, v_delta, 'insert',
     new.bkt_n, new.bkt_max, new.bkt_sum, new.bkt_span, new.app_version,
     array_length(v_why, 1) is not null,
     case when array_length(v_why, 1) is null then null else v_why end);

  if array_length(v_why, 1) is not null and v_delta > 0 then
    update public.leaderboard
       set held_tokens = held_tokens + v_delta,
           score = greatest(raw_score - (held_tokens + v_delta), 0)
     where user_id = new.user_id;
  end if;

  return null;   -- AFTER trigger
end;
$$;

-- BEFORE INSERT: same raw/public split as the update path.
create or replace function public.leaderboard_intake_insert()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  new.raw_score := new.score;
  new.held_tokens := coalesce(new.held_tokens, 0);
  new.score := greatest(new.raw_score - new.held_tokens, 0);
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

revoke all on function private.hold_reasons(bigint, integer, bigint, bigint, boolean) from public;
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
begin
  for u in select user_id, raw_score from public.leaderboard loop
    v_prev := 0; v_held := 0; v_first := true;
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
        continue;
      end if;

      v_why := case
        when h.reason = 'insert' and v_first then '{}'::text[]
        else private.hold_reasons(h.bkt_max, h.bkt_n, h.bkt_sum, v_delta,
                                  h.reason = 'insert')
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
