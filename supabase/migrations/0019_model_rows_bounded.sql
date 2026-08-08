-- Migration: 0019_model_rows_bounded
--
-- 把 leaderboard_models 的数值锁死在客户端已经被盯着的那个量上。
--
-- ── 这是在补一个我自己开的洞 ─────────────────────────────────────────────────
-- 0017/0018 的设计说明写得很笃定:「美元由服务端算,客户端只传 token,所以作弊者
-- 只能在 token 上作弊,而那已经被 0016 盯着了」。
--
-- 那句话当时是错的。0015 给了 authenticated 对自己那些行的 UPDATE 权限,而**没有
-- 任何约束**要求 input/output/cache_* 加起来等于 tokens,更没有要求它们和账号分数
-- 有任何关系。leaderboard_value 又是直接拿这几列去乘价格的。于是:
--
--     update leaderboard_models set input = 10^15 where user_id = 我;
--
-- 就能得到一个任意大的公开美元值,**而分数一动不动** —— 0016 那五条规则全都只看
-- 分数的增量,一条也不会响。等于把「客户端报美元」这个被否掉的方案,换个入口又实现
-- 了一遍:客户端不报美元,报的是被乘数,而且不设上限。
--
-- ── 两道约束 ─────────────────────────────────────────────────────────────────
-- 1. 行内自洽:五个分档加起来必须等于 tokens。
-- 2. 跨行封顶:一个账号所有模型行的 tokens 合计 <= 它的 raw_score。
--
-- 这两条挡住的是**总量**:分档必须自洽,合计必须封进那个被 0016 盯着的分数。
--
-- ── 它们挡不住什么(必须写清楚,别再重复我之前那个错误论断) ────────────────────
-- 我在 0017/0018 里写过「价值不会比分数更容易伪造」。**那句话是错的**,这里更正。
--
-- 约束只绑定 token 的**数量**,不绑定它的**归属**。总量不变的前提下,把行改成一个
-- 更贵的型号、再把 token 全挪进最贵的那一档,是完全合法的写入 —— RLS 允许,
-- sanitize 允许,上面两条约束也允许,而 leaderboard_value 直接拿这些列去乘价格。
--
-- 写这个迁移时价格表里最便宜的一档 $0.0028/M(deepseek-chat 的 cache_read),
-- 最贵的一档 $180/M(gpt-5.5-pro 的 output),**跨度 64,286 倍**。用生产库里最大的
-- 那个账号实测:它现在的公开价值是 $7.44,把全部 token 重标到最贵档(不违反任何
-- 约束、分数一动不动)可以变成 $2,132,427。
--
-- 结论:**只要归属由客户端自述,公开的价值排名就不可信**,而且它的杠杆是价格跨度,
-- 不是 1 倍。token 榜作弊一分只值一分,价值榜作弊一分能值六万分。
-- 这是设计层面的性质,不是这个迁移能修的 —— 要么公开的价值榜不做(树的估值只给
-- 用户自己看,自己骗自己没有收益),要么接受它是一个「自述」榜单并明说。
--
-- 用 raw_score 而不是 score:score 是扣留之后的公开值,而 leaderboard_value 已经
-- 用 hold_ratio(score/raw_score)缩过一次了。拿 score 封顶等于把同一次扣留罚两遍。
--
-- 没有 leaderboard 行的账号一律封到 0。孤儿模型行照样会出现在 leaderboard_value 里
-- (视图是从 leaderboard_models 出发 group by 的,hold_ratio 查不到行还回 1),
-- 不封的话「不建分数行、只写模型行」就是一条绕过全部审计的路。
--
-- ⚠️ 需在 Supabase SQL Editor 手动执行。幂等,可重复跑。假设 0001–0018 已应用。
-- 写这个迁移时生产库的 7 行全部满足这两条,所以加约束不会失败。

-- ── 0. 清掉本迁移早期版本装过的东西 ─────────────────────────────────────────
-- 这个文件在定稿前改过几版,其中一版装了「分数降了就清模型行」的触发器和一个
-- 想把父行锁提前的 BEFORE 触发器。两个都被证明是错的(前者与模型写入形成相反的
-- 锁序、必然死锁;后者无效,因为 UPDATE 在 BEFORE ROW 触发器之前就锁了目标行)。
-- 跑过中间版本的库里它们还在,而定稿版不再创建它们 —— 不显式删掉的话,那个死锁
-- 会一直留着。无条件 drop,没装过也不会报错。
drop trigger if exists leaderboard_score_trims_model_rows on public.leaderboard;
drop trigger if exists model_rows_lock_account on public.leaderboard_models;
drop function if exists private.trim_model_rows_to_score();
drop function if exists private.lock_account_row();

-- ── 1. 行内自洽 ──────────────────────────────────────────────────────────────
-- 客户端本来就是这么构造的(model_rows 里 tokens = 五档之和),这里只是把那个不变式
-- 落到库上,让它不再依赖客户端的诚实。
alter table public.leaderboard_models
  drop constraint if exists leaderboard_models_slots_sum;

alter table public.leaderboard_models
  add constraint leaderboard_models_slots_sum
  check (input + output + cache_read + cache_write_5m + cache_write_1h = tokens);

-- ── 2. 跨行封顶 ──────────────────────────────────────────────────────────────
create or replace function private.check_model_rows_within_score()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_sum bigint;
  v_cap bigint;
begin
  -- **先锁住这个账号的 leaderboard 行,再算合计。** 少了这把锁,同一个账号并发写
  -- 两个不同模型时,两个事务的延迟触发器都在对方提交之前跑:各自的 sum 只看得见
  -- 已提交的行加自己这行,于是双双放行,提交后的实际合计却超了上限 —— 开着并发
  -- 请求这条路就能把 leaderboard_value 撑起来。
  -- 取行锁把同一账号的写串行化:后到的那个会等前一个提交完,再算的 sum 就包含它了。
  -- 锁的是自己账号那一行,不影响别人;客户端是先传分数、后传模型两次独立请求,
  -- 不存在与分数 upsert 互相等待的环。
  select coalesce(l.raw_score, 0) into v_cap
  from public.leaderboard l
  where l.user_id = new.user_id
  for update;

  select coalesce(sum(m.tokens), 0) into v_sum
  from public.leaderboard_models m
  where m.user_id = new.user_id;

  if v_sum > coalesce(v_cap, 0) then
    raise exception
      'model rows (% tokens) exceed the account score (%)', v_sum, coalesce(v_cap, 0)
      using errcode = 'check_violation';
  end if;

  return null;
end
$$;

revoke all on function private.check_model_rows_within_score() from public;

-- **必须是 DEFERRABLE INITIALLY DEFERRED 的约束触发器,不能是普通 BEFORE 触发器。**
-- 客户端一次 upsert 三十行,触发器逐行触发;普通触发器看到的是「这一行已改、后面几行
-- 还是旧值」的中间态。把用量从 A 模型挪到 B 模型时,先处理 B 就会看到「新 B + 旧 A」,
-- 合计翻倍、误判超限 —— 而最终状态完全合法。延迟到提交时检查,看到的才是最终状态。
--
-- 只管 INSERT / UPDATE:删行只会让合计变小,不可能违反上限。
drop trigger if exists model_rows_within_score on public.leaderboard_models;

create constraint trigger model_rows_within_score
  after insert or update on public.leaderboard_models
  deferrable initially deferred
  for each row
  execute function private.check_model_rows_within_score();

-- ── 3. 分数掉下来时会发生什么 ────────────────────────────────────────────────
-- 分数是客户端报的,可以变小(还原旧存档、模型账被损坏保护清空)。那一刻旧的模型行
-- 还挂在上面,合计可能暂时超过新的 raw_score。
--
-- **这里刻意不加「分数降了就清模型行」的触发器。** 写过一版,然后测出它必然死锁:
-- 那个触发器让分数事务变成「先锁 leaderboard 父行、再删模型行」,而模型事务是
-- 「先改模型行、提交时才锁父行」—— 两条相反的锁序,同一账号并发就成环。
-- (试过把模型侧的父行锁提到 BEFORE 触发器里,没用:PostgreSQL 在 UPDATE 时是先锁住
-- 目标行、再触发 BEFORE ROW 触发器,顺序提不前。本地实测两种写法都能复现死锁。)
--
-- 不加也不会卡死,因为客户端是**先删陈行再写新行**(leaderboard.upsert_model_usage):
-- DELETE 把不在新快照里的行清掉,POST 把剩下的改成新值,提交时的合计就正好等于新快照
-- 的合计,而那个值本来就 <= 新分数。所以下一次同步一定把状态拉回自洽,不存在
-- 「上限降下来之后再也传不上去」的死结。
--
-- 代价是一个最长一个同步周期(30 分钟)的窗口:分数已经降了、模型行还是旧的,
-- 价值榜会略微高报。分数下降本身就罕见,而且这个窗口会自己愈合 —— 拿它换一个
-- 必然发生的死锁不值得。

notify pgrst, 'reload schema';

-- 跑完确认(两个都应为 0):
select (select count(*) from public.leaderboard_models
        where input + output + cache_read + cache_write_5m + cache_write_1h <> tokens)
         as 行内不自洽,
       (select count(*) from (
          select m.user_id, sum(m.tokens) as t
          from public.leaderboard_models m group by m.user_id) s
        where s.t > coalesce((select l.raw_score from public.leaderboard l
                              where l.user_id = s.user_id), 0))
         as 超出分数的账号;
