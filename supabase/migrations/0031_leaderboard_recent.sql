-- Migration: 0031_leaderboard_recent
--
-- 给榜单加一个「近 30 天」的口径:每个账号在过去 30 天里**用 App 收到**的 token 量。
--
-- ── 为什么要这个口径 ────────────────────────────────────────────────────────
-- 现在的榜按 `score` 排,而 score 是**只增不减的累计值**。实测(2026-08-17,20 行):
--   榜首占全站 63.83%,前三名 87.93%,后十名合计 0.229%;
--   第 15 名要追上第 1 名需要约 3,100 倍。
-- 也就是说「多用 → 排名更高 → 项目曝光更多」这个激励,对 20 个人里的 15 个是**假的**
-- —— 他们再怎么用都动不了名次。换成滚动 30 天之后,实测 17/20 都在榜上,而且每个月
-- 重新开始,这句话对所有人同时变成真的。
--
-- ── 坑 1:`insert` 那一笔不是「近 30 天的使用」 ───────────────────────────────
-- history 的写入触发器(0010)记的是 `new.score - old.score`。新用户**首次**同步时,
-- 客户端把本地日志里累积的**全部历史**一次性报上来,于是产生一条巨大的 insert 行。
-- 实测当前 30 天窗口内:insert 13 行合计 104.6 亿,占窗口总量的 33%。
-- 一个用了一年 Claude Code、今天刚装 App 的人,会凭这一笔直接空降第一 —— 而他在这
-- 30 天里一次气泡都没收过。所以本函数**只累加 reason = 'update'**。
-- `backfill`(0011 遗留的管理动作,4 行 66 亿)同样排除,理由相同。
-- 副作用是新用户加入后的第一个月只统计「加入之后」的收成 —— 这正是我们想奖励的东西。
--
-- ── 坑 2:负 delta 是修正,不该让榜变成负数 ───────────────────────────────────
-- update 里实测有 2 行负数(管理修正 / 扣留追回)。它们**参与求和**(否则 100 收进来、
-- 50 被追回,榜上还显示 100,那是不诚实的),但最终结果用 greatest(0, …) 兜底。
--
-- ── 扣留的量不会污染这个榜(已实测确认,不需要额外处理) ───────────────────────
-- 0016 的扣留是把 token **挡在 score 之外**,不是打个标记。实测:
--   Yohann → score 14,105,962 / held_tokens 1,760,558,193
-- 因为 history.delta 追的就是 score 的变化,被扣留的量从来没有进过 delta。
-- 所以「被扣留的账号靠作弊冲上 30 天榜」在构造上就不可能发生 —— 但要注意,这条正确性
-- 依赖「扣留继续挡在 score 之外」这个不变量;哪天改成「先记分再标记」,这个榜会立刻失真。
--
-- ── 为什么读取放在 private 的 definer 函数里,而不是让视图直接查 history ────────
-- `leaderboard_public` 是 security_invoker = true(0028)。security_invoker 视图要求
-- **调用者**对它引用到的每一列都有 SELECT —— 这正是 0025 把整块板子搞挂的原因
-- (撤了列权限又在视图里引用它,访客拿到 42501)。如果视图直接引用
-- public.leaderboard_history,就得给 anon 授权那张表,而那张表是**逐次同步的时间线**,
-- 隐私声明明确拒绝公开这种东西(「一份 5 分钟粒度的记录等同于一份你几点工作、几点睡觉
-- 的日志」)。用 definer 函数把读取关在里面,只回一个聚合数字,anon 永远碰不到那张表。
--
-- 函数放 `private` 而不是 `public`:PostgREST 不暴露 private schema,所以 anon 无法
-- 直接调用它来逐个账号探测。这是 0017 的 private.hold_ratio、0028 的
-- private.project_visible 已经验证过的模式,本文件照抄,不发明新写法。
-- (schema USAGE 早已授予 anon/authenticated —— 0017:128、0028:238。)
--
-- ── 为什么加一列到现有视图,而不是新建一个视图 ────────────────────────────────
-- 项目展示的可见性规则(项目名非空 且 private.project_visible())只应该有一处。
-- 再建一个视图就意味着那套规则要写两遍,而两遍必然会漂移 —— 0025→0026→0028 已经
-- 演示过这个代价。append 一列进去,两个榜共用同一套可见性判断。
--
-- ⚠️ 需在 Supabase SQL Editor 手动执行。幂等,可重复跑。假设 0001–0030 已应用。

-- ── 1. 近 30 天收成(definer,只回一个数) ────────────────────────────────────

create or replace function private.recent_gain(p_user_id uuid)
  returns bigint
  language sql
  security definer
  stable                        -- 依赖 now();now() 在事务内稳定,所以不能是 immutable
  set search_path = ''
as $$
  select greatest(
           0,
           coalesce(sum(h.delta), 0)
         )::bigint
    from public.leaderboard_history h
   where h.user_id = p_user_id
     and h.reason  = 'update'   -- 见文件头「坑 1」:insert/backfill 不是近期使用
     and h.at     >= now() - interval '30 days';
$$;

comment on function private.recent_gain(uuid) is
  '该账号近 30 天用 App 收到的 token 量。只累加 reason=''update''(insert 是首次同步灌入的历史累计,backfill 是管理动作,两者都不是近期使用)。definer 身份读 leaderboard_history,只回聚合值 —— anon 永远拿不到逐次同步的时间线。放在 private:PostgREST 不暴露该 schema,无法被当成逐账号探针。';

revoke all on function private.recent_gain(uuid) from public;
grant execute on function private.recent_gain(uuid) to anon, authenticated, service_role;

-- 走的是 0006:38 建的 leaderboard_history_user_at(user_id, at) 索引。
-- 规模提醒:视图按行调用本函数,按 recent_score 排序时全表都要算一遍。20 行无所谓;
-- 到万级用户时应改成物化视图或定时汇总表,别指望这个写法一直够用。

-- ── 2. 视图追加 recent_score ─────────────────────────────────────────────────
-- 与 0028 第 4 节逐字相同,仅在末尾多一列。create or replace view 要求前面的列
-- 名字/类型/顺序全部不变,所以新列**只能加在最后**。
-- ⚠️ security_invoker = true 必须保留:少了它,0005 的封禁 RLS 就不再作用于访客。

create or replace view public.leaderboard_public
  with (security_invoker = true)
as
select
  l.id,
  l.username,
  l.score,
  l.stage_index,
  l.tree,
  l.region,
  l.trees,
  l.created_at,
  l.updated_at,
  case when v.visible then l.project_name  end as project_name,
  case when v.visible then l.project_desc  end as project_desc,
  case when v.visible then l.project_url   end as project_url,
  case when v.visible then l.project_image end as project_image,
  private.recent_gain(l.user_id)               as recent_score
from public.leaderboard l
cross join lateral (
  select
    nullif(btrim(coalesce(l.project_name, '')), '') is not null
    and private.project_visible(l.user_id) as visible
) v;

comment on view public.leaderboard_public is
  '公开榜单。security_invoker = true,所以 0005 的封禁 RLS 对访客生效。项目四列受
   private.project_visible() 与「项目名非空」双重把关,不该发的行整组发 null。
   recent_score = private.recent_gain():近 30 天用 App 收到的 token 量,给「近 30 天」
   榜排序用;累计榜用 score。两个榜共用本视图,所以可见性规则只有一处。';

-- 视图重建后 anon 的 SELECT 授权不会自动回来,必须重新授一次
-- (0025 忘了 service_role 那次,整个 /ranger 控制台当场全死 —— 这里两个角色一起给)。
grant select on public.leaderboard_public to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ── 3. 部署后自检(逐条跑,别只看「Success」)─────────────────────────────────
--
-- 3.1 anon 仍然读不到原始时间线(必须仍是 42501;能读到就是这次改动漏了权限)
--   -- 用 anon key 跑:
--   -- curl "$URL/rest/v1/leaderboard_history?select=user_id&limit=1" -H "apikey: $ANON"
--
-- 3.2 两个口径并排看,确认 insert 没有污染近 30 天
--   select username, score,
--          (select recent_score from public.leaderboard_public p where p.id = l.id) as recent
--     from public.leaderboard l
--    order by recent desc nulls last
--    limit 20;
--   -- 期望:一个刚加入、score 很高但近 30 天没收过气泡的账号,recent 应该很小或为 0
--
-- 3.3 累计榜没被影响(应当与改动前逐行一致)
--   select id, username, score, project_name from public.leaderboard_public
--    order by score desc limit 20;
--
-- 3.4 项目可见性规则仍然生效(被下架的账号应当四列全 null,recent_score 仍有值 ——
--     下架只藏项目,不藏这个人的名次)
--   select username, project_name, recent_score from public.leaderboard_public
--    where id = (select id from public.leaderboard where user_id = '<被下架的 uid>');
