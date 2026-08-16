-- Migration: 0023_leaderboard_project_grants
--
-- 修 0022 的一颗雷:**新加的四个 project_* 列没有列级 SELECT 权限**,于是客户端每一次
-- upsert 都 42501 / HTTP 403,静默失败(实测 2026-08-16:图片传进了 Storage,行上的四个
-- 列却始终是 null,App 的 sync_error.json 里记着 `upsert_score HTTP 403: Forbidden`)。
--
-- 根因,写清楚免得第三次踩:
--   0001 给的是**表级** `grant select on public.leaderboard to anon, authenticated`。
--   0008 为了把 bkt_* 四列藏起来,做的是「先撤表级、再逐列授回」:
--       revoke select on public.leaderboard from anon, authenticated;
--       grant  select (<除 bkt_* 之外的每一列>) on public.leaderboard to ...;
--   PostgreSQL 里表级授权和列级授权是两套东西:**一旦退化成逐列授予,之后 ALTER TABLE
--   加的新列就不在任何授权里**。而客户端的主写入路径是
--   `INSERT … ON CONFLICT (user_id) DO UPDATE`,PostgreSQL 要求对 ON CONFLICT 读到的
--   每一列都有 SELECT 权限 —— 缺一列,整条请求 42501。
--   这正是 0008 自己文档里记过的那个坑,只是那次是「带上 bkt_* 就 403」,
--   这次是「加了新列不授权,同样 403」。**以后每次给 leaderboard 加列,都要在同一个
--   迁移里补这三行 grant。**
--
-- ⚠️ 三种权限都要补,**别只补 SELECT**(本文件第一版就只补了 SELECT,再跑一遍还是 403)。
-- 0008 把 SELECT 改成了逐列,0016 又为了挡住 raw_score / held_tokens 把 **INSERT 和
-- UPDATE** 也改成了逐列:
--       revoke insert, update on public.leaderboard from anon, authenticated;
--       grant  insert (<除那两列之外的每一列>) on public.leaderboard to authenticated;
--       grant  update (<同上>) ...
-- 于是 0022 加的四个列三种权限一个都没有。**这个文件是幂等的,重复跑没有副作用。**

-- 读:公开榜单要显示它们,anon 也得读得到
grant select (project_name, project_desc, project_url, project_image)
  on public.leaderboard to anon, authenticated;

-- 写:只给登录用户(客户端用的是匿名登录会话);RLS 仍然限制它只能写自己那一行
grant insert (project_name, project_desc, project_url, project_image)
  on public.leaderboard to authenticated;
grant update (project_name, project_desc, project_url, project_image)
  on public.leaderboard to authenticated;

-- 历史表同理:0008 也把它的表级 SELECT 退化成了逐列。这四个列目前不写进历史表,
-- 但先不给 —— 没有列就没有权限可授,等真加了列再说。

-- ── 自检(在 SQL Editor 里跑,别只看「Success」)──────────────────────────────
--
--   -- 四个列的权限都到位了吗:应当出 16 行
--   -- (每列 4 条:anon SELECT + authenticated 的 SELECT / INSERT / UPDATE)
--   select column_name, grantee, privilege_type
--     from information_schema.column_privileges
--    where table_name = 'leaderboard'
--      and column_name like 'project\\_%'
--      and grantee in ('anon', 'authenticated')
--    order by column_name, grantee, privilege_type;
--
--   -- 顺带确认 0022 的两个触发器都在(应当出两行)
--   select tgname from pg_trigger
--    where tgrelid = 'public.leaderboard'::regclass and tgname like '%project%';
