-- Migration: 0018_model_prices_autosync
--
-- 价格表每天自己从官网同步一次。取代了原来的 0018_model_prices_seed.sql
-- （一份生成出来的 96 行 INSERT,改价要重新生成再手动执行)。
--
-- ── 为什么原来那套是错的 ─────────────────────────────────────────────────────
-- 价格有两个消费者:桌面 App 每天拉 tokenforest.com.au/pricing.json,以及这张表。
-- 种子文件让第二个消费者只能靠人手更新,于是两边必然漂 —— 写这个迁移时实测:
--   App 内置表   96 个模型  _updated=2026-07-22
--   官网发布的   77 个模型  _updated=2026-07-21
--   数据库       0 个(种子从没跑过)
-- 三份都不一样。同一批 token 在树上一个价、在榜上另一个价,而且没人会发现。
--
-- 现在数据库直接读 App 读的那个 URL。**同一个文件,同一批字节**,不存在第三份副本,
-- 也没有「改完价还要记得跑 SQL」这一步。
--
-- ── 为什么用 www 那个域名 ────────────────────────────────────────────────────
-- tokenforest.com.au/pricing.json 会 301 跳到 www.tokenforest.com.au/pricing.json,
-- 而 pgsql-http 默认**不跟随重定向** —— 直接用裸域名会拿到 58 字节的跳转页,
-- 解析失败。所以 URL 必须写 301 之后的终点(www 那个)。
-- 想「开启跟随重定向」是行不通的:pgsql-http 只允许运行时设置白名单内的 curl 选项,
-- CURLOPT_FOLLOWLOCATION 不在里面,设它会直接报错。好在真跳转了也不会静默 ——
-- 301 过不了 status = 200 的判断,会以「HTTP 301」记进 last_error。
--
-- ── 执行顺序是刻意排的 ───────────────────────────────────────────────────────
-- 不依赖扩展的东西全部先建(状态表、校验、写入函数),两个扩展的安装各自包在
-- 异常捕获里,失败只记录不中断。原因是这个文件的第一版把 `create extension` 放在
-- 第一行且不设防:它一失败,SQL Editor 的整段事务回滚,连状态表都没留下,
-- 跑完屏幕上什么都没有 —— 看起来和成功一模一样。
--
-- 同理,结果一律用 **select 返回成行**,不用 RAISE NOTICE:Supabase 的 SQL Editor
-- 不显示 NOTICE。
--
-- ⚠️ 需在 Supabase SQL Editor 手动执行。幂等,可重复跑。假设 0001–0017 已应用。
-- 跑完看最后两行结果。

-- ── 1. 同步状态 ──────────────────────────────────────────────────────────────
-- 最先建,因为后面每一步的失败原因都要往这里写。
-- 存在的意义是**可观测**:定时任务失败是静默的,没有这张表,价格停在三个月前
-- 也没人知道。
create table if not exists public.model_prices_sync (
  id               smallint primary key default 1 check (id = 1),
  last_attempt_at  timestamptz,
  last_success_at  timestamptz,
  source_updated   text,     -- pricing.json 里的 _updated
  model_count      int,
  last_error       text,     -- 抓取/写入失败的原因
  schedule_error   text      -- 排程失败的原因(与上面**分开**,见下)
);

-- 排程错误必须独立成列,不能和 last_error 共用一格:两者的生命周期不一样。
-- 定时任务排不上是长期状态,而一次成功的同步会把 last_error 清掉 —— 共用一格的话,
-- 「没有定时任务」会被紧随其后的首次同步成功伪装成健康,然后价格从此再不更新。
alter table public.model_prices_sync add column if not exists schedule_error text;

insert into public.model_prices_sync (id) values (1) on conflict (id) do nothing;

alter table public.model_prices_sync enable row level security;

-- 公开只读三列:页面要能显示「价格更新于 X」。last_error / last_attempt_at 不公开 ——
-- 前者可能带上游报错细节,后者能被轮询出定时任务的作息。列级 GRANT 的手法与 0015 一致
-- (RLS 只能管行,管不了列)。
drop policy if exists "model_prices_sync_select_public" on public.model_prices_sync;
create policy "model_prices_sync_select_public"
  on public.model_prices_sync for select to anon, authenticated using (true);

revoke select on public.model_prices_sync from anon, authenticated;
grant select (id, last_success_at, source_updated, model_count)
  on public.model_prices_sync to anon, authenticated;
grant select, insert, update on public.model_prices_sync to service_role;

-- ── 2. 把 pricing.json 摊平成行 ──────────────────────────────────────────────
-- 入参的每个 value 都必须已经确认是 object(调用方 apply_model_prices 先校验再传)。
-- 为什么校验不能写在这里:jsonb_each() 遇到标量会直接报错,而把
-- `where jsonb_typeof(value) = 'object'` 和 lateral jsonb_each(value) 写在同一个
-- 查询里并不安全 —— 子查询会被上拉,过滤条件不保证在函数求值之前生效。
-- 所以校验放在**上一条语句**里做,这里只管摊平。
--
-- 费率只读 5 个已知键,不遍历 rate 对象:jsonb 的 -> 和 ? 作用在标量上返回
-- NULL/false 而不报错,所以哪怕某个型号写成了字符串也不会炸,只会被校验挑出来。
create or replace function private.price_rows(p_providers jsonb)
  returns table (provider text, model text, rate jsonb)
  language sql
  immutable
  set search_path = ''
as $$
  select p.key, lower(m.key), m.value
  from jsonb_each(p_providers) p
  cross join lateral jsonb_each(p.value) m
$$;

revoke all on function private.price_rows(jsonb) from public;
grant execute on function private.price_rows(jsonb) to service_role;

-- ── 3. 写入:校验通过才整表替换 ──────────────────────────────────────────────
-- 与 HTTP 分开是有意的,而且这次真派上用场了:
--   * 这个函数不依赖任何扩展,http 装不上它照样能建、能用;
--   * 能单独调用,拿真实 payload 测,不依赖网络能不能通;
--   * 外面(官网的定时任务)可以直接 RPC 调它把价格推进来,SQL 一行都不用改。
--
-- 整表替换而不是 upsert:厂商下线的型号要跟着消失,否则价值榜会一直按一个已经
-- 不存在的型号的旧价计费。整个函数跑在一个事务里,所以 delete+insert 是原子的 ——
-- 中途任何一步失败,旧价格原封不动。
create or replace function public.apply_model_prices(p_payload jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_providers jsonb;
  v_updated   text;
  v_rows      int;
  v_bad       int;
  v_distinct  int;
  v_shape     int;
  v_missing   int;
  v_keys      text[] := array['input', 'output', 'cache_read', 'cache_write_5m', 'cache_write_1h'];
  v_err       text;
begin
  -- 单一出口:所有校验先写进 v_err,最后统一「落库 + 返回」。
  -- 不用早退,是因为这个函数会被**外部直接调用**(http 装不上时的后备路径就是官网
  -- 定时 RPC 调它)。早退的那些分支一行状态都不写,于是一个坏 payload 让状态表看起来
  -- 「什么都没发生」,而不是「失败了」—— 这张表存在的全部意义就是让失败看得见。
  update public.model_prices_sync set last_attempt_at = now() where id = 1;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    v_err := 'payload 不是 JSON 对象';
  end if;

  v_updated := nullif(p_payload->>'_updated', '');

  -- 根层的非 _ 键必须**全部**是对象。这里必须是「拒绝」而不是「过滤掉」:
  -- 假如 claude 那一项被改坏成标量或数组,过滤会让整个厂商无声消失,而剩下的
  -- 七十多个型号照样过得了下面 20 的下限 —— 于是整表替换执行、Claude 全线价格
  -- 被删光、状态表还写着「同步成功」。价格表的错误必须是响的。
  if v_err is null then
    select count(*) into v_bad
    from jsonb_each(p_payload) e
    where left(e.key, 1) <> '_'
      and jsonb_typeof(e.value) <> 'object';

    if v_bad > 0 then
      v_err := '有 ' || v_bad || ' 个厂商的值不是对象,拒绝替换(整个厂商会被丢掉)';
    end if;
  end if;

  -- 空厂商块是同一个陷阱换了个入口:`"claude": {}` 是合法对象,能过上面那关,
  -- 却一行都产不出来;剩下七十多个型号照样过 20 的下限,于是 Claude 全线价格被删,
  -- 状态表写着「成功」。厂商在表里出现,就必须至少带一个型号。
  if v_err is null then
    select count(*) into v_bad
    from jsonb_each(p_payload) e
    where left(e.key, 1) <> '_'
      and e.value = '{}'::jsonb;

    if v_bad > 0 then
      v_err := '有 ' || v_bad || ' 个厂商一个型号都没有,拒绝替换(它的价格会被整片删掉)';
    end if;
  end if;

  -- 筛选单独一条语句做,理由见第 2 节。经过上面的检查,这里不会丢任何东西。
  if v_err is null then
    select jsonb_object_agg(e.key, e.value)
      into v_providers
    from jsonb_each(p_payload) e
    where left(e.key, 1) <> '_';

    if v_providers is null then
      v_err := 'payload 里没有任何厂商';
    end if;
  end if;

  -- 一条语句同时数出:总行数、形状坏的、缺必需键的、费率坏的、归一化去重后的数量。
  --
  -- 查重必须按 **归一化后的键**,不是原始型号名。leaderboard_value 是用
  -- private.price_key(p.model) = private.price_key(m.model) 做 join 的,它会剥掉
  -- -latest / -YYYY / -MM-YYYY 后缀。于是 'claude-opus-5' 和 'claude-opus-5-latest'
  -- 两个原始名不同、主键不冲突,却归一化成同一个键 —— 同一批 token 会 join 到两行
  -- 价格,那个账号的估值直接翻倍。厂商发 -latest 别名是常事,剥后缀的规则本来就是
  -- 为这种名字存在的,所以这不是假想。
  -- 按归一化键查重同时也覆盖了原始名重复(原始名撞了,键必然也撞)。
  if v_err is null then
    select count(*),
           count(*) filter (where r.shape <> 'object'),
           count(*) filter (where r.missing),
           count(*) filter (where r.bad),
           count(distinct private.price_key(r.model))
      into v_rows, v_shape, v_missing, v_bad, v_distinct
    from (
      select pr.model,
             jsonb_typeof(pr.rate) as shape,
             -- input / output 是必需的,缓存那三个可选(实测 96 个型号里 19 个只有
             -- input+output,codex 全系没有 cache_write)。为什么缺了要拒绝而不是当 0:
             -- **价格为 0 比查不到价更糟**。查不到价的型号进 unpriced_tokens,页面显示
             -- 成「≥ $X」,人看得见;而写着 0 的型号是「已定价」,它的 token 静悄悄
             -- 值 $0,没有任何地方会提示。
             not (pr.rate ? 'input' and pr.rate ? 'output') as missing,
             exists (
               select 1
               from unnest(v_keys) k
               where pr.rate ? k
                 -- 必须用 CASE 而不是 `typeof <> 'number' or (…)::numeric < 0`:
                 -- SQL 的 OR **不保证短路**,右边照样可能被求值,于是费率写成字符串时
                 -- 这里不是返回一条干净的错误信息,而是直接 cast 报错炸掉整个函数。
                 and case jsonb_typeof(pr.rate->k)
                       when 'number' then (pr.rate->k)::numeric < 0
                       else true
                     end
             ) as bad
      from private.price_rows(v_providers) pr
    ) r;

    -- 下限 20:防的是「文件被截断/被换成占位内容」时把整张价格表清空,那会让所有人
    -- 的价值一夜归零。当前是 96 个型号、12 个厂商;砍到只剩 claude+codex 也有 26 个。
    if v_shape > 0 then
      v_err := '有 ' || v_shape || ' 个型号的费率不是对象,拒绝替换';
    elsif v_missing > 0 then
      v_err := '有 ' || v_missing || ' 个型号缺 input 或 output;缺了会被当成 $0 计价,'
               || '而不是「未定价」,页面上看不出任何异常';
    elsif v_bad > 0 then
      v_err := v_bad || ' 个型号的费率不是非负数字';
    elsif v_rows <> v_distinct then
      v_err := '有 ' || (v_rows - v_distinct) || ' 个型号归一化后重名(price_key 会剥掉 '
               || '-latest/-YYYY 后缀);写进去会让价值榜把同一批 token 乘两次';
    elsif v_rows < 20 then
      v_err := '只解析出 ' || v_rows || ' 个型号,低于下限 20,拒绝替换(疑似文件损坏)';
    end if;
  end if;

  if v_err is not null then
    update public.model_prices_sync set last_error = v_err where id = 1;
    return jsonb_build_object('ok', false, 'error', v_err);
  end if;

  delete from public.model_prices;

  insert into public.model_prices
    (model, provider, input, output, cache_read, cache_write_5m, cache_write_1h)
  select pr.model,
         pr.provider,
         coalesce((pr.rate->>'input')::numeric, 0),
         coalesce((pr.rate->>'output')::numeric, 0),
         coalesce((pr.rate->>'cache_read')::numeric, 0),
         coalesce((pr.rate->>'cache_write_5m')::numeric, 0),
         coalesce((pr.rate->>'cache_write_1h')::numeric, 0)
  from private.price_rows(v_providers) pr;

  update public.model_prices_sync
     set last_success_at = now(),
         source_updated  = v_updated,
         model_count     = v_rows,
         last_error      = null
   where id = 1;

  return jsonb_build_object('ok', true, 'models', v_rows, 'source_updated', v_updated);
end
$$;

revoke all on function public.apply_model_prices(jsonb) from public;
grant execute on function public.apply_model_prices(jsonb) to service_role;

-- ── 4. 装 http 扩展(失败不中断) ────────────────────────────────────────────
-- 装不上只是没有「自动抓取」;上面的 apply_model_prices 照常可用,官网那侧可以
-- 定时 RPC 调它把价格推进来。原因写进状态表,由文件末尾的 select 显示出来。
do $ext$
begin
  execute 'create extension if not exists http with schema extensions';
exception when others then
  -- SQL Editor 里的 postgres 不是超级用户,装不了非 trusted 扩展是常态;
  -- 控制台 Database → Extensions 那个开关走的是提权路径,开完重跑本迁移即可。
  update public.model_prices_sync
     set last_error = 'http 扩展装不上(' || sqlerrm
                      || ');请在控制台 Database → Extensions 打开它再重跑本迁移'
   where id = 1;
end
$ext$;

-- ── 5. 抓取 + 写入 ───────────────────────────────────────────────────────────
-- 必须动态建:函数体里声明了 extensions.http_response,没有扩展时 CREATE FUNCTION
-- 本身就会失败(plpgsql 在建函数时就校验声明的类型),那会把整段迁移拖垮。
--
-- **不抛异常**,失败也返回 jsonb。原因很实际:抛异常会回滚整个事务,连同刚写进
-- model_prices_sync.last_error 的那行一起回滚 —— 于是失败原因永远存不下来,
-- 每天静默失败一次而状态表一片空白。返回值 + 落库,才看得见。
--
-- URL 是写死的,不是参数:参数化就等于给 service_role 开了一个 SSRF 入口。
do $mk$
begin
  if not exists (select 1 from pg_extension where extname = 'http') then
    return;
  end if;

  execute $sql$
    create or replace function public.sync_model_prices()
      returns jsonb
      language plpgsql
      security definer
      set search_path = ''
    as $fn$
    declare
      v_url  text := 'https://www.tokenforest.com.au/pricing.json';
      v_res  extensions.http_response;
      v_body jsonb;
      v_ret  jsonb;
    begin
      update public.model_prices_sync set last_attempt_at = now() where id = 1;

      -- 设选项和发请求放在**同一个**异常块里。分开写过一次,结果 http_set_curlopt
      -- 报错落在捕获范围之外,直接把整段迁移的事务带走了 —— 抓取这一步的任何失败都
      -- 只该记录、不该抛。
      begin
        -- pgsql-http 只允许运行时设置一个白名单内的 curl 选项,CURLOPT_TIMEOUT 在,
        -- CURLOPT_FOLLOWLOCATION **不在**(设它会直接报错)。所以跟随重定向这条路没有,
        -- URL 必须写 301 之后的终点(www 那个)。真跳转了也不会静默:301 过不了下面
        -- status = 200 的判断,会以「HTTP 301」记进 last_error。
        perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');
        select * into v_res from extensions.http_get(v_url);
      exception when others then
        v_ret := jsonb_build_object('ok', false, 'error', '请求失败: ' || sqlerrm);
        update public.model_prices_sync set last_error = v_ret->>'error' where id = 1;
        return v_ret;
      end;

      if v_res.status <> 200 then
        v_ret := jsonb_build_object('ok', false, 'error', 'HTTP ' || v_res.status);
        update public.model_prices_sync set last_error = v_ret->>'error' where id = 1;
        return v_ret;
      end if;

      begin
        v_body := v_res.content::jsonb;
      exception when others then
        v_ret := jsonb_build_object('ok', false, 'error', 'JSON 解析失败: ' || sqlerrm);
        update public.model_prices_sync set last_error = v_ret->>'error' where id = 1;
        return v_ret;
      end;

      -- 每次都完整校验并重写,不做「_updated 没变就跳过」的优化。
      -- _updated 只到天:同一天里发现写错了再发一版,日期是一样的,跳过就意味着修正
      -- 要等到第二天才生效,而状态表当天还一直报「同步成功」。96 行的表重写一次的
      -- 代价可以忽略,拿它换一个会撒谎的快捷路径不值。
      -- 失败时的 last_error 由 apply_model_prices 自己写(它是单一出口),这里不重复。
      return public.apply_model_prices(v_body);
    end
    $fn$;
  $sql$;

  execute 'revoke all on function public.sync_model_prices() from public';
  execute 'grant execute on function public.sync_model_prices() to service_role';
end
$mk$;

-- ── 6. 每天一次(失败不中断) ────────────────────────────────────────────────
-- 04:17 UTC。挑一个不整的分钟,避开整点那一堆定时任务。
-- pg_cron >= 1.4 的 cron.schedule(name, ...) 按任务名 upsert,所以重复执行本迁移
-- 不会堆出一串重复任务。
do $cron_setup$
begin
  if not exists (select 1 from pg_extension where extname = 'http') then
    update public.model_prices_sync
       set schedule_error = '没有 http 扩展,无抓取函数可排程'
     where id = 1;
    return;
  end if;
  execute 'create extension if not exists pg_cron';
  execute 'grant usage on schema cron to postgres';
  perform cron.schedule('sync-model-prices', '17 4 * * *',
                        'select public.sync_model_prices()');
  update public.model_prices_sync set schedule_error = null where id = 1;
exception when others then
  update public.model_prices_sync
     set schedule_error = 'pg_cron 排程失败:' || sqlerrm
   where id = 1;
end
$cron_setup$;

-- ── 7. 立刻同步一次 ──────────────────────────────────────────────────────────
-- 动态调用,理由同第 5 节:http 装不上时函数根本不存在,静态引用会让整段解析失败。
do $init$
declare
  v jsonb;
begin
  if exists (select 1 from pg_extension where extname = 'http') then
    -- 兜一层:sync_model_prices 设计上不抛异常,但它调用的是扩展,而扩展的行为
    -- 由平台版本决定(CURLOPT 白名单就是这么炸的)。这里再兜一次,保证首次同步
    -- 无论如何都不会把上面已经建好的一整套 schema 回滚掉。
    begin
      execute 'select public.sync_model_prices()' into v;
    exception when others then
      update public.model_prices_sync
         set last_error = '首次同步异常:' || sqlerrm
       where id = 1;
    end;
  else
    update public.model_prices_sync
       -- 只在上一步没写过原因时才写:装扩展失败的具体报错更有价值,别把它盖掉,
       -- 那条消息里已经带了同样的修法。
       set last_error = coalesce(last_error,
             'http 扩展不可用 —— 到 Supabase 控制台 Database → Extensions 打开 http'
             || '(和 pg_cron)再重跑本迁移(幂等);'
             || '不想开扩展就让官网定时 RPC 调 apply_model_prices() 推价格')
     where id = 1;
  end if;
end
$init$;

notify pgrst, 'reload schema';

-- ── 跑完看这一行 ─────────────────────────────────────────────────────────────
select (select count(*) from public.model_prices)                        as 价格行数,
       (select source_updated from public.model_prices_sync where id = 1) as 来源日期,
       (select last_error     from public.model_prices_sync where id = 1) as 同步错误,
       (select schedule_error from public.model_prices_sync where id = 1) as 排程错误,
       exists (select 1 from pg_extension where extname = 'http')         as http已装,
       exists (select 1 from pg_extension where extname = 'pg_cron')      as 定时已启用;

-- 之后随时查:
--   select * from public.model_prices_sync;
--   select * from cron.job where jobname = 'sync-model-prices';
--   select * from cron.job_run_details where jobname = 'sync-model-prices'
--     order by start_time desc limit 5;
