-- Migration: 0029_project_takedown
--
-- 「只下架这个人的项目展示,不动这个人」—— 管理员的第三个判断。
--
--   隐藏(0005)  = 「我们不信这个账号」→ 整行从公开榜消失
--   扣留(0016)  = 「我们不信这个数字」→ 人在榜上,可疑增量不计分
--   下架(本文件)= 「我们不替这段内容背书」→ 分数、树、名次一动不动,只是项目内容进不来
--
-- 之前遇到有人在简介里写脏话或挂恶意链接,只有两条路:把一个没作弊的人整个封掉,
-- 或者手改数据库。
--
-- ── 为什么是「拒绝写入」而不是「把列清空」 ──────────────────────────────────
-- 清空不成立,这一条是去桌面端源码里查实的,不是推测:
--   src/app.py::_project_payload() 三态 —— 开关开着就带上本地内容;
--   src/leaderboard.py:698 把它写进 upsert,覆盖这四列;
--   src/app.py:4477 有个「内容和分数都没变就整趟不传」的签名跳过,但**签名里含分数**,
--   玩家收一次 token 签名就变。
-- 也就是说:管理员在服务端清空 → 那个玩家下次收 token(活跃用户 30 分钟内必然发生)
-- → 同样的内容被原样写回。做成清空,就是做了一个「点完半小时后自己回来」的功能。
--
-- 拒绝写入则内容根本进不了库,客户端重传多少次都一样。而且客户端**已经有**这条路径:
--   src/leaderboard.py:716-722 认得 `[project_rejected]` 这个标记 → 摘掉项目那一组、
--   **分数照常上传**(主榜不能被一张卡片拖死)、置 project_rejected() 让设置窗把
--   「服务器没有接受这段内容」显示给玩家;他改了任何一项就 reset_project_guard(),
--   允许再试一次。所以下架对玩家不是内容神秘消失,是一句明确的话。
--
-- ── ⚠️ 清空必须永远放行 ─────────────────────────────────────────────────────
-- 下面的检查只拦「设置内容」,不拦「四个都清成 NULL」。拦了的话,一个被下架的玩家
-- 自己想撤下内容都撤不掉 —— 那正好和这个功能的目的相反。
--
-- ── 顺手补 0022 的一个洞:封禁不删图 ────────────────────────────────────────
-- 封禁只是让 RLS 过滤掉那一行(0005),**行还在**,所以 0022 的 AFTER DELETE 清理触发器
-- 永远不会触发 —— 被封玩家的图片至今仍挂在一个可以猜出来的公开地址上
-- (`<project_image_prefix()><user_id>.webp`)。本文件让封禁和下架都顺带把图删掉。
--
-- ── 这一系列已经付过学费的四条(0028 文件头有完整版,这里只列本文件用到的)────
--   • 这个库里新建对象**不继承任何权限**:service_role 不在默认授权里(0005:81-90),
--     而新**函数**默认对 PUBLIC 授予 EXECUTE —— 不写 revoke 就等于发布了一个匿名 API。
--   • definer 助手一律进 `private` schema:PostgREST 只暴露 public,放 public 就成了
--     任何人可调的探针(0026 就是这么造出一个扣留探针的,0028 才搬走)。
--   • 本文件**不碰视图** —— 可见性规则本来就集中在 private.project_visible() 里,
--     在那里加一个条件即可,不必 drop/recreate 一个 security_invoker 视图。
--
-- ⚠️ 需在 Supabase SQL Editor 手动执行。幂等,可重复跑。假设 0001–0028 已应用。

-- ═══ 1. 下架名单 ════════════════════════════════════════════════════════════
-- 形状照抄 0005 的封禁表和 0025 的许可表。

create table if not exists public.leaderboard_project_blocks (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  reason     text,
  blocked_by text,
  created_at timestamptz not null default now()
);

comment on table public.leaderboard_project_blocks is
  '管理员下架的项目展示:命中的账号写不进项目内容(清空仍放行)。由 /ranger 写入。';

alter table public.leaderboard_project_blocks enable row level security;
-- 故意不给 anon / authenticated 任何策略:启用 RLS + 无策略 = 全部拒绝。
-- 能列出这张表就等于能列出「谁被下架过」。

-- ⚠️ 0025 就是在这一步漏了,导致整个 /ranger 控制台 42501。
grant select, insert, update, delete
  on public.leaderboard_project_blocks to service_role;

-- ═══ 2. 判定函数(private,不是 public)═══════════════════════════════════════

create or replace function private.is_project_blocked(p_user_id uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select exists (
    select 1 from public.leaderboard_project_blocks b where b.user_id = p_user_id
  );
$$;

comment on function private.is_project_blocked(uuid) is
  '该账号的项目展示是否已被管理员下架。放 private:PostgREST 不暴露该 schema,不会变成匿名探针。';

revoke all on function private.is_project_blocked(uuid) from public;
grant execute on function private.is_project_blocked(uuid) to service_role;
-- anon / authenticated 不需要直接调它:下面两个调用点(校验触发器、project_visible)
-- 都是 security definer,以属主身份执行。

-- ═══ 3. 校验触发器:被下架的账号写不进内容 ═══════════════════════════════════
-- 函数体与 0024 的版本**逐字相同**,只在归一化之后、词表审查之前插入一段下架检查。
-- 位置是刻意的:归一化把空串变成 NULL 之后才判,「清空」因此天然落在放行的一侧。

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

  -- ↓↓↓ 0029 新增的唯一一段 ↓↓↓
  -- 只拦「设置内容」。四个都是 NULL 时不进这个分支 —— 玩家自己撤下永远放行,
  -- 否则被下架的人连清除都做不到,与本功能的目的正好相反。
  if (NEW.project_name  is not null
      or NEW.project_desc  is not null
      or NEW.project_url   is not null
      or NEW.project_image is not null)
     and private.is_project_blocked(NEW.user_id) then
    -- 用客户端已经认得的标记(src/leaderboard.py:716):它会摘掉项目组、
    -- 分数照常上传,并把这件事显示在设置窗里。
    raise exception '[project_rejected] blocked'
      using errcode = 'check_violation';
  end if;
  -- ↑↑↑ 以下与 0024 逐字相同 ↑↑↑

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

revoke all on function public.validate_leaderboard_project() from public;

-- ═══ 4. 视图侧也抑制(纵深防御)═══════════════════════════════════════════════
-- 触发器管的是「以后写不进来」,但下架之前已经存进去的内容还在行上。可见性规则
-- 集中在 private.project_visible(),在那里加一个条件即可 —— **不动视图本身**。

create or replace function private.project_visible(p_user_id uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select coalesce(
    (select not exists (select 1
                          from public.leaderboard_project_blocks b
                         where b.user_id = l.user_id)
              and (coalesce(l.held_tokens, 0) = 0
                   or exists (select 1
                                from public.leaderboard_project_allowances a
                               where a.user_id = l.user_id))
       from public.leaderboard l
      where l.user_id = p_user_id),
    true);
$$;

-- ═══ 5. 下架与封禁都顺带把图删掉 ═══════════════════════════════════════════
-- 跨 schema 删 storage.objects 一律包异常:失败只记 warning,绝不能把调用方带崩。
-- 这是 0028 定下的规矩 —— 0003 的「把我从榜上撤下来」对所有用户都不能因为一张图失败。
-- 已知局限(同 0028):删掉 storage.objects 的行会让公开 URL 立刻 404,隐私目的达成;
-- S3 上的字节要 storage-api 才能真正回收,SQL 这侧做不到。

create or replace function public.drop_project_image_for_user(p_user_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  begin
    delete from storage.objects
     where bucket_id = 'project-images'
       and split_part(name, '.', 1) = p_user_id::text;
  exception when others then
    raise warning 'project_image_cleanup_failed uid=% sqlstate=%', p_user_id, SQLSTATE;
  end;
end;
$$;

revoke all on function public.drop_project_image_for_user(uuid) from public;
grant execute on function public.drop_project_image_for_user(uuid) to service_role;

-- 5.1 下架时删图,并把行上已存的四列清掉(触发器此后拒绝写回)。
create or replace function public.on_project_blocked()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  update public.leaderboard
     set project_name = null, project_desc = null,
         project_url = null, project_image = null
   where user_id = NEW.user_id;
  perform public.drop_project_image_for_user(NEW.user_id);
  return NEW;
end;
$$;

revoke all on function public.on_project_blocked() from public;

drop trigger if exists trg_on_project_blocked on public.leaderboard_project_blocks;
create trigger trg_on_project_blocked
  after insert on public.leaderboard_project_blocks
  for each row execute function public.on_project_blocked();

-- 5.2 封禁时删图 —— 补 0022 的洞(封禁不删行,AFTER DELETE 清理永远不触发)。
create or replace function public.on_leaderboard_banned()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  perform public.drop_project_image_for_user(NEW.user_id);
  return NEW;
end;
$$;

revoke all on function public.on_leaderboard_banned() from public;

drop trigger if exists trg_on_leaderboard_banned on public.leaderboard_bans;
create trigger trg_on_leaderboard_banned
  after insert on public.leaderboard_bans
  for each row execute function public.on_leaderboard_banned();

notify pgrst, 'reload schema';

-- ═══ 6. 自检:跑完逐条执行,读**返回值**,不要只看「Success」═══════════════════
--
-- 6.1 表建好了,而且 service_role 四个权限齐(应当 4 行 true)
--   select privilege_type,
--          has_table_privilege('service_role','public.leaderboard_project_blocks',privilege_type) as ok
--     from unnest(array['SELECT','INSERT','UPDATE','DELETE']) as privilege_type;
--
-- 6.2 判定函数在 private,而且没有对 PUBLIC 泄露(应当 1 行、grantee 只有 service_role)
--   select p.proname, n.nspname, coalesce(array_to_string(p.proacl,' '),'(默认=PUBLIC!)') as acl
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where p.proname in ('is_project_blocked','project_visible') and n.nspname = 'private';
--
-- 6.3 三个新触发器都挂上了(应当 2 行:blocks 表 1 个、bans 表 1 个)
--   select tgname, tgrelid::regclass from pg_trigger
--    where tgname in ('trg_on_project_blocked','trg_on_leaderboard_banned');
--
-- 6.4 端到端:拿一个真实 uid 试一次,跑在事务里最后回滚
--   begin;
--     -- 下架 -> 行上四列应被清空、图应消失
--     insert into public.leaderboard_project_blocks(user_id, blocked_by)
--       values ('fa9ae52a-b8cc-4a7c-b3ff-e141574f8f28','selftest');
--     select project_name, project_image from public.leaderboard
--      where user_id = 'fa9ae52a-b8cc-4a7c-b3ff-e141574f8f28';        -- 期望两个 null
--
--     -- 再写内容 -> 应当抛 [project_rejected] blocked
--     update public.leaderboard set project_name = 'x'
--      where user_id = 'fa9ae52a-b8cc-4a7c-b3ff-e141574f8f28';
--   rollback;   -- ⚠️ 上一句会报错中止事务,直接 rollback 即可;报错本身就是通过
--
-- 6.5 清空必须仍然放行(单独一段,同样回滚)
--   begin;
--     insert into public.leaderboard_project_blocks(user_id, blocked_by)
--       values ('fa9ae52a-b8cc-4a7c-b3ff-e141574f8f28','selftest');
--     update public.leaderboard
--        set project_name = null, project_desc = null, project_url = null, project_image = null
--      where user_id = 'fa9ae52a-b8cc-4a7c-b3ff-e141574f8f28';        -- 期望成功,不报错
--   rollback;
--
-- 6.6 没下架的人照常能写(用 anon key 打网站即可:榜单上 Popout Market 仍在)
