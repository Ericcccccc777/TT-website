-- Migration: 0025_project_visibility
--
-- 「谁的项目展示会出现在公开榜单上」这条规则,以及管理员的覆盖开关。
--
-- 规则:一行的项目会被公开,当且仅当
--     项目名非空  AND  ( held_tokens = 0  OR  管理员给了这个账号许可 )
--
-- ── 为什么规则写在读取侧,而不是写入时把列置空 ─────────────────────────────────
-- 产品要求是「管理员点一下开关,榜上立刻出现」。写入时置空满足不了它:触发器把四列
-- null 掉之后,值只剩在桌面 App 本地,开关打开也没有东西可以发布,得等那个玩家下次
-- 同步 —— 而那可能永远不来。所以值留在基表,规则在读取时应用。
--
-- 代价要说清楚:anon 原本能直查基表(0023),把 API 结果和页面一比,差集就是「被扣
-- 且未获许可」的集合,这会削弱 0016 的「扣留必须无声」。本迁移把简单那条路堵上 ——
-- 撤掉 anon 对四列的直接 SELECT,只留下面这个视图。**这挡不住**匿名注册一个会话
-- (App 就是这么做的)再去读基表的人,不假装挡得住。而 0016 的无声对当事人本来就
-- 不完整:他自己看得见公开分数低于 App 里的总数。
--
-- ── ⚠️ 视图必须 security_invoker = true ──────────────────────────────────────
-- 不加的话视图以属主(postgres)身份执行,0005 的封禁策略 `not is_banned(user_id)`
-- 就不再作用于查询者 —— **被封禁的人会全部回到公开榜单上**。0021 为使用量榜记过
-- 同一个坑。加上之后,基表的 RLS 照常对 anon 生效,行数和 count 都还是「可见玩家」。
--
-- ── 为什么许可要单独一张表,而不是 leaderboard 上加一列 ───────────────────────
-- leaderboard 的 UPDATE 权限是给 authenticated 的(0016 逐列授予),而客户端就是
-- authenticated。加一列意味着要么用户能自己给自己发许可,要么又得改一次逐列授权 ——
-- 0023 已经演示过这条路有多容易漏。单独一张表、RLS 全拒、只有 service_role 能碰,
-- 和 0005 的封禁表是同一个形状,不需要新的推理。
--
-- ⚠️ 需在 Supabase SQL Editor 手动执行。幂等,可重复跑。假设 0001–0024 已应用。

-- ── 1. 许可表(照抄 0005 的形状) ─────────────────────────────────────────────

create table if not exists public.leaderboard_project_allowances (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  allowed_by text,
  created_at timestamptz not null default now()
);

comment on table public.leaderboard_project_allowances is
  '管理员显式许可:即使该账号有被扣留的增量,它的项目展示仍然公开。由 /ranger 写入。';

alter table public.leaderboard_project_allowances enable row level security;
-- 故意不给 anon / authenticated 任何策略:启用 RLS + 无策略 = 全部拒绝。
-- service_role 绕过 RLS,/ranger 的服务端动作走的就是它。

-- ── 2. 许可查询函数 ─────────────────────────────────────────────────────────
-- security definer 的理由与 0005 的 is_banned 完全相同:下面那个视图要在 anon
-- 身份下查一张 anon 读不到的表。

create or replace function public.is_project_allowed(uid uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select exists (
    select 1 from public.leaderboard_project_allowances a where a.user_id = uid
  );
$$;

revoke all on function public.is_project_allowed(uuid) from public;
grant execute on function public.is_project_allowed(uuid) to anon, authenticated, service_role;

-- ── 3. 公开视图 ─────────────────────────────────────────────────────────────
-- 网站只读这个视图。列清单与 lib/leaderboard.ts 现在 select 的九列一致,外加四个
-- 项目列。**不暴露 user_id、held_tokens、raw_score、bkt_*** —— 规则在视图里算完,
-- 输入不出去。

drop view if exists public.leaderboard_public;

create view public.leaderboard_public
  with (security_invoker = true)     -- ⚠️ 见文件头:少了这行,封禁就失效
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
  -- 项目名为空 => 整组都不发。「有图没名字」在规格里就是什么都不显示,
  -- 在这里直接不发,连图片地址都不会出现在页面源码里。
  case when v.visible then l.project_name  end as project_name,
  case when v.visible then l.project_desc  end as project_desc,
  case when v.visible then l.project_url   end as project_url,
  case when v.visible then l.project_image end as project_image
from public.leaderboard l
cross join lateral (
  select
    nullif(btrim(coalesce(l.project_name, '')), '') is not null
    and (
      coalesce(l.held_tokens, 0) = 0
      or public.is_project_allowed(l.user_id)
    ) as visible
) v;

comment on view public.leaderboard_public is
  '公开榜单读取入口。已应用项目展示可见性规则(项目名非空 且 (无扣留 或 有管理员许可))。security_invoker,所以 0005 的封禁 RLS 照常生效。';

grant select on public.leaderboard_public to anon, authenticated;

-- ── 4. 收回 anon 对基表四列的直接读取 ───────────────────────────────────────
-- authenticated **保留** —— 客户端的 INSERT … ON CONFLICT DO UPDATE 需要对它读到的
-- 每一列都有 SELECT,少一列就是 42501 / HTTP 403(0023 的整个由来)。

revoke select (project_name, project_desc, project_url, project_image)
  on public.leaderboard from anon;

-- ── 5. 部署后自检(在 SQL Editor 里逐条跑,别只看「Success」)────────────────
--
--   -- 视图确实是 security_invoker(应当返回 true)
--   select c.relname, (c.reloptions::text like '%security_invoker=true%') as invoker_ok
--     from pg_class c where c.relname = 'leaderboard_public';
--
--   -- 行数与基表可见行一致
--   select (select count(*) from public.leaderboard_public) as view_rows,
--          (select count(*) from public.leaderboard)        as base_rows;
--
--   -- 谁的项目当前可见
--   select username, project_name is not null as shown
--     from public.leaderboard_public order by score desc;
--
--   -- 被扣留账号:加许可前后各查一次,shown 应从 false 变 true
--   -- insert into public.leaderboard_project_allowances(user_id, allowed_by)
--   --   values ('<uid>', 'manual-test') on conflict (user_id) do nothing;
--   -- delete from public.leaderboard_project_allowances where user_id = '<uid>';
--
--   -- anon 不能再直接读基表那四列(应当报 42501)
--   -- 用 anon key: GET /rest/v1/leaderboard?select=project_name
