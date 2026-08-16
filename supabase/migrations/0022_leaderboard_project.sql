-- Migration: 0022_leaderboard_project
--
-- ⛔ **不要单独重跑这个文件。** 第 3 节的 validate_leaderboard_project() 已经被 0024 取代:
--    这里的图片正则是 `[a-z0-9]+\.supabase\.co` 通配任意 Supabase 项目,0024 把它换成了钉死
--    本项目的前缀比较。重跑本文件会用旧版本 create or replace 回去,**而且不报任何错** ——
--    主机名钉死就这样被静默解除了。第 4 节的 "project image read" 策略也已被 0028 换掉。
--    要确认这些改动在不在,跑 0028 文末 8.1 的自检表,不要重贴这个文件。
--
-- 「项目展示」:榜单上的每一行可以带一段用户自己写的项目介绍 —— 名称、一句话简介、
-- 一个链接,外加一张图。桌面端在 设置 → 排行榜 → 项目展示 里填,默认关闭。
--
-- ⚠️ 这一组和这张表上其它所有列有一个本质区别:**它是自由文本 + 用户上传的图片,
-- 而且会原样出现在公开网页上。** 其余列都是数字或枚举。客户端(showcase.py)那一道
-- 校验只保数据质量 —— App 用 anon key 直连 PostgREST,那把 key 就打包在二进制里,
-- 改个客户端或直接 curl 就绕过去了。**这里才是唯一真正拦得住的地方。**
--
-- 设计上照抄 0013(昵称守卫)踩过的坑:
--   • **不用 CHECK 约束。** CHECK 写不出 "IS DISTINCT FROM OLD",于是它会把库里已有
--     的、按新规则不合格的历史行永久锁死(再也同步不了),还会连坐拒绝那个只改
--     bkt_* 的 PATCH(它根本不碰这几列)。改用 BEFORE 触发器 + 「只在真的变了时校验」。
--   • **不新建表**,四列直接加在 leaderboard 上。
--     ⚠️ 【本文件写错过一次,2026-08-16 修正】这里原来写的是「0001 的表级 grant 自动
--     覆盖新列」—— **不成立**。0008 为了藏 bkt_* 做的是「撤表级 SELECT、再逐列授回」,
--     授权就此退化成逐列的,新加的列不在任何授权里。而客户端主路径是
--     `INSERT … ON CONFLICT DO UPDATE`,PostgreSQL 要求对它读到的每一列都有 SELECT ——
--     缺一列整条请求 42501 / HTTP 403,而且是静默失败(图片进了 Storage,行却写不进去)。
--     补授权在 **0023**;以后每次给这张表加列,都要在同一个迁移里带上那三行 grant。
--   • 违禁词复用 0013 的 banned_words / normalize_name / spaced_name,不另起一套。
--     词表会更新,两套实现迟早走散,而这是审核路径。
--
-- 图片走 Storage(bucket `project-images`,对象名 `<user_id>.webp`),不进数据库:
-- 免费版数据库只有 500 MB,而图片真正贵的是**出站流量**(榜单页每打开一次,可见的
-- 每张图都要发一遍;免费版每月 5 GB)。客户端因此把图压到 512px / 64 KB 以内再传,
-- bucket 上再钉一道 file_size_limit —— 客户端那道同样是可以绕过去的。
--
-- project_image 列存的是**公开 URL**,但它必须指向我们自己的 bucket:不校验的话,
-- 任何人都能把它改成第三方地址,于是公开榜单会替攻击者从他的服务器加载图片 ——
-- 那是一个现成的跟踪像素(拿到每个访客的 IP + UA),也可能是一张任意内容的图。

-- ── 1. 列 ────────────────────────────────────────────────────────────────────

alter table public.leaderboard
  add column if not exists project_name  text,
  add column if not exists project_desc  text,
  add column if not exists project_url   text,
  add column if not exists project_image text;

comment on column public.leaderboard.project_name  is '用户填写的项目名(≤24 字);公开显示';
comment on column public.leaderboard.project_desc  is '用户填写的一句话简介(≤80 字);公开显示';
comment on column public.leaderboard.project_url   is '用户填写的项目链接(仅 https,≤200 字);公开显示';
comment on column public.leaderboard.project_image is
  'project-images bucket 里那张图的公开 URL;由触发器校验必须指向本项目自己的 bucket';

-- ── 2. 文本审查(复用 0013 的词表与归一化) ───────────────────────────────────

create or replace function public.project_text_rejection(txt text, max_len integer)
  returns text
  language plpgsql
  security definer      -- 与 username_rejection 同理:anon 读不到 banned_words
  stable
  set search_path = ''
as $$
declare
  raw    text := btrim(coalesce(txt, ''));
  dense  text;
  spaced text;
begin
  if raw = '' then
    return null;                          -- 空 = 没填,合法
  end if;

  if length(raw) > max_len then
    return 'too_long';
  end if;

  -- 零宽 / 方向覆盖 / 控制字符(逐字复制 0013 的那一串:两处必须同源)
  if raw ~ '[­ᅟᅠ᠎​‌‍‎‏‪‫‬‭‮⁠⁡⁢⁣⁤⁦⁧⁨⁩ㅤ﻿ﾠ[:cntrl:]]' then
    return 'bad_char';
  end if;

  dense := public.normalize_name(raw);
  if dense = '' then                      -- 纯符号,没有可读内容
    return 'bad_char';
  end if;

  -- **刻意不查冒充前缀。** 昵称是身份,项目名是内容:一个真的给 Token Forest 写插件
  -- 的人,他的项目就该能叫「TokenForest 插件」;"Admin Tools" 也是完全正常的项目名。
  -- 身份那一侧的防线在 0013 的 username 上,没有被这条放宽削弱。

  if exists (select 1 from public.banned_words w
             where w.match_mode = 'cjk' and position(w.word in dense) > 0) then
    return 'banned';
  end if;

  spaced := public.spaced_name(raw);
  if exists (select 1 from public.banned_words w
             where w.match_mode = 'latin' and spaced ~ ('(^| )' || w.word)) then
    return 'banned';
  end if;

  if spaced ~ '(^| )[[:alnum:]]( [[:alnum:]]){2}( |$)'
     and exists (select 1 from public.banned_words w
                 where w.match_mode = 'latin' and position(w.word in dense) > 0) then
    return 'banned';
  end if;

  return null;
end;
$$;

grant execute on function public.project_text_rejection(text, integer) to service_role;

-- ── 3. 触发器 ────────────────────────────────────────────────────────────────
-- 只在这四列**真的变了**时校验。理由同 0013:不这么写会拒掉只改 bkt_* 的 PATCH,
-- 并且把库里已有的、按新规则不合格的行永久锁死。
-- upsert 陷阱同样适用:客户端主路径是 INSERT … ON CONFLICT,BEFORE INSERT 时
-- TG_OP='INSERT' 而行可能早已存在 —— 必须回查旧行再决定要不要豁免。

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

  -- 空串一律归一成 NULL:关掉项目展示时客户端发的是四个空字符串,存成 NULL 让
  -- 网页端 "有没有项目" 的判断只需要一种写法。
  NEW.project_name  := nullif(btrim(coalesce(NEW.project_name,  '')), '');
  NEW.project_desc  := nullif(btrim(coalesce(NEW.project_desc,  '')), '');
  NEW.project_url   := nullif(btrim(coalesce(NEW.project_url,   '')), '');
  NEW.project_image := nullif(btrim(coalesce(NEW.project_image, '')), '');

  reason := public.project_text_rejection(NEW.project_name, 24);
  if reason is null then
    reason := public.project_text_rejection(NEW.project_desc, 80);
  end if;
  if reason is not null then
    -- 标记沿用 0013 的约定:客户端靠它把「重试没用、得改内容」和网络故障分开。
    raise exception '[project_rejected] %', reason
      using errcode = 'check_violation';
  end if;

  -- 链接:只放行 https 的普通网址。这个字段会被公开网页渲染成可点的东西,
  -- javascript: / data: 在那里就是一颗现成的炸弹,http:// 则把点进去的人降级到明文。
  if NEW.project_url is not null then
    if length(NEW.project_url) > 200
       or NEW.project_url !~* '^https://[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}(/[^\s]*)?$' then
      raise exception '[project_rejected] bad_url'
        using errcode = 'check_violation';
    end if;
  end if;

  -- 图片:必须是我们自己 bucket 里、且属于**这一行的 user_id** 的那个对象。
  -- 不钉死的话,榜单会替任何人从任意服务器加载图片 —— 一个现成的跟踪像素。
  if NEW.project_image is not null then
    if NEW.project_image !~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/project-images/'
                             || NEW.user_id::text || '\.(webp|jpg|png)$') then
      raise exception '[project_rejected] bad_image'
        using errcode = 'check_violation';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_validate_leaderboard_project on public.leaderboard;
create trigger trg_validate_leaderboard_project
  before insert or update on public.leaderboard
  for each row execute function public.validate_leaderboard_project();

-- ── 4. Storage bucket ────────────────────────────────────────────────────────
-- public = true:榜单页是公开的,读图不该需要凭证(也就不会有签名 URL 的过期问题)。
-- file_size_limit 与客户端的 64 KB 预算同值 —— 客户端那道是可以绕过去的。

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', true, 65536,
        array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = 65536,
      allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

-- 对象名固定为 `<user_id>.<ext>`,放在 bucket 根目录。策略据此把写权限钉死到本人:
-- split_part(name,'.',1) = auth.uid()。没有这一条,任何登录用户都能覆盖别人的图。

drop policy if exists "project image insert own" on storage.objects;
create policy "project image insert own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-images'
              and split_part(name, '.', 1) = auth.uid()::text);

drop policy if exists "project image update own" on storage.objects;
create policy "project image update own"
  on storage.objects for update to authenticated
  using       (bucket_id = 'project-images'
               and split_part(name, '.', 1) = auth.uid()::text)
  with check  (bucket_id = 'project-images'
               and split_part(name, '.', 1) = auth.uid()::text);

drop policy if exists "project image delete own" on storage.objects;
create policy "project image delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-images'
         and split_part(name, '.', 1) = auth.uid()::text);

-- 读:bucket 是 public 的,公开读走 /object/public/… 那条路径,不经 RLS。
-- 这里仍然显式给一条 select 策略,方便后台(service_role 之外)按对象名列举。
drop policy if exists "project image read" on storage.objects;
create policy "project image read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'project-images');

-- ── 5. 撤榜时连图一起删 ──────────────────────────────────────────────────────
-- 关闭排行榜会 DELETE 掉这一行(0003)。图在 Storage 里,不会跟着走 —— 不补这一刀,
-- 用户「撤下」之后他的图还挂在公网上,知道地址的人照样打得开。
-- 客户端在关掉项目展示时会主动删一次;这里是兜底(用户直接撤榜、或那次删除失败)。

create or replace function public.drop_project_image_on_delete()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  delete from storage.objects
   where bucket_id = 'project-images'
     and split_part(name, '.', 1) = OLD.user_id::text;
  return OLD;
end;
$$;

drop trigger if exists trg_drop_project_image on public.leaderboard;
create trigger trg_drop_project_image
  after delete on public.leaderboard
  for each row execute function public.drop_project_image_on_delete();

-- ── 6. 部署后自检(在 SQL Editor 里逐条跑,别只看「Success」)────────────────
--
--   -- 列在不在
--   select column_name from information_schema.columns
--    where table_name = 'leaderboard' and column_name like 'project_%';
--
--   -- 审查函数能用(应当分别返回 null / too_long / banned)
--   select public.project_text_rejection('Token Forest', 24),
--          public.project_text_rejection(repeat('a', 25), 24);
--
--   -- bucket 建好了
--   select id, public, file_size_limit from storage.buckets where id = 'project-images';
--
--   -- 触发器挂上了
--   select tgname from pg_trigger where tgrelid = 'public.leaderboard'::regclass
--    and tgname like '%project%';
