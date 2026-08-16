-- Migration: 0024_project_image_host_pin
--
-- 把项目图片的来源钉死到**我们自己这个 Supabase 项目**。
--
-- ── 0022 漏了什么 ────────────────────────────────────────────────────────────
-- 0022:174 的正则是
--     ^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/project-images/<uid>\.(webp|jpg|png)$
-- 那个 `[a-z0-9]+` 是**任意** Supabase 项目 ref,不是我们的。实测复现:
--     https://attackerproject9.supabase.co/storage/v1/object/public/project-images/<uid>.webp
-- 原样通过。0022 的文件头写着「必须指向我们自己的 bucket」—— 那是意图,不是正则
-- 实际做到的事。next.config.ts 的 `hostname: "*.supabase.co"` 同样是通配,两道关卡
-- 的洞一模一样,所以两边要一起补(网站侧的改动在同一个 PR 里)。
--
-- ── 危害不是「跟踪像素」,0022 的注释在这一点上说过头了 ──────────────────────
-- next/image 是**服务端**取图,访客 IP 不会到达第三方。真实损失是三条:
--   1. 绕过我们 bucket 上的 64 KB file_size_limit 和 MIME 白名单 —— 那两道是
--      0022 自己钉的,却可以用一个别人的 bucket 整个绕开;
--   2. 审核通过之后偷偷换图 —— 内容不在我们的存储里,我们既看不见也删不掉;
--   3. 在钉死之前,/_next/image?url=https://<任意 ref>.supabase.co/... 是一个
--      **开放图片代理**,任何客户端都能驱动它。minimumCacheTTL 挡不住,因为攻击
--      流量不重复,每一次都是新的转换。
--
-- 现在改最便宜:线上只有一行带图,而且那一行是我们自己的。
--
-- ── 为什么用一个函数装那个前缀,而不是把 ref 直接写进正则 ────────────────────
-- 写死在 70 行的触发器函数中间,意味着 staging / 灾备重建出来的库会对**每一张**图
-- 报 `bad_image`,而报错信息完全看不出根因。装进一个单独的函数,换项目时只改这一处,
-- 而且 `\df public.project_image_prefix` 一眼就能查到当前钉的是谁。
-- ref 不是机密:它就在 NEXT_PUBLIC_SUPABASE_URL 里,本来就打包进了客户端 bundle。
--
-- ⚠️ 需在 Supabase SQL Editor 手动执行。幂等,可重复跑。假设 0001–0023 已应用。

-- ── 1. 期望的图片 URL 前缀(换项目只改这里) ──────────────────────────────────

create or replace function public.project_image_prefix()
  returns text
  language sql
  immutable
  set search_path = ''
as $$
  select 'https://nkpvhxgyebtglvvlcide.supabase.co/storage/v1/object/public/project-images/'
$$;

comment on function public.project_image_prefix() is
  '项目图片 URL 必须以此开头。换 Supabase 项目 / 建 staging 时,只需 create or replace 这一个函数。';

revoke all on function public.project_image_prefix() from public;
grant execute on function public.project_image_prefix() to service_role;

-- ── 2. 重建校验触发器函数 ────────────────────────────────────────────────────
-- 与 0022 第 3 节逐字相同,只有图片那一段换了:主机名不再是通配,改为拼上面那个前缀。
-- 其余部分(只在四列真的变了时校验、upsert 回查旧行、空串归一成 NULL、文本违禁词、
-- 链接 https 正则)原样保留 —— 那些的理由写在 0022 里,这里不重复。

create or replace function public.validate_leaderboard_project()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  reason  text;
  old_row public.leaderboard%rowtype;
  changed boolean := true;
begin
  if TG_OP = 'INSERT' then
    select * into old_row from public.leaderboard l where l.user_id = NEW.user_id;
    if found
       and NEW.project_name  is not distinct from old_row.project_name
       and NEW.project_desc  is not distinct from old_row.project_desc
       and NEW.project_url   is not distinct from old_row.project_url
       and NEW.project_image is not distinct from old_row.project_image then
      changed := false;
    end if;
  elsif NEW.project_name  is not distinct from OLD.project_name
    and NEW.project_desc  is not distinct from OLD.project_desc
    and NEW.project_url   is not distinct from OLD.project_url
    and NEW.project_image is not distinct from OLD.project_image then
    changed := false;
  end if;

  if not changed then
    return NEW;
  end if;

  NEW.project_name  := nullif(btrim(coalesce(NEW.project_name,  '')), '');
  NEW.project_desc  := nullif(btrim(coalesce(NEW.project_desc,  '')), '');
  NEW.project_url   := nullif(btrim(coalesce(NEW.project_url,   '')), '');
  NEW.project_image := nullif(btrim(coalesce(NEW.project_image, '')), '');

  reason := public.project_text_rejection(NEW.project_name, 24);
  if reason is null then
    reason := public.project_text_rejection(NEW.project_desc, 80);
  end if;
  if reason is not null then
    raise exception '[project_rejected] %', reason
      using errcode = 'check_violation';
  end if;

  if NEW.project_url is not null then
    if length(NEW.project_url) > 200
       or NEW.project_url !~* '^https://[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}(/[^\s]*)?$' then
      raise exception '[project_rejected] bad_url'
        using errcode = 'check_violation';
    end if;
  end if;

  -- 图片:主机名钉死到本项目,对象名钉死到**这一行的 user_id**。
  -- 前缀用 like 精确比较而不是塞进正则:前缀里有 `.` 和 `/`,拼进正则就得先转义,
  -- 漏一个 `.` 就又变成通配,而那正是 0022 栽的地方。
  if NEW.project_image is not null then
    if left(NEW.project_image, length(public.project_image_prefix()))
         is distinct from public.project_image_prefix()
       or substr(NEW.project_image, length(public.project_image_prefix()) + 1)
            !~ ('^' || NEW.user_id::text || '\.(webp|jpg|png)$') then
      raise exception '[project_rejected] bad_image'
        using errcode = 'check_violation';
    end if;
  end if;

  return NEW;
end;
$$;

-- 触发器本身不用重建(0022 已经挂上,create or replace function 不影响它),
-- 但重复执行本文件时把它对齐一次没有副作用。
drop trigger if exists trg_validate_leaderboard_project on public.leaderboard;
create trigger trg_validate_leaderboard_project
  before insert or update on public.leaderboard
  for each row execute function public.validate_leaderboard_project();

-- ── 3. 部署后自检(在 SQL Editor 里逐条跑,别只看「Success」)────────────────
--
--   -- 钉的是哪个项目
--   select public.project_image_prefix();
--
--   -- 线上已有的图仍然合法(应当返回 0 行;返回任何行都说明这次改动会锁死存量数据)
--   select user_id, project_image from public.leaderboard
--    where project_image is not null
--      and (left(project_image, length(public.project_image_prefix()))
--             is distinct from public.project_image_prefix()
--           or substr(project_image, length(public.project_image_prefix()) + 1)
--                !~ ('^' || user_id::text || '\.(webp|jpg|png)$'));
--
--   -- 别人项目的地址现在会被拒(应当抛 [project_rejected] bad_image)
--   -- 拿一个真实存在的 user_id 替换 <uid>,在事务里跑完回滚:
--   -- begin;
--   --   update public.leaderboard
--   --      set project_image = 'https://attackerproject9.supabase.co/storage/v1/object/public/project-images/<uid>.webp'
--   --    where user_id = '<uid>';
--   -- rollback;
