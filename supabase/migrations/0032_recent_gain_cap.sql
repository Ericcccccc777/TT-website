-- Migration: 0032_recent_gain_cap
--
-- 修 0031 的一个真实缺陷:**被扣留的账号会靠扣留掉的量冲上近 30 天榜。**
--
-- ── 0031 里我判断错了什么 ────────────────────────────────────────────────────
-- 0031 的文件头写着「扣留的量不会污染这个榜(已实测确认,不需要额外处理)」,理由是
-- 「history.delta 追的是 score 的变化,被扣留的量从来没有进过 delta」。
-- **那个理由是错的。** 顺序恰恰相反:
--
--   1. 同步进来,score 正常上涨,AFTER 触发器(0010)照常写下每一条正的 delta;
--   2. **之后**扣留才发生 —— 0016 把增量记进 held_tokens,而 score 是派生列
--      (0016:71 `score = raw_score − held_tokens`),于是 score 被砍下来;
--   3. 那次下砍**没有留下任何 history 行**。
--
-- 实测(2026-08-18,账号 Yohann / 6ab041c7-e522-43f7-8817-de88afe2a086):
--   history 共 18 行,最后一行 new_score = 1,774,664,155,**没有一条负 delta**;
--   而表上当前 score = 14,105,962,held_tokens = 1,760,558,193。
--   → 近 30 天窗口内 12 条 update 求和 = 1,431,052,581
--   → 0031 上线后,这个账号在榜上排第 3,标着 14.3 亿。
--
-- 也就是说 **history 不能当作「实际计入了多少」的代理**。它记的是 score 曾经的轨迹,
-- 而 score 后来会被无声地改写。
--
-- 这个洞的性质比数字难看:项目展示的曝光是按名次分配的,所以它等于「扣留掉的量仍然能
-- 买到曝光」。而反作弊存在的全部理由就是不让这件事发生。
--
-- ── 修法:按该账号**当前实际计入的总量**封顶 ──────────────────────────────────
--     least(窗口内 update 求和, 该账号当前 score)
--
-- 为什么这是对的,而不是一个凑数的补丁:
--   score 是「历来所有被计入的增量之和」,窗口内的量是它的**子集**。所以对任何账号,
--   窗口和 ≤ score 恒成立 —— **除非**有什么东西把 token 从 score 里拿掉了却没写进
--   history。而那正好是扣留(以及任何未来走同样路径的管理修正)。
--   于是这个封顶对诚实账号是**恒等变换**,只在 score 被无声改写过时才生效。
--
-- 实测验证(20 行全量跑过):
--   受影响账号 1 个(Yohann,14.3 亿 → 1410 万,名次 #3 → #8);
--   另外 19 个**一个字节都没变**(它们的窗口和本来就 ≤ score)。
--
-- ── 为什么不去改扣留那边,让它补写一条负 history ──────────────────────────────
-- 两个理由:
--   1. 那要动 0016 —— 一套正在生效的反作弊系统 —— 而且救不了**已经存在**的数据:
--      Yohann 那 18 行已经在库里了,补写机制只对以后的扣留有效;
--   2. 封顶是**防御式**的:它不依赖别的子系统守规矩。任何绕过 history 降低 score 的
--      路径(现在的扣留、以后的人工修正、我还没想到的第三种)都会被它自动吸收。
-- 代价是这个榜不再是「history 的纯函数」,所以下面把这条不变量写清楚。
--
-- ⚠️ 需在 Supabase SQL Editor 手动执行。幂等,可重复跑。假设 0001–0031 已应用。

-- ── 1. 重建 recent_gain,加封顶 ───────────────────────────────────────────────
-- 与 0031 逐字相同,只多了 least(...) 和取 score 的那个子查询。
-- 视图不用重建:create or replace function 不改变 leaderboard_public 的定义,
-- 视图下一次求值就会调用到新版本。

create or replace function private.recent_gain(p_user_id uuid)
  returns bigint
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select least(
           -- 窗口内实际收成:只算 update(insert 是首次同步灌入的历史累计,
           -- backfill 是管理动作 —— 理由见 0031 文件头)
           greatest(0, coalesce((select sum(h.delta)
                                   from public.leaderboard_history h
                                  where h.user_id = p_user_id
                                    and h.reason  = 'update'
                                    and h.at     >= now() - interval '30 days'), 0)),
           -- 封顶:该账号当前实际计入的总量。score 已经扣掉 held_tokens,
           -- 所以被扣留的增量到这里就买不到名次了。
           greatest(0, coalesce((select l.score
                                   from public.leaderboard l
                                  where l.user_id = p_user_id), 0))
         )::bigint;
$$;

comment on function private.recent_gain(uuid) is
  '该账号近 30 天实际计入的 token 量。窗口内只累加 reason=''update''(insert 是首次同步灌入的历史累计,backfill 是管理动作),再按该账号当前 score 封顶 —— score 已扣掉 held_tokens,所以扣留掉的增量买不到名次(0032 修的就是这个:history 记下了 score 曾经的轨迹,但扣留把 score 无声改小了,没留 history 行)。definer 身份读表,只回聚合值;放在 private,PostgREST 不暴露该 schema。';

revoke all on function private.recent_gain(uuid) from public;
grant execute on function private.recent_gain(uuid) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ── 2. 这条不变量必须记住 ────────────────────────────────────────────────────
--
-- 近 30 天榜**不是** leaderboard_history 的纯函数。它是
--     least(history 的窗口聚合, leaderboard.score)
-- 两个来源都参与,而封顶那一半是唯一挡住「扣留掉的量买曝光」的东西。
--
-- 具体地:如果哪天有人让 score 可以在**不写 history** 的情况下变大(目前没有这种路径,
-- 释放扣留走的是 held_tokens 减少 → score 回升,同样不写 history),那封顶就会放行一个
-- 没有 history 依据的数字。所以任何改动 raw_score / held_tokens / score 关系的迁移,
-- 都要回来重新审视这个函数。
--
-- ── 3. 部署后自检 ────────────────────────────────────────────────────────────
--
-- 3.1 被扣留的账号不再虚高(期望 recent_score = score = 14,105,962)
--   select l.username, l.score, l.held_tokens, private.recent_gain(l.user_id) as recent
--     from public.leaderboard l
--    where l.held_tokens > 0;
--
-- 3.2 没有任何账号的近 30 天量超过它的累计量(期望 0 行)
--   select l.username, l.score, private.recent_gain(l.user_id) as recent
--     from public.leaderboard l
--    where private.recent_gain(l.user_id) > l.score;
--
-- 3.3 诚实账号未受影响 —— 抽查两个头部账号,与 0031 时的值应当完全一致
--   select l.username, private.recent_gain(l.user_id) as recent
--     from public.leaderboard l
--    where l.username in ('Ericccccc', 'SmilingMiles');
--   -- 期望 11,445,557,128 与 6,329,126,163
--
-- 3.4 anon 仍然读不到原始时间线(必须仍是 42501)
--   -- curl "$URL/rest/v1/leaderboard_history?select=user_id&limit=1" -H "apikey: $ANON"
