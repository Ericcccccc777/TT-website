-- Migration: 0026_project_visibility_fix
--
-- 修 0025 的一颗雷:视图整个查不动,anon 一律 42501
-- 「permission denied for table leaderboard」。
--
-- ── 根因 ────────────────────────────────────────────────────────────────────
-- 0025 同时做了两件互相矛盾的事:
--   ① 视图声明 security_invoker = true(为了让 0005 的封禁 RLS 继续作用于调用者);
--   ② 撤掉 anon 对四个 project_* 列的 SELECT(为了让 anon 没法绕过视图直读)。
-- 而 **security_invoker 视图要求调用者对视图引用到的每一列都有 SELECT 权限** ——
-- 少一列不是"那一列为空",是整个查询直接报错。视图里既引用了刚被撤权的四个
-- project_* 列,又引用了 0016 从未公开的 held_tokens,于是两处都踩中。
--
-- 这条限制 **0017 的文件头早就写下来了**:「security_invoker 视图会因为基表列无权限
-- 而整个查询失败(不是少一列,是直接报错)」。0025 没照做,这次照做。
--
-- ── 修法:抄 0017 的 hold_ratio ──────────────────────────────────────────────
-- 0017 要按扣留比例缩价值,同样不能在 security_invoker 视图里直接读 raw_score。
-- 它的做法是:把需要特权的那一步塞进一个 security definer 函数,函数以属主身份读
-- 受限列、**只回一个派生值**,视图本身从不引用受限列。原始数字仍然出不去。
-- 这里照搬:public.project_visible(uuid) 自己去读 held_tokens,只回一个 boolean。
--
-- ── 为什么把 0025 撤掉的那四个列权限**还回去** ──────────────────────────────
-- 撤权当时的用意是"堵住绕过视图直读的简单路径"。但要保住撤权,视图就只能改成
-- security definer,而那样一来 **0005 的封禁 RLS 不再自动生效**,必须在视图里手抄
-- 一份 `where not is_banned(...)`。两害相权:
--
--   手抄封禁过滤一旦和策略走散 → **被封禁的人重新出现在公开榜上**(最坏的故障);
--   还回列权限 → 有人用公开 key 直查基表能读到被扣账号的项目文字。
--
-- 后者本来就写在规格里、并且已经被明确接受("we do not get to claim both");
-- 前者是不可接受的。所以选择:还权,视图保持 security_invoker,封禁继续由 RLS 管。
-- 网页端看到的仍然是规则过滤后的结果 —— 榜单不会给被扣账号一块推广位,这才是
-- 这条规则的产品目的。
--
-- ⚠️ 需在 Supabase SQL Editor 手动执行。幂等,可重复跑。假设 0001–0025 已应用。

-- ── 1. 还回 0025 撤掉的列权限 ───────────────────────────────────────────────

grant select (project_name, project_desc, project_url, project_image)
  on public.leaderboard to anon;

-- ── 2. 可见性判定塞进 definer 函数 ──────────────────────────────────────────
-- 视图从此不再引用 held_tokens,只调这个函数。函数以属主身份读,回一个 boolean,
-- 被扣了多少永远不出去 —— 与 0017 的 private.hold_ratio 同一个手法。

create or replace function public.project_visible(p_user_id uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select coalesce(
    (select coalesce(l.held_tokens, 0) = 0 or public.is_project_allowed(l.user_id)
       from public.leaderboard l
      where l.user_id = p_user_id),
    true);   -- 查不到行就不抑制:宁可显示,也不要因为查不到把正常账号静默抹掉
$$;

comment on function public.project_visible(uuid) is
  '该账号的项目展示是否应当公开:无扣留,或已获管理员许可。以 definer 身份读 held_tokens,只回布尔值。';

revoke all on function public.project_visible(uuid) from public;
grant execute on function public.project_visible(uuid) to anon, authenticated, service_role;

-- ── 3. 重建视图:不再直接引用 held_tokens ───────────────────────────────────

drop view if exists public.leaderboard_public;

create view public.leaderboard_public
  with (security_invoker = true)     -- 封禁靠它继续生效,见文件头
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
    and public.project_visible(l.user_id) as visible
) v;

comment on view public.leaderboard_public is
  '公开榜单读取入口。已应用项目展示可见性规则。security_invoker,所以 0005 的封禁 RLS 照常生效;受限列的判定走 public.project_visible()。';

grant select on public.leaderboard_public to anon, authenticated;

notify pgrst, 'reload schema';

-- ── 4. 部署后自检(逐条跑) ──────────────────────────────────────────────────
--
--   -- anon 现在读得动视图了吗(用 anon key 发 GET /rest/v1/leaderboard_public?select=id&limit=1)
--
--   -- 行数与基表可见行一致
--   select (select count(*) from public.leaderboard_public) as view_rows,
--          (select count(*) from public.leaderboard)        as base_rows;
--
--   -- 谁的项目当前可见
--   select username, project_name is not null as shown
--     from public.leaderboard_public order by score desc;
--
--   -- 被扣账号加/撤许可,shown 应随之翻转
--   -- insert into public.leaderboard_project_allowances(user_id, allowed_by)
--   --   values ('<uid>','manual-test') on conflict (user_id) do nothing;
--   -- delete from public.leaderboard_project_allowances where user_id = '<uid>';
