-- Migration: 0020_price_family_fallback
--
-- 查不到价的模型,退而用**同系列上一个版本**的价。
--
-- ── 为什么要做 ───────────────────────────────────────────────────────────────
-- 厂商发新版永远比价格表更新快。实测:生产库里最大的那个账号有 4.45 亿已收取 token
-- 记在 claude-opus-5 名下,占它整棵树的 98%,而价格表里只到 claude-opus-4-8 ——
-- 于是它的公开价值是 $7.44。不是算错,是「新版本还没定价」这件事把整个价值榜
-- 变成了噪声。
--
-- 加上回退之后同一棵树是 $582.21,未定价 token 归零。
--
-- ── 规则 ─────────────────────────────────────────────────────────────────────
--   1. 精确匹配(price_key,会剥 -latest / -YYYY 这类后缀);
--   2. 同系列、**版本更低**的那些里挑最新的一个;
--   3. 还是没有 -> 不计价,照旧只进 unpriced_tokens。
--
-- 只往低版本方向退。全新系列没有可信参照,宁可不计价 —— 这也是用户定的规矩:
-- 「opus 从 4.8 升到 5,5 查不到价就按 4.8 算;出了个全新的 XXXXX 就不计价。」
--
-- ── 系列/版本怎么切 ──────────────────────────────────────────────────────────
-- 版本 = 名字里第一段「数字(可含 . 或 - 分隔)」,**后面不能紧挨字母数字**。
-- 挖掉版本、折叠连字符,剩下的就是系列。
--
--   claude-opus-4-8   -> 系列 'claude-opus-'  版本 [4,8]
--   claude-opus-5     -> 系列 'claude-opus-'  版本 [5]      → 回退命中 4-8
--   ministral-3b      -> 系列 'ministral-3b'  版本 (无)
--   moonshot-v1-128k  -> 系列 'moonshot-v-128k'  版本 [1]   (128k 后紧跟字母,不算版本)
--   command-r7b       -> 系列 'command-r7b'      版本 (无)
--
-- 只卡后面、不卡前面,是拿真实的 96 个型号名试出来的:
--   * 卡后面挡住「参数量」和「上下文长度」—— ministral-3b 的 "3"、command-r7b 的 "7"、
--     glm-32b-128k 的 "32"/"128" 后面都紧跟字母,于是整个不带版本、不参与回退。
--     没有这条,ministral-12b 查不到价会去拿 8b 的价,那是另一个模型的钱。
--   * **不卡前面**,因为一大批厂商把版本贴在字母后:minimax-m3、kimi-k3、
--     deepseek-v4-flash、mimo-v2.5、qwen3-max、moonshot-v1-128k。卡了的话
--     minimax-m4 上市时认不出它是 m3 的新版,回退失效。
--
-- 版本段用 numeric 而不是 int:型号名允许 64 个字符(0015 的字符集约束),
-- 'claude-opus-999999999999999999999' 是合法输入,而它会让 ::int[] 抛
-- 「integer out of range」—— leaderboard_value 是公开视图,一行这样的数据就能
-- 让所有人的价值榜查询整个失败。numeric 没有这个上限,也正好和客户端 Python
-- 的无限精度整数对齐。(两条都是 Codex 审查抓的)
--
-- ⚠️ 客户端有一份等价实现(dashboard/pricing.py 的 _family_version / _rate_for)。
-- **两边必须一字不差**,否则同一批 token 在树上和榜上会算出不同的钱 —— 而「两个
-- 数字一致」是这个功能对用户的承诺。改一边就要改另一边。
--
-- ⚠️ 需在 Supabase SQL Editor 手动执行。幂等,可重复跑。假设 0001–0019 已应用。

-- ── 1. 系列与版本 ────────────────────────────────────────────────────────────
-- price_ver 的返回类型从 int[] 改成了 numeric[](见下面溢出那段),而
-- create or replace function 改不了返回类型,必须先 drop。依赖链是
-- leaderboard_value -> resolve_price -> price_ver,视图对函数的 LATERAL 引用是被
-- 真实追踪的,所以要从视图开始按顺序拆。跑过本迁移早期版本的库靠这几行完成升级;
-- 没跑过也无害。视图在第 3 节重建。
-- 依赖 price_ver 的东西有三样,都要先拆:视图 -> resolve_price、以及 1b 节那个
-- 表达式唯一索引。少拆一样,重跑本迁移就会在 drop function 那里失败。
drop view if exists public.leaderboard_value;
drop index if exists public.model_prices_family_version_uniq;
drop function if exists private.resolve_price(text);
drop function if exists private.price_ver(text);

-- **先过 price_key 剥掉 -latest / -YYYY 这类别名后缀,再拆系列。** 少了这一步,
-- claude-opus-5-latest 的系列会算成 'claude-opus-latest',和 claude-opus-4-8 的
-- 'claude-opus-' 对不上,回退整个失效 —— 而客户端是剥了的,于是同一批 token
-- 在树上有价、在榜上无价。请求端和价格表两边都要剥。
create or replace function private.price_family(p_model text)
  returns text
  language sql
  immutable
  set search_path = ''
as $$
  select regexp_replace(
           regexp_replace(private.price_key(coalesce(p_model, '')),
                          -- **不加 'g'**:只挖第一段版本。客户端用的是 search() + 单次切除,
                          -- 全局替换会连后面的日期段一起挖掉 —— glm-5-32b-0415-128k
                          -- 客户端算成 glm-32b-0415-128k、服务端算成 glm-32b-128k,
                          -- 于是服务端会拿一个不相干的旧版价去顶。
                          '[0-9]+(?:[.-][0-9]+)*(?![a-z0-9])', ''),
           '-+', '-', 'g');
$$;

-- 回数组而不是文本:文本比较会把 '4-10' 排在 '4-8' 前面。数组是逐元素比,
-- 且短的小于长的([5] < [5,1]),与客户端的 Python 元组比较语义一致。
-- 名字里没有版本段时回 null,调用方据此跳过回退。
create or replace function private.price_ver(p_model text)
  returns numeric[]
  language sql
  immutable
  set search_path = ''
as $$
  select case
    when v is null then null
    else string_to_array(regexp_replace(v, '[.-]', ',', 'g'), ',')::numeric[]
  end
  -- 同样先过 price_key:claude-opus-5-latest 不剥的话 '5' 后面紧跟 '-latest',
  -- 版本仍能取到 [5],但系列会错开 —— 两个函数必须在同一个字符串上工作。
  from (select substring(private.price_key(coalesce(p_model, ''))
                from '([0-9]+(?:[.-][0-9]+)*)(?![a-z0-9])') as v) t;
$$;

revoke all on function private.price_family(text) from public;
revoke all on function private.price_ver(text) from public;
grant execute on function private.price_family(text) to anon, authenticated, service_role;
grant execute on function private.price_ver(text) to anon, authenticated, service_role;

-- ── 1b. 同一个「系列+版本」不许出现两次 ─────────────────────────────────────
-- 0018 的 apply_model_prices 已经按 price_key 查过重,但那抓不到这一类:
-- 'foo-4-8' 和 'foo-4.8' 的 price_key 不同、主键也不冲突,拆出来的系列和版本却完全
-- 一样。之后 'foo-5' 回退时就有两行并列可选 —— 客户端保留先出现的、服务端的
-- order by 没有 tie-break,两边可能选到不同的价,树上和榜上的钱就对不上。
--
-- 与其定一个仲裁规则,不如让这种表根本存不进来。用表达式唯一索引而不是往
-- apply_model_prices 里再加一段校验:那要把一百多行函数原样复制到这个迁移里,
-- 两份必然漂。索引是声明式的,而且对**所有**写入路径都生效。
--
-- 版本为 null 的行(ministral-3b 这类)排除在外:它们的系列就是完整名字,
-- 想撞车得先撞主键。
--
create unique index if not exists model_prices_family_version_uniq
  on public.model_prices (private.price_family(model), private.price_ver(model))
  where private.price_ver(model) is not null;

-- ── 1c. 让 apply_model_prices 的异常也能落库 ────────────────────────────────
-- 上面那个索引带来一个新的失败路径:真撞上时 INSERT 抛 unique_violation,而不是像
-- 别的校验那样回一条干净的 jsonb。异常会穿过 sync_model_prices 冒出去,**连同刚写进
-- model_prices_sync.last_error 的那行一起回滚** —— 于是每日任务失败了,而状态表
-- 一片空白。这正是 0018 那一整套设计要消灭的东西,不能在这里重新引入。
--
-- 做法是给它套一层异常包装,而**不是**把那一百多行校验复制到这个迁移里(复制必漂):
-- 先用 ALTER FUNCTION RENAME 把原函数原封不动挪进 private 当内核 —— 重命名保留
-- 函数体,一行都不用抄 —— 再建一个同名薄包装。
--
-- 包住的是任何意料之外的异常,不只是这一个索引。sync_model_prices 不用改。
do $core$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'apply_model_prices_core'
  ) then
    alter function public.apply_model_prices(jsonb) rename to apply_model_prices_core;
    alter function public.apply_model_prices_core(jsonb) set schema private;
  end if;
end
$core$;

revoke all on function private.apply_model_prices_core(jsonb) from public;

create or replace function public.apply_model_prices(p_payload jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_ret jsonb;
begin
  begin
    v_ret := private.apply_model_prices_core(p_payload);
  exception when others then
    -- 内核那一层的 delete+insert 在这个子事务里回滚,旧价格原样保留;
    -- 外层事务还活着,所以下面这行错误记得住。
    v_ret := jsonb_build_object('ok', false, 'error', '写入异常: ' || sqlerrm);
  end;

  if not coalesce((v_ret->>'ok')::boolean, false) then
    update public.model_prices_sync
       set last_attempt_at = now(), last_error = v_ret->>'error'
     where id = 1;
  end if;

  return v_ret;
end
$$;

revoke all on function public.apply_model_prices(jsonb) from public;
grant execute on function public.apply_model_prices(jsonb) to service_role;

-- ── 2. 解析一个模型该用哪一行价 ──────────────────────────────────────────────
-- 回一行,带 exact 标记(true = 精确命中,false = 靠同系列旧版估的)。
-- 不按 provider 过滤:系列名本身带厂商前缀(claude-opus / gpt / glm …),跨厂商撞名
-- 不会发生;而 leaderboard_models.provider 存的是 CLI 来源、不是价格表的分组名,
-- 拿它过滤反而会和客户端不一致。
create or replace function private.resolve_price(p_model text)
  returns table (input numeric, output numeric, cache_read numeric,
                 cache_write_5m numeric, cache_write_1h numeric, exact boolean)
  language sql
  stable
  set search_path = ''
as $$
  select t.input, t.output, t.cache_read, t.cache_write_5m, t.cache_write_1h, t.exact
  from (
    select p.input, p.output, p.cache_read, p.cache_write_5m, p.cache_write_1h,
           true as exact, 0 as pref, null::numeric[] as v
    from public.model_prices p
    where private.price_key(p.model) = private.price_key(p_model)

    union all

    select p.input, p.output, p.cache_read, p.cache_write_5m, p.cache_write_1h,
           false, 1, private.price_ver(p.model)
    from public.model_prices p
    where private.price_family(p.model) = private.price_family(p_model)
      and private.price_ver(p.model) is not null
      and private.price_ver(p_model) is not null
      and private.price_ver(p.model) < private.price_ver(p_model)
  ) t
  order by t.pref, t.v desc
  limit 1;
$$;

revoke all on function private.resolve_price(text) from public;
grant execute on function private.resolve_price(text) to anon, authenticated, service_role;

-- ── 3. 价值视图改用它 ────────────────────────────────────────────────────────
-- 多一列 estimated_usd:回退定价出来的那部分钱。加上回退之后 unpriced_tokens 会
-- 接近 0,「这个数字是估的」这件事就没有任何地方看得出来了 —— 除非单独报出来。
-- 页面可以据此显示成「$582(其中 $575 为估算)」而不是假装精确。
--
-- 其余语义与 0017 一致:security_invoker 继承基表的封禁过滤;hold_ratio 缩放扣留账号。
-- 视图已在文件开头 drop 掉(那里要先拆依赖链)。这里直接建。
-- 顺带一提,即便没有依赖链的事,也必须 drop 而不能 create or replace:
-- 后者只能在末尾追加列,而 estimated_usd 要排在 unpriced_tokens 前面。
-- drop 会连带丢掉授权,下面立刻补回。
create view public.leaderboard_value
with (security_invoker = true) as
select
  m.user_id,
  round(coalesce(sum(
    (m.input          * p.input
   + m.output         * p.output
   + m.cache_read     * p.cache_read
   + m.cache_write_5m * p.cache_write_5m
   + m.cache_write_1h * p.cache_write_1h) / 1000000.0
  ), 0) * private.hold_ratio(m.user_id), 2) as value_usd,
  round(coalesce(sum(
    (m.input          * p.input
   + m.output         * p.output
   + m.cache_read     * p.cache_read
   + m.cache_write_5m * p.cache_write_5m
   + m.cache_write_1h * p.cache_write_1h) / 1000000.0
  ) filter (where not p.exact), 0) * private.hold_ratio(m.user_id), 2) as estimated_usd,
  coalesce(sum(m.tokens) filter (where p.input is null), 0) as unpriced_tokens
from public.leaderboard_models m
left join lateral private.resolve_price(m.model) p on true
group by m.user_id;

grant select on public.leaderboard_value to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- 跑完对一下(应与客户端 garden.value_usd() 逐分一致):
--   select * from public.leaderboard_value order by value_usd desc;
