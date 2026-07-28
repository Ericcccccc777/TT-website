-- ⚠️ 本文件由 Token-Forest/tools/gen_name_guard_sql.py 生成,不要手改。
-- 规则的唯一事实源是 Token-Forest 的 src/names.py 与 resources/wordlist/。
-- 手改这里会造成「客户端放行、服务端拒绝」的静默失败 —— 正是这套东西要消灭的症状。

-- Migration: 0013_leaderboard_username_guard
-- 在数据库层强制昵称合规。
--
-- 为什么必须有这一层:桌面 App 用 anon key 直连 PostgREST 写库,那把 key 就打包在
-- 二进制里。客户端的校验只是提示,改个客户端或直接 curl 就绕过去了。RLS 现在只校验
-- auth.uid() = user_id(所有权),不看内容 —— 这是唯一能真正拦住脏名字的地方。
--
-- 设计(照 0005_leaderboard_bans 的形状):
--   • banned_words 独立成表,**不往 leaderboard 上加列**。0008 撤过 anon 对 bkt_* 的
--     SELECT,导致 upsert 的 ON CONFLICT DO UPDATE 撞 42501 静默失败(见 upsert_score
--     的文档字符串)。在 leaderboard 上加列就要重趟那片雷区,独立表零风险。
--   • username_rejection() 用 SECURITY DEFINER —— anon 读不到 banned_words,
--     和 is_banned() 是同一个理由。
--   • 触发器只在 username **真的变了** 时校验。不加这条守卫会出两个事故:
--       (a) 客户端那个只更新 bkt_* 的 PATCH 会被连坐拒绝(它不碰 username);
--       (b) 库里已有的、按新规则不合格的历史行会被永久锁死,再也同步不了。
--     这跟 0009:44-46 记的 CHECK 约束教训是同一类问题 —— 所以这里也不用 CHECK,
--     CHECK 写不出 "IS DISTINCT FROM OLD" 这种条件。
--   • ⚠️ 客户端主写入路径是 PostgREST upsert = INSERT … ON CONFLICT DO UPDATE,
--     BEFORE INSERT 触发器在冲突判定**之前**就跑、TG_OP='INSERT' —— 单看 TG_OP
--     根本区分不了「真新行」和「换皮更新」。所以 INSERT 分支必须先回查旧行:
--     旧行存在且名字没变 = 事故 (a)(b) 的同一情形,直接豁免。触发器函数因此需要
--     SECURITY DEFINER(绕过 RLS 读旧行的 username)。
--   • App 对空昵称会派生「匿名用户#<sha1(user_id) 前 4 位>」(四语,见 names.ANON_LABELS
--     与 leaderboard.anon_name)作为 username 真实上传 —— 而「匿名用户」「anonymous」
--     恰在冒充前缀表里。触发器先做「自家派生名验真」:格式匹配 **且后缀与本行
--     user_id 的 sha1 一致**才放行;后缀对不上的(真人手输冒充)落回 impersonation
--     拒绝。验真需要 pgcrypto 的 digest(),迁移开头显式自检,派生算法两端不一致时
--     部署当场炸,而不是上线后所有匿名用户静默上不了榜。
--
-- 幂等:全程 if not exists / drop-before-create,可重复执行。

-- ── 0. pgcrypto(派生名验真用)+ 部署自检 ─────────────────────────────────────
-- Supabase 惯例装在 extensions 模式;若项目里已装在别的模式,下面的自检会当场报错,
-- 此时把本文件里的 extensions.digest 改成实际模式后重跑 —— 绝不能带着坏引用上线。
create extension if not exists pgcrypto with schema extensions;

do $selftest$
begin
  -- 与客户端 hashlib.sha1 的逐字节对账:两端对同一字符串必须得出同一后缀。
  -- 对不上就让迁移当场失败 —— 否则上线后所有匿名用户会被静默拒绝(2026-07 深扫的雷)。
  if substr(encode(extensions.digest('tokenforest-anon-parity', 'sha1'), 'hex'), 1, 4) <> 'bd91' then
    raise exception 'pgcrypto sha1 与客户端 hashlib.sha1 不一致,派生名验真会误拒所有匿名用户';
  end if;
end;
$selftest$;

-- ── 1. 词表 ───────────────────────────────────────────────────────────────────
create table if not exists public.banned_words (
  word       text primary key,          -- 已归一化(normalize_name 的输出形态)
  category   text not null,             -- porn / abuse / hate / politics / violence
  match_mode text not null default 'cjk'   -- cjk = 任意位置子串;latin = 从词首
    check (match_mode in ('cjk', 'latin'))
);

alter table public.banned_words enable row level security;
-- 故意不建任何 anon/authenticated 策略:RLS 开启 + 零策略 = 全拒。
-- 词表不该公开 —— 公开了就等于把「怎么绕过」直接发给用户。service_role 绕过 RLS。
grant select, insert, update, delete on public.banned_words to service_role;

-- 整名白名单:已知会被误伤的正常昵称(见 resources/wordlist/allow.txt)
create table if not exists public.allowed_names (
  name text primary key                 -- 已归一化,整名精确匹配才放行
);
alter table public.allowed_names enable row level security;
grant select, insert, update, delete on public.allowed_names to service_role;

-- ── 2. normalize_name() —— 必须与 names.py 的 normalize() 逐字一致 ─────────────
-- NFKC -> 小写 -> 繁转简/同形字/leet -> 去掉所有非字母数字
create or replace function public.normalize_name(txt text)
  returns text
  language sql
  immutable
  set search_path = ''
as $namefold$
  select regexp_replace(
           translate(
             lower(normalize(coalesce(txt, ''), NFKC)),
             '!$+0134578@|ɡαβγεικμνορστυχавекморстухѕіјһԁן亂個們傑劉動國團場壇壓妝姦媽孫學實對屍幫幹廢廣張強彈憲應戀擊時會東楊槍樣權殘殺滅澤灣為煉猶獄獨獸產發監種納級組絕統綁維網織罵義習腎腦臺舉華萬藥褲襠襲視詐話語論議豬販賣賤賭趙軍輪轉這運選鄧鎮門開間關陰陳陽階隸雜雞韓領頭養馬駡騙騷體鮮鴨麼黃點黨',
             'istoieastbaigabyeikuvopotuxabekmopctyxsijhdl乱个们杰刘动国团场坛压妆奸妈孙学实对尸帮干废广张强弹宪应恋击时会东杨枪样权残杀灭泽湾为炼犹狱独兽产发监种纳级组绝统绑维网织骂义习肾脑台举华万药裤裆袭视诈话语论议猪贩卖贱赌赵军轮转这运选邓镇门开间关阴陈阳阶隶杂鸡韩领头养马骂骗骚体鲜鸭么黄点党'
           ),
           '[^[:alnum:]]', '', 'g')
$namefold$;

-- 空格形态:非字母数字压成单个空格。拉丁词的词首匹配靠它。
create or replace function public.spaced_name(txt text)
  returns text
  language sql
  immutable
  set search_path = ''
as $namefold$
  select btrim(regexp_replace(
           translate(
             lower(normalize(coalesce(txt, ''), NFKC)),
             '!$+0134578@|ɡαβγεικμνορστυχавекморстухѕіјһԁן亂個們傑劉動國團場壇壓妝姦媽孫學實對屍幫幹廢廣張強彈憲應戀擊時會東楊槍樣權殘殺滅澤灣為煉猶獄獨獸產發監種納級組絕統綁維網織罵義習腎腦臺舉華萬藥褲襠襲視詐話語論議豬販賣賤賭趙軍輪轉這運選鄧鎮門開間關陰陳陽階隸雜雞韓領頭養馬駡騙騷體鮮鴨麼黃點黨',
             'istoieastbaigabyeikuvopotuxabekmopctyxsijhdl乱个们杰刘动国团场坛压妆奸妈孙学实对尸帮干废广张强弹宪应恋击时会东杨枪样权残杀灭泽湾为炼犹狱独兽产发监种纳级组绝统绑维网织骂义习肾脑台举华万药裤裆袭视诈话语论议猪贩卖贱赌赵军轮转这运选邓镇门开间关阴陈阳阶隶杂鸡韩领头养马骂骗骚体鲜鸭么黄点党'
           ),
           '[^[:alnum:]]+', ' ', 'g'))
$namefold$;

-- ── 3. username_rejection() —— 通过返回 NULL,否则返回原因码 ────────────────────
-- 原因码与 names.py 的 check() 完全对应:too_long / bad_char / impersonation / banned
create or replace function public.username_rejection(txt text)
  returns text
  language plpgsql
  security definer
  stable
  set search_path = ''
as $$
declare
  raw     text := btrim(coalesce(txt, ''));
  dense   text;
  spaced  text;
  pfx     text;
begin
  -- 空 = 未设置,合法(客户端会回落成「匿名用户#哈希」)
  if raw = '' then
    return null;
  end if;

  if length(raw) > 16 then
    return 'too_long';
  end if;

  -- 零宽 / 方向覆盖 / 控制字符:正常昵称不会有,出现即视作刻意绕过
  if raw ~ '[\u00ad\u115f\u1160\u180e\u200b\u200c\u200d\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u2060\u2061\u2062\u2063\u2064\u2066\u2067\u2068\u2069\u3164\ufeff\uffa0[:cntrl:]]' then
    return 'bad_char';
  end if;

  dense := public.normalize_name(raw);
  if dense = '' then                       -- 纯符号名,没有可读内容
    return 'bad_char';
  end if;

  -- 整名白名单优先:已知误伤先放行
  if exists (select 1 from public.allowed_names a where a.name = dense) then
    return null;
  end if;

  -- 冒充官方 / 匿名用户
  foreach pfx in array array['匿名用户', '匿名玩家', '官方', '管理员', '系统消息', 'anonymous', 'admin', 'administrator', 'moderator', 'official', 'system', 'staff', 'tokenforest', '匿名ユーザー', '익명사용자'] loop
    if dense like pfx || '%' then
      return 'impersonation';
    end if;
  end loop;

  -- 中文:稠密串上任意位置匹配(中文没有词边界,夹字绕过必须抓)
  if exists (select 1 from public.banned_words w
             where w.match_mode = 'cjk' and position(w.word in dense) > 0) then
    return 'banned';
  end if;

  -- 拉丁:要求从词首开始。任意位置匹配会误杀 Scunthorpe 这类正常词
  spaced := public.spaced_name(raw);
  if exists (select 1 from public.banned_words w
             where w.match_mode = 'latin' and spaced ~ ('(^| )' || w.word)) then
    return 'banned';
  end if;

  -- "f u c k" 这类逐字母拆开的写法:词首规则按设计会放过,但连续 3 段以上单字母
  -- 本身就是绕过信号,单独在稠密串上再查一次拉丁词
  if spaced ~ '(^| )[[:alnum:]]( [[:alnum:]]){2}( |$)'
     and exists (select 1 from public.banned_words w
                 where w.match_mode = 'latin' and position(w.word in dense) > 0) then
    return 'banned';
  end if;

  return null;
end;
$$;

grant execute on function public.normalize_name(text)     to service_role;
grant execute on function public.spaced_name(text)        to service_role;
grant execute on function public.username_rejection(text) to service_role;

-- ── 4. 触发器 ────────────────────────────────────────────────────────────────
-- SECURITY DEFINER 的理由:INSERT 分支要回查本表旧行(见文件头「upsert 陷阱」),
-- 而写入方是 authenticated/anon,RLS 与列级 grant 都不保证它读得到 —— definer 以
-- 迁移执行者身份读,只读 username 一列,不放大任何写权限。
create or replace function public.validate_leaderboard_username()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  reason   text;
  old_name text;
  suffix   text;
begin
  -- 只在 username 真的变了时校验。理由见文件头 —— 少了这条会拒掉只改 bkt_* 的 PATCH,
  -- 并且把库里已有的不合规历史行永久锁死。
  -- ⚠️ 客户端主路径是 upsert(INSERT … ON CONFLICT):BEFORE INSERT 时 TG_OP='INSERT'
  -- 而行可能早已存在 —— 必须回查旧行,名字没变就视同「未改名更新」豁免,否则存量行
  -- 一旦被新词表命中就永久锁死同步(文件头事故 b 的 upsert 变体)。
  if TG_OP = 'INSERT' then
    select l.username into old_name
      from public.leaderboard l where l.user_id = NEW.user_id;
    if found and NEW.username is not distinct from old_name then
      return NEW;
    end if;
  elsif NEW.username is not distinct from OLD.username then
    return NEW;
  end if;

  -- 自家派生匿名名验真放行:「<四语前缀>#<sha1(user_id) 前 4 位>」且后缀与本行
  -- user_id 一致才是 App 生成的;后缀对不上的是真人手输冒充,落回下面的
  -- username_rejection() 走 impersonation 拒绝。
  suffix := substr(encode(extensions.digest(NEW.user_id::text, 'sha1'), 'hex'), 1, 4);
  if NEW.username in ('匿名用户#' || suffix, 'Anonymous#' || suffix, '匿名ユーザー#' || suffix, '익명 사용자#' || suffix) then
    return NEW;
  end if;

  reason := public.username_rejection(NEW.username);
  if reason is not null then
    -- 方括号标记给客户端做机器识别(见 leaderboard.py 的 NAME_REJECTED_MARK)。
    -- 用方括号是沿用 refresh_session 的 [transient]/[rejected] 约定:防止被代理/WAF
    -- 的拦截页正文误匹配。
    raise exception 'username rejected [name_rejected] %', reason
      using errcode = '23514';          -- check_violation -> PostgREST 回 400
  end if;
  return NEW;
end;
$$;

-- 名字里的 aa 是为了排在 leaderboard_capture_history_* 前面(同类触发器按名字字母序
-- 触发)。校验失败会回滚整条语句,所以先跑校验能省下白做又被回滚的 history 写入。
drop trigger if exists leaderboard_aa_validate_username on public.leaderboard;
create trigger leaderboard_aa_validate_username
  before insert or update on public.leaderboard
  for each row execute function public.validate_leaderboard_username();
