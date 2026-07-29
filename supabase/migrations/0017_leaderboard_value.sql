-- Migration: 0017_leaderboard_value
--
-- The forest-value board: how much the tokens on a tree are worth in USD.
--
-- ── THE SERVER DOES THE MULTIPLYING, NOT THE CLIENT ──────────────────────────
-- The obvious design is to have the app compute the money at collection time and
-- upload it. That would add one more forgeable field — and an easier one to
-- forge than tokens: 100 tokens paired with $99999 sails past every rule in
-- 0016, because those five all measure token throughput and none of them looks
-- at money. Uploading only tokens keeps cheating confined to the surface that is
-- already watched. It also means no new field leaves the machine, so neither the
-- privacy notice nor the consent dialog changes.
--
-- ── ONE PRICE TABLE FOR EVERYONE, NOT EACH USER'S HISTORICAL RATES ───────────
-- Locking each gain to the price on the day it was collected sounds fairer and
-- is not: two people with identical usage would rank differently because one of
-- them happened to collect before a price cut. A ranking needs a single ruler.
-- The client uses the same rule (garden.value_usd) so the number on the tree and
-- the number on the board agree.
--
-- The cost of this choice, stated plainly: when a vendor cuts prices, everyone's
-- value drops. The alternative costs more — a model with no price yet would be
-- worth $0 forever, and new models appear constantly. Live data at the time of
-- writing: claude-opus-5 had 3e8 collected tokens and no price row.
--
-- ── UNPRICED MODELS COUNT TOKENS, NOT MONEY ──────────────────────────────────
-- A model missing from model_prices contributes nothing to value_usd but still
-- appears on the token board, and `unpriced_tokens` says how much is in that
-- state so a page can render "≥ $X" rather than implying precision. When the
-- price arrives, the history becomes valuable on its own — nothing is stored, so
-- there is nothing to backfill.
--
-- ── KEEPING THE TWO PRICE TABLES IN STEP ─────────────────────────────────────
-- The desktop app refreshes its own copy from tokenforest.com.au/pricing.json;
-- this table is seeded by hand from the same file via 0018. They are the same
-- source but not the same act: after changing pricing.json, regenerate 0018 and
-- run it, or the board keeps ranking on yesterday's rates while every tree
-- already shows today's.
--
-- ⚠️ Must be run by hand in the Supabase SQL Editor. Idempotent — safe to re-run.
-- Assumes 0001–0016 applied. Run 0018 (generated price data) after this.

-- ── 1. Split the cache-write column ──────────────────────────────────────────
-- 0015 stored one cache_write figure. Cache writes are billed at two rates by
-- how long the cache lives — Anthropic's 1-hour tier costs 1.6x the 5-minute one
-- — and on live data the expensive tier is 61% of the volume, so charging it all
-- at the cheap rate understates a tree by about 11%. The client now reports the
-- two separately (reader.MODEL_SLOTS).
--
-- Existing rows are treated as the 5-minute tier: that is what 0015's clients
-- sent, and it is the conservative reading (it can only understate).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'leaderboard_models'
               and column_name = 'cache_write') then
    alter table public.leaderboard_models rename column cache_write to cache_write_5m;
  end if;
end
$$;

alter table public.leaderboard_models
  add column if not exists cache_write_1h bigint not null default 0
    check (cache_write_1h >= 0);

-- 0015 撤掉了表级 SELECT 再按列授回,那份列表里当然没有这两个新名字。不补的话
-- security_invoker 视图会因为基表列无权限而整个查询失败(不是少一列,是直接报错)。
-- 重新按列授权一次,排除的仍然只有 updated_at(它能被轮询出作息,理由见 0015)。
do $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'leaderboard_models'
    and column_name <> 'updated_at';

  execute 'revoke select on public.leaderboard_models from anon, authenticated';
  execute format('grant select (%s) on public.leaderboard_models to anon, authenticated', v_cols);
  -- 写入维持表级:客户端要能写这两个新列。
  execute 'grant insert, update, delete on public.leaderboard_models to anon, authenticated';
end
$$;

-- ── 2. Price table ───────────────────────────────────────────────────────────
-- Same unit as pricing.json: USD per 1,000,000 tokens. Rows are seeded by 0018,
-- which is generated from Token-Forest/src/dashboard/pricing.json — that file is
-- the single source of truth for prices, here and in the desktop app.
create table if not exists public.model_prices (
  model           text primary key,
  provider        text    not null,
  input           numeric not null default 0,
  output          numeric not null default 0,
  cache_read      numeric not null default 0,
  cache_write_5m  numeric not null default 0,
  cache_write_1h  numeric not null default 0
);

alter table public.model_prices enable row level security;

-- Public read: the value board renders in the browser, and per-token prices are
-- published by the vendors anyway — there is nothing here to protect.
drop policy if exists "model_prices_select_public" on public.model_prices;
create policy "model_prices_select_public"
  on public.model_prices for select to anon, authenticated using (true);

grant select on public.model_prices to anon, authenticated;
grant select, insert, update, delete on public.model_prices to service_role;

-- ── 3. Value per account ─────────────────────────────────────────────────────
-- SECURITY INVOKER so the row filters already on the base tables apply unchanged
-- — 0005's bans and 0016's hidden rows included. Note this inherits ROW filters
-- only; the quarantine of individual gains is a column on leaderboard and has to
-- be applied by hand below.
--
-- 名字对齐:客户端查不到精确名时会剥掉版本/日期后缀再查一次(pricing._VERSION_SUFFIX),
-- 服务端若只做精确 join,同一批 token 在本地有价、在榜上无价,两个数字就分叉了。
-- 这里用同一条规则做一次回退 join。
-- 0016 只给 service_role 授了 private 的 USAGE;security_invoker 视图是以调用者身份
-- 跑的,匿名读会直接 permission denied for schema private。函数级的 EXECUTE 不含
-- schema 的 USAGE,两个都要给。
grant usage on schema private to anon, authenticated;

create or replace function private.price_key(p_model text)
  returns text
  language sql
  immutable
as $$
  select regexp_replace(lower(p_model), '-(?:[0-9]{2}-[0-9]{4}|[0-9]{4}|latest)$', '');
$$;

revoke all on function private.price_key(text) from public;
grant execute on function private.price_key(text) to anon, authenticated, service_role;

-- 扣留比例 = 公开分数 / 原始分数。**必须由这个提权函数算,不能在视图里直接读
-- raw_score** —— security_invoker 视图要求调用者对每一个被引用的列都有 SELECT 权限,
-- 而 raw_score 是 0016 刻意不公开的(它减去 score 就是被扣的量,等于把扣留决定
-- 泄露出去)。让函数以 definer 身份读、只回一个比值,原始数字仍然出不去。
--
-- 没有 leaderboard 行(孤儿 model 行)或 raw_score 为 0 时回 1:不缩。宁可不缩,
-- 也不能因为查不到就把一个正常账号的价值抹成 0。
create or replace function private.hold_ratio(p_user_id uuid)
  returns numeric
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select coalesce(
    (select least(l.score::numeric / nullif(l.raw_score, 0), 1)
       from public.leaderboard l where l.user_id = p_user_id),
    1);
$$;

revoke all on function private.hold_ratio(uuid) from public;
grant execute on function private.hold_ratio(uuid) to anon, authenticated, service_role;

-- 扣留过的账号要按同一比例缩价值。0016 只减 leaderboard.score,不动
-- leaderboard_models —— 那份快照是客户端报的全量。若不缩,一个 99% 涨分被扣的账号
-- 仍会以全量出现在价值榜上,绕过整个扣留决定(security_invoker 帮不上忙:
-- leaderboard_models 上没有扣留相关的 RLS 策略可继承)。
--
-- 按比例是**近似**:history 不记模型明细,无法知道被扣的那些 token 属于哪个模型。
-- 诚实账号 ratio = 1 完全无影响;被扣账号按其公开分数占原始分数的比例缩,与 token
-- 榜的处理方向一致。
create or replace view public.leaderboard_value
with (security_invoker = true) as
select
  m.user_id,
  round(coalesce(sum(
    (m.input          * p.input
   + m.output         * p.output
   + m.cache_read     * p.cache_read
   + m.cache_write_5m * p.cache_write_5m
   + m.cache_write_1h * p.cache_write_1h) / 1000000.0
  ) filter (where p.model is not null), 0)
  * private.hold_ratio(m.user_id), 2) as value_usd,
  coalesce(sum(m.tokens) filter (where p.model is null), 0) as unpriced_tokens
from public.leaderboard_models m
left join public.model_prices p on private.price_key(p.model) = private.price_key(m.model)
group by m.user_id;

grant select on public.leaderboard_value to anon, authenticated, service_role;

notify pgrst, 'reload schema';
