-- Migration: 0027_project_allowances_grants
--
-- 修 0025 的第二颗雷:/ranger 报
-- 「permission denied for table leaderboard_project_allowances」。
--
-- ── 根因:又是「新建对象忘了授权」──────────────────────────────────────────
-- 0025 建 leaderboard_project_allowances 时照抄了 0005 封禁表的 RLS 形状
-- (启用 RLS + 不给 anon/authenticated 任何策略 = 全拒),但**没有照抄 0005 的
-- grant**。0005 自己在第 83-90 行就写清楚了这件事:
--
--     -- only ever granted anon/authenticated — service_role was never granted,
--     -- so the service_role also bypasses RLS, so these grants are all it needs.
--     grant select on public.leaderboard to service_role;
--     grant select, insert, update, delete on public.leaderboard_bans to service_role;
--
-- 也就是说:**这个项目里 service_role 并没有靠默认权限拿到 public 下的新表。**
-- 绕过 RLS 和拥有表权限是两件事 —— service_role 绕得过 RLS,但没有 GRANT 一样
-- 会被 42501 拦下。
--
-- 这已经是同一类错误第三次:0008 撤表级 SELECT 改逐列 → 0022 加列没授权 → 0023 修;
-- 现在是 0025 建新表没授权 → 本文件修。**以后在这个库里新建任何表或列,都要在
-- 同一个迁移里带上 grant,并且用 service_role 的 key 真发一次请求验证过再收工。**
--
-- ⚠️ 需在 Supabase SQL Editor 手动执行。幂等,可重复跑。假设 0001–0026 已应用。

grant select, insert, update, delete
  on public.leaderboard_project_allowances to service_role;

-- anon / authenticated 什么都不给:这张表的可见性只通过 0026 的
-- public.project_visible() 这个 security definer 函数间接体现,任何人都不该直接读它
-- —— 能列出这张表就等于能列出「谁被扣留过又被人工放行」。

notify pgrst, 'reload schema';

-- ── 自检 ────────────────────────────────────────────────────────────────────
--
--   -- 应当出 4 行(service_role 的 SELECT/INSERT/UPDATE/DELETE)
--   select grantee, privilege_type
--     from information_schema.role_table_grants
--    where table_name = 'leaderboard_project_allowances'
--    order by grantee, privilege_type;
--
--   -- 用 service_role key 发一次真实请求(应当 200,不是 403):
--   --   GET /rest/v1/leaderboard_project_allowances?select=user_id&limit=1
--
--   -- 用 anon key 发同一个请求(应当仍然拒绝)
