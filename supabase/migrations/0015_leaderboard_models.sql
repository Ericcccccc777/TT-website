-- Migration: 0015_leaderboard_models
--
-- Per-model usage rows, so the site can add new boards beyond "biggest tree":
-- "Claude vs Codex", "most-used model", cache-ratio comparisons, and so on.
--
-- WHAT THE CLIENT SENDS (one row per model, full snapshot, upserted):
--   provider   vendor derived from the MODEL NAME, not from which CLI logged it
--              (users route DeepSeek/GLM/Kimi through Claude Code via
--              ANTHROPIC_BASE_URL; the model name is what tells the truth)
--   model      normalised model id, e.g. 'claude-opus-4-8', 'gpt-5.6-sol'
--   tokens     input + output + cache_read + cache_write
--   plus the four components, so the site can chart cache ratio per model.
--
-- WHERE THE NUMBERS COME FROM — this is the part that shapes what you may claim.
-- They are NOT a scan of the user's log history. Every bubble the app floats
-- carries the breakdown of which models burned it, and that breakdown is banked
-- at exactly the moment the user POPS the bubble — the same instant, the same
-- energy, that raises the tree score (app.py:_collect_bubble). A bubble that
-- expires unpopped adds to neither. So model totals and score move together, and
-- nothing that predates the user installing the app is ever uploaded.
--
-- ⚠️ STILL DO NOT ASSERT sum(tokens) == score. The relation is sum(tokens) <=
-- score, and the gap is legitimate for two reasons that never go away:
--   • Tokens collected before this feature shipped have no model attribution, so
--     every existing user starts with a large score and zero model rows.
--   • The v2→v3 save migration rescaled historical values by ×100
--     (garden.py:_migrate_to_v3), which inflates score alone.
-- A board that assumes equality will report honest veterans as broken.
--
-- The bkt_* anti-cheat evidence in 0008 validates score ONLY; nothing here is
-- evidence-backed. But because model tokens are banked by the same pop that
-- raises the score, sum(tokens) > score IS a real contradiction worth flagging
-- to /ranger — an honest client cannot produce it.
--
-- PUBLIC EXPOSURE: these rows are world-readable (that is the point — they feed
-- public boards), minus banned users, exactly like public.leaderboard. Nickname
-- and region come from joining public.leaderboard on user_id.
--
-- MODEL NAMES ARE UNTRUSTED INPUT. They are copied verbatim out of local logs,
-- and anyone pointing the CLI at a proxy controls that string end to end. Since
-- it lands on a public page, it gets the same treatment as a nickname: strict
-- charset + length, and the 0013 banned-words table. A row that fails either is
-- DROPPED (see §3 for why dropping, not renaming) while the rest of the batch
-- commits — one bad name must never be able to wedge a user's whole upload, and
-- that failure mode is the whole reason docs/LEADERBOARD.md exists.
--
-- ⚠️ Must be run by hand in the Supabase SQL Editor. Idempotent — safe to re-run.
-- Assumes 0001–0014 applied.

-- ── 1. Make leaderboard.user_id referenceable ─────────────────────────────────
-- 0002 created a unique INDEX. Postgres does accept a bare unique index as an FK
-- target, but promoting it to a real constraint makes the dependency explicit and
-- keeps the schema reproducible from migrations alone.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.leaderboard'::regclass
      and conname  = 'leaderboard_user_id_key'
  ) then
    alter table public.leaderboard
      add constraint leaderboard_user_id_key unique using index leaderboard_user_id_unique;
  end if;
end
$$;

-- ── 2. The table ──────────────────────────────────────────────────────────────
-- FK -> public.leaderboard(user_id) rather than auth.users: it makes the app's
-- "turn the leaderboard off" path (DELETE the leaderboard row) cascade here for
-- free. Account deletion still cascades transitively, because public.leaderboard
-- itself references auth.users on delete cascade.
create table if not exists public.leaderboard_models (
  user_id     uuid   not null
              references public.leaderboard(user_id) on delete cascade,
  provider    text   not null,
  model       text   not null,
  tokens      bigint not null default 0 check (tokens      >= 0),
  input       bigint not null default 0 check (input       >= 0),
  output      bigint not null default 0 check (output      >= 0),
  cache_read  bigint not null default 0 check (cache_read  >= 0),
  cache_write bigint not null default 0 check (cache_write >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, model)
);

-- Board queries: "top models overall" and "provider vs provider".
create index if not exists leaderboard_models_model_tokens_idx
  on public.leaderboard_models (model, tokens desc);
create index if not exists leaderboard_models_provider_tokens_idx
  on public.leaderboard_models (provider, tokens desc);

alter table public.leaderboard_models enable row level security;

-- ── 3. Sanitising trigger ─────────────────────────────────────────────────────
-- Three properties this has to have at once, and they constrain the design more
-- than they look:
--
--   1. Never raise. An exception aborts the entire batch, and a client that is
--      not told WHICH model offended can only resend the identical payload every
--      30 minutes forever. Silent permanent breakage is precisely the failure
--      class the username guard exists to end.
--   2. Never REWRITE model. The PK is (user_id, model) and the client sends the
--      whole snapshot as one ON CONFLICT statement. Folding a rejected name to
--      'unknown' can collide with the 'unknown' row the client already sends (it
--      buckets its own unrecognised models there), and Postgres answers with
--      "ON CONFLICT DO UPDATE command cannot affect row a second time" — the
--      whole batch dies. Note this needs no tampering at all: a model name that
--      passes the client's charset check but trips the wordlist reaches here as
--      an ordinary row from an ordinary user.
--   3. Still let everything else through. One bad row must not cost the user
--      their other twelve models.
--
-- Returning NULL from a BEFORE trigger satisfies all three: the offending row is
-- dropped, the rest of the batch commits, nothing is renamed, nothing throws.
-- provider IS rewritten when unrecognised — it is not part of the key, so
-- coercing it cannot collide with anything.
create or replace function public.sanitize_leaderboard_model()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  m     text := lower(btrim(coalesce(new.model, '')));
  p     text := lower(btrim(coalesce(new.provider, '')));
  dense text;
begin
  -- Strict charset: a model id is [a-z0-9] plus . _ - and nothing else. This is
  -- what makes the string safe to render on a public page without escaping games.
  if m !~ '^[a-z0-9][a-z0-9._-]{0,63}$' then
    return null;                        -- drop this row, keep the rest
  end if;

  -- Reuse the 0013 wordlist so a slur cannot ride in dressed as a model id.
  -- normalize_name() strips separators, so 'deep-seek-<slur>' collapses to the
  -- dense form those rules already catch.
  dense := public.normalize_name(m);
  if dense <> '' and exists (
    select 1 from public.banned_words b
    where (b.match_mode = 'cjk'   and dense like '%' || b.word || '%')
       or (b.match_mode = 'latin' and dense like b.word || '%')
  ) then
    return null;
  end if;

  -- Vendor list mirrors PROVIDER_ORDER in src/dashboard/analytics.py.
  if p not in ('claude', 'codex', 'gemini', 'grok', 'mistral', 'cohere',
               'deepseek', 'kimi', 'glm', 'qwen', 'minimax', 'mimo', 'unknown') then
    p := 'unknown';
  end if;

  new.model      := m;
  new.provider   := p;
  new.tokens     := greatest(coalesce(new.tokens, 0), 0);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists leaderboard_models_sanitize on public.leaderboard_models;
create trigger leaderboard_models_sanitize
  before insert or update on public.leaderboard_models
  for each row execute function public.sanitize_leaderboard_model();

-- ── 4. RLS ────────────────────────────────────────────────────────────────────
-- Public read, banned users hidden — same rule as public.leaderboard (0005), via
-- the same SECURITY DEFINER helper (a bare sub-select would run as anon, which
-- cannot read leaderboard_bans, and would therefore hide nobody).
drop policy if exists "leaderboard_models_select_public" on public.leaderboard_models;
create policy "leaderboard_models_select_public"
  on public.leaderboard_models
  for select
  to anon, authenticated
  using (not public.is_banned(user_id));

drop policy if exists "leaderboard_models_insert_own" on public.leaderboard_models;
create policy "leaderboard_models_insert_own"
  on public.leaderboard_models
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "leaderboard_models_update_own" on public.leaderboard_models;
create policy "leaderboard_models_update_own"
  on public.leaderboard_models
  for update
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "leaderboard_models_delete_own" on public.leaderboard_models;
create policy "leaderboard_models_delete_own"
  on public.leaderboard_models
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ── 5. Hide updated_at from the public ───────────────────────────────────────
-- The whole privacy claim for this table is "no dates attached, so it cannot
-- reveal when you work". updated_at breaks that on its own: the client rewrites
-- every row on each sync, so anyone holding the public anon key can poll this
-- table and reconstruct exactly when a given user's model usage moved — the
-- 5-minute activity trace we refused to upload in the first place, rebuilt from
-- the outside. RLS is ROW-level and does not restrict COLUMNS, so the fix is the
-- same asymmetry 0008 used for bkt_*: drop the table-wide SELECT, grant it back
-- column by column, minus this one. The client must still be able to WRITE it.
grant insert, update, delete on public.leaderboard_models to anon, authenticated;
do $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into v_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'leaderboard_models'
    and column_name <> 'updated_at';

  if v_cols is null then
    raise exception 'public.leaderboard_models not found — this migration is out of order';
  end if;

  execute 'revoke select on public.leaderboard_models from anon, authenticated';
  execute format('grant select (%s) on public.leaderboard_models to anon, authenticated', v_cols);
end
$$;

grant select on public.leaderboard_models to service_role;

notify pgrst, 'reload schema';   -- else PostgREST 404s on the new table
