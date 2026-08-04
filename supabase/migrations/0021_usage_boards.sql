-- Migration: 0021_usage_boards
--
-- 「厂商使用量榜」和「型号使用量榜」的聚合视图,外加一个覆盖率视图。
--
-- ── 三个视图都是**跨用户汇总**,这是刻意的 ─────────────────────────────────────
-- 需求是「所有用户的 claude token 加起来一个数、codex 加起来一个数,厂商之间比」。
-- 不做「点进 claude 看谁用得多」那种逐用户下钻 —— 那个没人要,而且会开一个洞:
--
--   逐用户视图会吐出 floor(tokens × hold_ratio),而**未缩的 tokens 在
--   public.leaderboard_models 上对匿名是可读的**(0015/0017 的列授权里有 tokens)。
--   两个数一除就精确还原出 hold_ratio,再乘 score 就是 raw_score —— 而 0017 第 141 行
--   专门论证过 raw_score 不能公开(它减去 score 就是扣留决定本身)。
--
-- 汇总**本身**不足以挡住它 —— 这是第一版写错的地方。桶里只有一个贡献者时,
-- 「公开的汇总值 ÷ 匿名可读的未缩值」照样把比例除出来,而 model 名是用户可控的:
-- 作弊者随便造一个独一无二的型号名,就保证了自己是那个桶里唯一的人。
-- 按人数抑制小桶也治不了本(现在只有个位数的归属玩家,几乎每个桶都是单人)。
--
-- 所以这三个视图**完全不做扣留缩放**,直接汇总原始 tokens。输出里没有任何
-- hold_ratio 的成分,也就没有什么可以被除出来 —— 它们是一堆公开可读的数字之和,
-- 不含新信息。
--
-- ⚠️ 顺带记录一个**已经存在于线上**的同类泄露(不是本迁移引入的,也不在本迁移的
-- 修复范围内):public.leaderboard_value 是逐用户的,而它的 value_usd 同样是
-- 缩放过的。拿匿名 key 读 leaderboard_models 的未缩 tokens + 读公开的 model_prices,
-- 自己乘一遍再除以公开的 value_usd,同样能还原 hold_ratio。实测可行。
-- 要堵得动 0017 的视图或收回基表列授权,是独立的一件事,单独处理。
--
-- ── 为什么不缩,以及代价 ──────────────────────────────────────────────────────
-- 代价是:被 0016 扣留过的那部分用量,照样计进厂商总量。
--
-- 可以接受,因为这两个榜回答的是「这片树林跑在谁家的模型上」,不是玩家之间的名次。
-- 扣留是针对个人排名的公平机制;一个账号被扣的量摊进全站总量里几乎不动分毫,
-- 而且 0019 的跨行封顶已经把任何账号的模型 token 合计限制在它的分数以内。
-- 拿这点失真换掉一个能还原扣留决定的除法,划算。
--
-- 附带好处:不缩就没有 floor(),三个视图的合计天然严格相等 —— 缩的话每个桶各自
-- 取整,分组越细丢得越多,厂商榜合计会比覆盖率视图的总量小,而文件末尾的对账
-- 查询正是要求它们相等。(以上两点都是 Codex 审查抓的)
--
-- ⚠️ 需在 Supabase SQL Editor 手动执行。幂等,可重复跑。假设 0001–0020 已应用。

-- ── 0. 厂商归属以**我们的价格表**为准,不信客户端报的 ────────────────────────
-- leaderboard_models.provider 是客户端写进来的,0015 的 sanitize 只管字符集。
-- 也就是说任何人都能把自己的行全标成 provider='claude',把 token 挪进 Claude 的
-- 公开总量 —— 分数不动、也不违反 0019 的封顶,厂商榜就这么被改写了。
--
-- model_prices 是服务端控制的(每天从我们自己发布的 pricing.json 同步),它的
-- provider 列可信。所以先用型号名去price表里反查厂商;查不到的型号(新模型、
-- 或纯属编造的名字)才退回客户端报的值,那种行本来也进不了价值榜。
--
-- 只对**去重后的型号名**做这个反查(几百个),不是对十万行逐行做。
create or replace view private.model_vendor
with (security_invoker = true) as
select u.model,
       coalesce(
         (select p.provider from public.model_prices p
          where private.price_key(p.model) = private.price_key(u.model)
          limit 1),
         null) as provider
from (select distinct m.model from public.leaderboard_models m) u;

grant select on private.model_vendor to anon, authenticated, service_role;

-- ── 1. 厂商使用量 ────────────────────────────────────────────────────────────
-- 一行一个厂商。models = 该厂商下有用量的型号数,players = 用过它的人数。
create or replace view public.leaderboard_provider_usage
with (security_invoker = true) as
with per_user as (
  select m.user_id, coalesce(v.provider, m.provider) as provider, sum(m.tokens) as tokens
  from public.leaderboard_models m
  left join private.model_vendor v on v.model = m.model
  group by m.user_id, coalesce(v.provider, m.provider)
),
-- 型号数必须**跨用户**去重数,不能在 per_user 里数完再取 max ——
-- 那算的是「单个用户用过的型号数的最大值」。甲只用 opus-5、乙只用 fable-5 时,
-- 每人各 1 个,max 是 1,而该厂商实际有 2 个型号。
model_counts as (
  select coalesce(v.provider, m.provider) as provider, count(distinct m.model)::int as models
  from public.leaderboard_models m
  left join private.model_vendor v on v.model = m.model
  group by coalesce(v.provider, m.provider)
)
select
  u.provider,
  sum(u.tokens)::bigint                                        as tokens,
  mc.models,
  count(*)::int                                               as players
from per_user u
join model_counts mc on mc.provider = u.provider
group by u.provider, mc.models;

grant select on public.leaderboard_provider_usage to anon, authenticated, service_role;

-- ── 2. 型号使用量 ────────────────────────────────────────────────────────────
-- 一行一个型号。**按 (provider, model) 分组而不是只按 model**:model 名逐字来自
-- 用户本地日志(0015 只保证字符集,不保证语义),同一个字符串完全可能出现在两个
-- 厂商名下。只按 model 分组会把两家的量并进一行,厂商榜与型号榜的合计就对不上。
create or replace view public.leaderboard_model_usage
with (security_invoker = true) as
with per_user as (
  select m.user_id, coalesce(v.provider, m.provider) as provider, m.model, sum(m.tokens) as tokens
  from public.leaderboard_models m
  left join private.model_vendor v on v.model = m.model
  group by m.user_id, coalesce(v.provider, m.provider), m.model
)
select
  u.provider,
  u.model,
  sum(u.tokens)::bigint                                        as tokens,
  count(*)::int                                               as players
from per_user u
group by u.provider, u.model;

grant select on public.leaderboard_model_usage to anon, authenticated, service_role;

-- ── 3. 覆盖率 ────────────────────────────────────────────────────────────────
-- **这个视图是给页面用来自曝其短的,不是装饰。**
--
-- per-model 归属是 2026-07-29 才上线的,只统计「上线之后被收取的气泡」,不回填历史
-- (回填要扫安装前的日志,是隐私问题,已被否决)。所以厂商榜反映的是最近这个窗口,
-- 不是终身用量 —— 实测某账号终身 71% 是 opus-4-8,而窗口内 96.6% 是 opus-5。
-- 不把这个比例摆在界面上,每个老用户看到的都是错误结论,而且错得很有说服力。
--
-- 单行视图。lifetime_tokens 用 leaderboard.score(匿名可读),与 /leaderboard 统计条
-- 的 get_leaderboard_stats() 同源,两个页面的总量不会打架。
-- 必须先 drop:create or replace view 只能在末尾追加列,而 counted_tokens 要插在
-- attributed_tokens 和 lifetime_tokens 中间(三列的口径顺序读起来才对)。
drop view if exists public.leaderboard_attribution;

create view public.leaderboard_attribution
with (security_invoker = true) as
--
-- 两列 token,口径不同,别混用:
--   attributed_tokens  原始合计,与上面两个榜的合计严格相等(文件末尾的对账查询用它)
--   counted_tokens     每个用户先封顶在自己的 score 以内,再求和 —— 覆盖率的分子
--
-- 为什么分子要封顶:去掉缩放之后 leaderboard_models.tokens 是原始值,而 score 是
-- 0016 扣留**之后**的值。直接相除就是拿一个口径的分子去除另一个口径的分母,
-- 被扣的账号能把覆盖率顶到 100% 以上 —— 而这个数字是印在页面上宣称自己诚实的。
-- 逐用户封顶用的两个值(模型合计、score)都是公开可读的,不引入任何新信息,
-- 而且保证比例天然落在 0–1。(Codex 审查抓的)
select
  (select coalesce(sum(m.tokens), 0)::bigint
     from public.leaderboard_models m)                              as attributed_tokens,
  (select coalesce(sum(least(t.tokens, l.score)), 0)::bigint
     from (select m.user_id, sum(m.tokens) as tokens
           from public.leaderboard_models m group by m.user_id) t
     join public.leaderboard l on l.user_id = t.user_id)            as counted_tokens,
  (select coalesce(sum(l.score), 0)::bigint from public.leaderboard l) as lifetime_tokens,
  (select count(distinct m.user_id)::int from public.leaderboard_models m) as players_attributed,
  (select count(*)::int from public.leaderboard l)                        as players_total;

grant select on public.leaderboard_attribution to anon, authenticated, service_role;

-- ── 4. 两个索引 ──────────────────────────────────────────────────────────────
-- 4a. 型号去重与按厂商聚合都要读 user_id(RLS 谓词判封禁要用它)。0015 已有的
--     (model, tokens desc) 里没有 user_id,于是每一行都得回堆表取一次 —— 十万行
--     就是十万次堆访问,索引白建。把 user_id 放进去,RLS 在索引里就判完了。
create index if not exists leaderboard_models_model_user_idx
  on public.leaderboard_models (model, user_id);

-- 4b. 0020 的 resolve_price 第一分支是 `price_key(p.model) = price_key(p_model)`,
--     没有索引就是对 model_prices 顺序扫描、且每行跑一次正则。price_key 是
--     IMMUTABLE,可以直接建表达式索引。价值榜是逐用户逐模型调它的,这个索引
--     直接决定那个视图能不能用。
create index if not exists model_prices_price_key_idx
  on public.model_prices (private.price_key(model));

notify pgrst, 'reload schema';

-- 跑完对一下:
--   select * from public.leaderboard_provider_usage order by tokens desc;
--   select * from public.leaderboard_model_usage order by tokens desc limit 10;
--   select * from public.leaderboard_attribution;
-- 厂商合计必须等于覆盖率视图的 attributed_tokens:
--   select (select sum(tokens) from public.leaderboard_provider_usage) as by_provider,
--          (select sum(tokens) from public.leaderboard_model_usage)    as by_model,
--          (select attributed_tokens from public.leaderboard_attribution) as coverage;
