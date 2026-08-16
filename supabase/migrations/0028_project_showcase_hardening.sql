-- Migration: 0028_project_showcase_hardening
--
-- 「项目展示」这一组(0022–0027)的收尾迁移。**这是这条线上最后一个要手工执行的文件**,
-- 0027 已被本文件整个吸收并从仓库里删掉 —— 只跑这一个。
--
-- 0022 起我们连着交付了四个补丁,每一个都是上线之后才发现坏的:
--     0023 修 0022(新加的四个列没授权,客户端 upsert 静默 403)
--     0024 修 0022(图片主机名正则是通配,任何 Supabase 项目都通得过)
--     0026 修 0025(security_invoker 视图撞上被撤权的列,整表 42501)
--     0027 修 0025(新建的许可表没给 service_role,整个 /ranger 控制台瘫掉)
-- 除了 0024,病根是同一条,写在这里免得第五次:
--
--   ⚠️ **这个库里,新建的对象不会自动带上任何权限。**
--      • 0001 起「Automatically expose new tables」是关的,service_role 从来没有靠
--        默认权限拿到过 public 下的任何东西(0005:81-90 已经写过一次);
--      • 0008 为了藏 bkt_*,把 leaderboard 的表级 SELECT 退化成了逐列授予,
--        0016 又为了藏 raw_score / held_tokens 把 INSERT / UPDATE 也退化成逐列 ——
--        逐列授权之后,**ALTER TABLE 加的新列不在任何授权里**;
--      • PostgreSQL 对**函数**恰好相反:新函数默认 `EXECUTE` 给 `PUBLIC`。
--        建函数时不写 `revoke all … from public`,等于顺手把它发布成了匿名 API。
--   所以:**每一个 create 都必须在同一个文件里带上它自己的 grant / revoke。**
--   本文件里每一个新建或重建的对象,授权都紧跟在它下面,没有一处例外。
--
-- ── 本文件解决的四类问题 ─────────────────────────────────────────────────────
--
-- ① 两个对象缺 service_role 授权(=0027 的全部内容,外加它漏掉的那一个)
--    实测(service_role key,2026-08-16):
--      GET /rest/v1/leaderboard_project_allowances → 403 42501  → /ranger 整页空
--      GET /rest/v1/leaderboard_public             → 403 42501  → 今天没人读,但同一类雷
--    把 PostgREST 暴露出来的每一张表和视图都用 service_role 探了一遍,应用真正读到的
--    对象里**只有这两个是 403**(另有 0011 留下的两张 backup_leaderboard_* 快照表也是
--    403,但没有任何代码读它们,不在本文件范围内)。
--
-- ② 提权函数放在了 PostgREST 暴露的 public schema,变成匿名探针
--    0026 建的 public.project_visible(uuid) 是 security definer、EXECUTE 给了 anon,
--    而 anon 本来就能列出全部 user_id(0008 为了 App 的撤榜路径特意保留)。于是:
--      anon: GET /rest/v1/leaderboard?select=user_id      → 20 个 uuid
--      anon: GET /rest/v1/rpc/project_visible?p_user_id=… → 19 个 true,1 个 false
--      service_role 对账:那个 false 正是 held_tokens=1760558193 的 Yohann,
--      而他**根本没填过项目展示**。
--    也就是说:任何拿着公开 key 的人,20 次请求就能把整张扣留名单拉出来 —— 这比
--    0025 权衡后接受的那个泄漏(「填了项目的被扣账号」)大一整圈,直接推翻 0016 的
--    「扣留必须无声」。0025:14-17 接受的是前者,不是这个。
--    public.is_project_allowed(uuid) 同理:它一个 user_id 一次地回答「谁被人工放行过」,
--    正是 0027:29-31 说「任何人都不该知道」的那件事。
--    **0017 早就示范过正确做法**:private.hold_ratio() 放在 private schema,
--    PostgREST 只暴露 public / graphql_public(实测 `Accept-Profile: private` → PGRST106),
--    所以那个函数从外面根本喊不到。0026 没照做,本文件照做。
--
-- ③ 建函数忘了 `revoke all … from public`,把违禁词表做成了在线判词器
--    0022:105 只写了 `grant execute … to service_role`,没有配套的 revoke;
--    PostgreSQL 默认 EXECUTE 给 PUBLIC,所以那句 grant 是多余的,而洞是敞开的:
--      anon: GET /rest/v1/rpc/project_text_rejection?txt=fuck&max_len=24 → "banned"
--      anon: GET /rest/v1/banned_words                                  → 401 42501
--    直路封死、函数是后门 —— 而这个函数是 security definer,存在的理由就是替 anon
--    去读它读不到的 banned_words。一个字一个字试,整张词表可以完整拖走,拖走就等于
--    拿到了绕过办法。**0013 的昵称那一侧漏得一模一样**,同样实测可复现:
--      anon: /rpc/username_rejection?txt=fuck → "banned"
--      anon: /rpc/normalize_name?txt=Hello    → "hello"
--      anon: /rpc/spaced_name?txt=Hello World → "hello world"
--    对照 0024:47 的 project_image_prefix() —— 那一个写了 revoke,今天 anon 调它
--    就是 42501。同一个仓库里两种写法,这次统一。
--    关掉不影响任何人:这四个函数在库内的调用点全部落在 security definer 函数里
--    (validate_leaderboard_project / validate_leaderboard_username /
--     sanitize_leaderboard_model),definer 以属主身份调用,不看调用者的 EXECUTE;
--    桌面端拿到的拒绝理由一直是触发器抛的 `[project_rejected]` / `[name_rejected]`
--    标记(0013:220 写明这是给客户端做机器识别的约定),它自己那份词表在
--    src/names.py 和 resources/wordlist/ 里,从来不需要调这些 RPC;网站侧全仓 grep
--    这六个名字,零命中。
--
-- ④ 关掉项目展示不会删图,而删图失败会连坐撤榜
--    0022:251-254 的清理触发器是 `after delete on public.leaderboard` —— 只覆盖「整个撤榜」。
--    玩家把开关关掉时,客户端发的是四个空字符串,BEFORE 触发器把它们归一成 NULL,
--    **行还在**,触发器不响,图继续挂在公网上:
--      无 key、无 Authorization:GET /storage/v1/object/public/project-images/<uid>.webp
--      → 200 image/webp 5504 bytes
--    而六份隐私文件都写着「下次同步会清空这些字段并删除已上传的图片」。现在那句话
--    只由客户端那一次删除兑现,它一失败就永远没有第二次。
--    同时,0022 那个 delete 没有任何异常保护:它跨 schema 写 storage.objects,一旦
--    属主没权限或撞上 RLS,异常会往上冒,把整条 `DELETE FROM public.leaderboard`
--    带崩 —— 那是 0003 的「把我从榜上撤下来」路径,对**所有**用户,不只是有图的。
--    本文件让两条清理路径都变成「尽力而为、失败只写 warning」。
--
-- 另外收一条历史欠账:anon 至今能读 leaderboard.app_version 和 leaderboard.prev_uid。
-- 0008:109-110 当时的判断是「app_version 不敏感,没人依赖藏它」,那时还没有隐私声明;
-- 现在六份文件的字段表把这两项都标成「是否公开显示:否」,而 anon key 一查就有。
-- prev_uid 更直接:它把一个人的旧匿名身份和新匿名身份连起来。网站侧只有 /ranger
-- 用到这两列,走的是 service_role;anon 的三条读取路径(leaderboard_public 视图、
-- 价值/用量榜的 join、/badge 路由)一列都没用到 —— 全仓 grep 确认过。撤掉。
--
-- ── ⚠️ 视图为什么必须保持 security_invoker,以及逐列的权限推演 ────────────────
--
-- 0026:23-34 已经把这个取舍钉死了,这里不重开:definer 视图要在视图里手抄一份
-- `where not is_banned(...)`,那份手抄一旦和 0005 的策略走散,**被封禁的人会重新
-- 出现在公开榜上** —— 这是这个功能最坏的故障。所以视图继续 security_invoker,
-- 封禁继续由 RLS 管。
--
-- 代价是 0025 栽过的那一刀:security_invoker 视图要求**调用者**对视图引用到的每一列
-- 都有 SELECT 权限,少一列不是「那一列为空」,是整个查询 42501。所以下面这份视图
-- 引用到的每一样东西,都要能被 anon 摸到。逐个过一遍(括号里是实测,anon key,今天):
--
--   l.id                      ← 0008 逐列授回时在列表里          (GET select=id          → 200)
--   l.username                ← 同上                              (select=username        → 200)
--   l.score                   ← 同上                              (select=score           → 200)
--   l.stage_index             ← 同上                              (select=stage_index     → 200)
--   l.tree, l.region          ← 0005:39-41 补建(早于 0008,在清单里)(select=tree/region → 200)
--   l.trees                   ← 0004 加,0008 之前                (select=trees           → 200)
--   l.created_at, l.updated_at← 0008 列表里                       (select=created_at/…    → 200)
--   l.project_name/desc/url/image
--                             ← 0023 授予 → 0025 对 anon 撤掉 → 0026 又还回来
--                                                                 (四列 select 各 → 200)
--   l.user_id                 ← 0008:112-114 特意保留(App 的
--                                DELETE … WHERE user_id 需要它)  (select=user_id         → 200)
--   RLS 策略 leaderboard_select_public 里的 public.is_banned(uuid)
--                             ← 0005:54 给了 anon EXECUTE          (rpc/is_banned          → 200)
--   private.project_visible(uuid)
--                             ← 需要**两样**东西:schema private 的 USAGE(0017:128 已给
--                                anon/authenticated,0016:119 给了 service_role)**加上**
--                                函数本身的 EXECUTE。函数级 EXECUTE 不含 schema 的
--                                USAGE —— 0017:126-127 为此专门写过一段。本文件把两样
--                                都重新授一次(幂等)。
--
--   视图**不引用** l.held_tokens,也不引用 leaderboard_project_allowances ——
--   这两样 anon 一个都摸不到(select=held_tokens → 401 42501;
--   GET /rest/v1/leaderboard_project_allowances → 401 42501)。它们只在
--   private.project_visible() 内部被读,那是 security definer,以属主身份读,
--   只回一个 boolean,原始数字和许可名单都出不去 —— 与 0017 的 hold_ratio 同一个手法。
--
-- 这条路线不是纸上推演,**线上已经跑着一份一模一样的**:0017 的 public.leaderboard_value
-- 就是「security_invoker 视图 + private schema 里的 definer 函数」,今天用 anon key
-- GET /rest/v1/leaderboard_value → 200。所以「anon 能不能穿过 private」这个问题,
-- 已经有一个生产环境的肯定答案了。
--
-- 顺带说明一个**没有采纳**的方案:审计里有人建议把「项目名非空」这一步也折进
-- project_visible(),让它返回 false 只意味着「被扣 且 填了项目」。那是为了在函数继续
-- 留在 public、继续被 anon 直调的前提下缩小泄漏面。既然本文件把它整个搬进 private、
-- anon 再也喊不到,这个缓解就没有必要了 —— 保持 0026 的语义原样(判定拆成
-- 「名字非空」在视图里 + 「扣留/许可」在函数里),改动面最小,线上行为不变。
--
-- ── ⚠️ 本文件**故意没有关掉**的那个洞:基表上的四个 project_* 列 ─────────────
--
-- 事实(实测,anon key,2026-08-16):
--   GET /rest/v1/leaderboard?select=user_id,project_name,project_desc,project_url,project_image
--     &project_name=not.is.null  → 200,连同 Popout Market 那一整行原样返回。
-- 也就是说:视图里那条「被扣留就不公开」的规则,绕开视图直接查基表就没有了。多个审计
-- 都把这一条判成 blocking,并且提了两种改法。两种都看过、都试过,结论是**都不做**:
--
--   改法 A(某个审计的原话):`alter view … set (security_invoker = false)`,然后就能
--     撤掉 anon 的列权限。**这个改法会把被封禁的人放回公开榜单。**definer 视图是以
--     视图属主的身份读基表的,0005 那条 `not is_banned(user_id)` 的行级策略对属主不生效。
--     本地 PostgreSQL 16 上按同样的属主关系实测,一句话就能复现:
--       security_invoker=false + 给 Alpha 加一条封禁 → anon 查视图,Alpha **还在**,项目也在;
--       security_invoker=true  + 同一条封禁          → anon 查视图,Alpha 消失。
--     这正是 0026 文件头说的「这个功能最坏的故障」。不采纳。
--
--   改法 B:把四个列的投影整个搬进 private 的 definer 函数(回 jsonb),视图不再引用
--     受限列,然后撤掉 anon 的列权限。技术上成立,但它**买不到它声称的东西**:
--       • 本项目开着匿名登录(实测 external.anonymous_users = true),同一个公开 key
--         多发一次注册请求就是 authenticated;
--       • 而 authenticated 必须保留这四列的 SELECT —— 桌面端的
--         `INSERT … ON CONFLICT DO UPDATE` 要读它们,撤掉就是 0023 那次静默 403 重演。
--       所以改法 B 只是把「一次请求读到」变成「两次请求读到」。
--       • 更要紧的是:图片根本不在这条路上。bucket 是 public 的,
--         GET /storage/v1/object/public/project-images/<uid>.webp **不带任何 key** 就是 200
--         (实测,5504 字节),而 uid 本来就是公开列。所以就算四个列全撤了,被扣账号的
--         那张图仍然人人可取。要真正做到「扣留期间不可取」,得把 bucket 改成非公开 +
--         签名 URL,那是另一个功能,不是一句 grant。
--     结论:改法 B 会让视图变复杂、让最脆弱的那个对象再改一次结构,换来的是一层
--     挡不住任何认真的人的遮羞布,以及一句仍然不成立的「扣留期间是私密的」。不采纳。
--
-- 所以这一条**留着**,并且按它的真实强度对外说话:隐私文件里已经改成
-- 「被扣留期间不会显示在排行榜上」,而不是「是私密的」。哪天要真正关掉,前提是
-- 先把 bucket 改成非公开 —— 那时候再一起做,不要只撤列权限来制造安全感。
--
-- 同一类、同样留着的还有:
--   • public.is_banned(uuid) 是匿名可调的「这个 uid 封了没」探针 —— 见第 3 节末尾,
--     换掉它要连 0005 的策略一起改;
--   • public.leaderboard_models 带 user_id 匿名可读,能拉出每个人每个模型的精确用量
--     (实测 200)—— 网站的用量榜/价值榜就是从它算出来的,撤了要重做那两个榜;
--     隐私文件里那句「读不出任何一个人的用量」已经按事实改掉了;
--   • storage 对象名的判据是 `split_part(name,'.',1) = auth.uid()`,一个登录用户可以在
--     自己的前缀下建 `<uid>.1.webp` 这类多余对象(0022 的注释说的是 `<uid>.<ext>`,
--     判据比注释松)。收紧成锚定正则挡不住真正的滥用(换一个匿名身份就又有一个名额),
--     而它要动的是桌面端的上传路径 —— 0023 教过那条路多脆。留着,记在这里。
--   • 线上还有一个 public.rls_auto_enable() 事件触发器函数,仓库里的任何迁移都没有创建过它
--     (全仓 grep 零命中)。说明线上 schema 与 supabase/migrations/ 已经有漂移。
--     本文件不碰事件触发器 —— 单独查,别夹在这一次里。
--   • 0011 留下的 backup_leaderboard_20260728 / backup_leaderboard_history_20260728 两张
--     快照表对 service_role 也是 403,但没有任何代码读它们,不在本文件范围内。
--
-- ── 执行须知 ────────────────────────────────────────────────────────────────
-- ⚠️ **整份文件一次性贴进 Supabase SQL Editor,按一次 Run。**
--    文末的「自检失败就整体回滚」只有在整份文件跑在同一个事务里时才成立 ——
--    SQL Editor 就是这么做的(整段文本作为一次查询提交)。
--    **不要**逐句执行,**不要**用 `psql -f` 不带 `--single-transaction`:那样第 1–6 节
--    会先各自提交,第 7 节再报错也撤不回来了。
--    (本文件刻意不写 begin;/commit; —— 写了会和 SQL Editor 自己的隐式事务打架。)
-- ⚠️ 幂等,可重复跑;**0027 跑没跑过都无所谓**(那些 grant 重复授予是空操作)。
-- ⚠️ 文件末尾有一段自检代码会以 anon / authenticated / service_role 的身份**真的读一次**,
--    读不动就抛异常 —— 那时整个迁移回滚,线上保持现在(0026)的状态,不会出现
--    「跑成功了但榜单白屏」的 0025 局面。
-- ⚠️ 锁:本文件对 public.leaderboard 只取 ShareRowExclusive(不挡读,挡写),
--    对 public.leaderboard_public 和 storage.objects 各取一次 AccessExclusive,
--    持有到提交为止。总时长是毫秒级,但请**不要**挑桌面端同步的高峰去跑。
-- 假设 0001–0026 已应用。


-- ═══ 1. 补两个对象的 service_role 授权(吸收 0027) ═══════════════════════════
-- /ranger 的四个调用点各需要什么,逐个对过:
--   getRangerLeaderboard   → select
--   getRangerUserDetail    → select
--   allowProjectAction     → upsert = INSERT … ON CONFLICT DO UPDATE = insert + update + select
--                            (ON CONFLICT 读到的每一列都要 SELECT —— 0023 的教训)
--   disallowProjectAction  → delete(+ 定位行要 select)
-- 主键是 uuid,没有序列要授。service_role 绕过 RLS,所以表上「启用 RLS + 零策略」
-- 不需要额外的 policy。

grant select, insert, update, delete
  on public.leaderboard_project_allowances to service_role;

-- anon / authenticated 什么都不给:能列出这张表就等于能列出「谁被扣留过又被人工放行」。
-- 它的可见性只通过下面那个 private 函数间接体现。

-- leaderboard_public 从 0025 建起就只授给了 anon / authenticated,漏了 service_role。
-- 今天没有服务端路径读它(lib/leaderboard.ts 用的是 anon key),但 0021:93/115/154
-- 的三个视图都是 anon + authenticated + service_role 三个一起给的 —— 这里对齐。
-- (真正的授予写在第 2 节重建视图之后 —— 和视图放在一起,免得又出现「重建了、忘了授权」。)


-- ═══ 2. 可见性判定搬进 private,并重建公开视图 ═══════════════════════════════

-- 2.1 schema 级 USAGE。0017:128 已经给过 anon / authenticated,0016:119 给过 service_role;
--     这里重来一遍(幂等,代价为零),让本文件自己完备,不依赖读者去翻前面两份。
--     说准确:**视图这条路其实只需要函数的 EXECUTE**。schema 的 USAGE 是在「按名字解析
--     对象」的时候检查的,而视图里的函数调用在建视图时就已经解析成 OID 存下来了,
--     之后执行只查函数的 EXECUTE。USAGE 是给「直接按名字调 private.project_visible(…)」
--     那条路准备的 —— 属于兜底,不是视图能不能读的前提。
grant usage on schema private to anon, authenticated, service_role;

-- 2.2 判定函数。语义与 0026 的 public.project_visible 逐字一致,只有两处变化:
--     • 搬到 private —— PostgREST 不暴露这个 schema,于是它不再是匿名探针;
--     • 把原先对 public.is_project_allowed() 的调用**内联**成一个 exists ——
--       原来每行要走两次 definer 调用 + 两次索引查找,而 PostgreSQL 不保证
--       `项目名非空 and project_visible(...)` 这个 and 会短路,所以 19 个根本没填
--       项目的行也在白付这个代价。内联之后每行一次。
--     查不到行时回 true:宁可显示,也不要因为查不到把一个正常账号静默抹掉(0026:58)。
create or replace function private.project_visible(p_user_id uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select coalesce(
    (select coalesce(l.held_tokens, 0) = 0
              or exists (select 1
                           from public.leaderboard_project_allowances a
                          where a.user_id = l.user_id)
       from public.leaderboard l
      where l.user_id = p_user_id),
    true);
$$;

comment on function private.project_visible(uuid) is
  '该账号的项目展示是否应当公开:无扣留,或已获管理员许可。definer 身份读 held_tokens 与许可表,只回布尔值。放在 private —— PostgREST 不暴露该 schema,所以 anon 无法把它当成扣留状态的探针(0017 的 private.hold_ratio 先例)。';

revoke all on function private.project_visible(uuid) from public;
grant execute on function private.project_visible(uuid) to anon, authenticated, service_role;

-- 2.3 重建视图。列清单与 0026 逐字一致 —— lib/leaderboard.ts:124-128 读的就是这 13 列,
--     一列都不能多、不能少、不能改名。唯一的改动是 lateral 里改调 private 那一个。
--
--     ⚠️ 用 `create or replace view`,**不用** `drop view` + `create view`。
--     理由不是风格:`drop view` 会把视图上的授权整个丢掉,重建之后 relacl 是 NULL,
--     必须靠人记得在同一个文件里补授 —— 而 0026 正是在这里漏掉了 service_role
--     (实测:service_role 今天 GET leaderboard_public 是 403)。本地 PostgreSQL 16 实测:
--         create or replace view … → relacl {anon=r, authenticated=r} 原样保留
--         drop view + create view  → relacl NULL,谁都读不了,只剩属主
--     replace 的前提是输出列名 / 顺序 / 类型完全不变 —— 上面那 13 列与 0026 逐字相同
--     (实测线上视图返回的就是这 13 个列名、这个顺序),所以 replace 合法。
--     下面的 grant 保留着,当作第二道保险,不是唯一一道。
create or replace view public.leaderboard_public
  with (security_invoker = true)     -- ⚠️ 少了这行,0005 的封禁 RLS 就不再作用于访客
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
    and private.project_visible(l.user_id) as visible
) v;

comment on view public.leaderboard_public is
  '公开榜单读取入口。已应用项目展示可见性规则。security_invoker,所以 0005 的封禁 RLS 照常生效;受限列的判定走 private.project_visible()。';

-- create or replace 会保留原有授权,但 0026 漏掉的 service_role 本来就不在里面,
-- 所以这一句既是补漏也是兜底(重复授予是空操作)。
grant select on public.leaderboard_public to anon, authenticated, service_role;

-- 2.4 视图不再引用它们之后,把 public 里的两个探针删掉。
--     顺序不能反:视图还在引用时 drop function 会因依赖而失败。
--     全仓 grep(*.ts / *.tsx / *.sql)确认除了 0025/0026 自身和注释,没有任何调用点。
drop function if exists public.project_visible(uuid);
drop function if exists public.is_project_allowed(uuid);


-- ═══ 3. 关掉违禁词判词器(项目侧 + 0013 的昵称侧) ═══════════════════════════
-- 写法对齐 0024:47 —— 先 `revoke all … from public` 拿掉 PostgreSQL 的默认 EXECUTE,
-- 再显式对 anon / authenticated 撤一次(将来若有人手滑授过,这一句兜住),
-- 最后只留 service_role。四个函数库内的调用点全部在 security definer 函数里,
-- definer 以属主身份调用,不看调用者的 EXECUTE —— 触发器照常工作。

revoke all     on function public.project_text_rejection(text, integer) from public;
revoke execute on function public.project_text_rejection(text, integer) from anon, authenticated;
grant  execute on function public.project_text_rejection(text, integer) to service_role;

revoke all     on function public.username_rejection(text) from public;
revoke execute on function public.username_rejection(text) from anon, authenticated;
grant  execute on function public.username_rejection(text) to service_role;

-- normalize_name / spaced_name 本身不读 banned_words,单独看只泄漏「归一化算法」;
-- 但它们是上面两个判词器的前处理,留着就等于把「怎么构造绕过输入」的试验台留着。
-- 调用点:0013 的 username_rejection、0022 的 project_text_rejection、
-- 0015:137 的 sanitize_leaderboard_model —— 三个都是 security definer。
revoke all     on function public.normalize_name(text) from public;
revoke execute on function public.normalize_name(text) from anon, authenticated;
grant  execute on function public.normalize_name(text) to service_role;

revoke all     on function public.spaced_name(text) from public;
revoke execute on function public.spaced_name(text) from anon, authenticated;
grant  execute on function public.spaced_name(text) to service_role;

-- 不动 public.is_banned(uuid):0005 的行级策略 `not public.is_banned(user_id)` 是以
-- **调用者**身份求值的,anon 少了这个 EXECUTE,整张 leaderboard 就读不动了。
-- 它确实也是一个「这个 uid 被封没有」的探针,但那是 0005 的既有设计,换掉它要连
-- 策略一起改,不属于本文件的范围 —— 记在这里,别当成漏看。
--
-- ✅ 「桌面端会不会把这四个函数当 RPC 调」——这一条已经**直接查过发布出去的二进制**,
--    不再是推理。方法与结果(2026-08-16):
--      从 Release 下载 v0.2.2 / v0.2.0 / v0.1.9 的 TokenForest-windows.zip,
--      按 PyInstaller 的 CArchive 格式解出 TOC,再把 PYZ.pyz 里的模块逐个 zlib 解压
--      (v0.2.2 = 164 个模块),然后在全部模块字节里找字符串。
--      对照组(证明这个扫描确实看得见客户端的请求字符串)—— 三个版本全部命中:
--        `/rest/v1/leaderboard`、`on_conflict`、`apikey`
--      目标字符串 —— 三个版本**一个都没有**:
--        project_text_rejection / username_rejection / normalize_name / spaced_name /
--        is_project_allowed / project_visible / is_banned / `/rpc/` / `rest/v1/rpc` /
--        `select=` / `object/list`
--      客户端完整的请求面就这么几条,没有第五条:
--        PATCH  /rest/v1/leaderboard?user_id=eq.<uid>
--        POST   /rest/v1/leaderboard?on_conflict=user_id        (Prefer: merge-duplicates)
--        POST   /rest/v1/leaderboard_models?on_conflict=user_id,model
--        DELETE /rest/v1/leaderboard?user_id=eq.<uid>
--        PUT / DELETE /storage/v1/object/...                    (x-upsert)
--        POST /auth/v1/signup、POST /auth/v1/token
--    顺带把第 4 节和第 6 节也一起证明了:客户端从不列举 bucket(没有 `object/list`),
--    也从不按列读回(没有 `select=`)—— 它只是把 app_version / prev_uid **写**进 payload。
--    覆盖面说清楚:查的是 v0.1.9 / v0.2.0 / v0.2.2 三个 Windows 包。项目侧那个函数是
--    今天(0022)才建的,只有 v0.2.2 有机会调;昵称侧那三个是 0013(v0.2.0 之后)才有的,
--    v0.1.x 的客户端连这些函数都还不存在。所以这三个版本足以覆盖真实的暴露窗口。
--    真要万一,**撤销仍然是一行**,不需要再写一个迁移:
--      grant execute on function public.<那个函数名> to anon, authenticated;
--      notify pgrst, 'reload schema';


-- ═══ 4. 收窄 Storage 的读取策略 ═════════════════════════════════════════════
-- 0022:227-230 给了 anon 整桶的 SELECT,注释说是「方便后台按对象名列举」——
-- 但后台用的是 service_role,它绕过 RLS,根本不需要这条。这条策略今天唯一的实际
-- 效果是:任何拿着公开 key 的人都能列出整桶,拿到每个上传者的 user_id、上传时间和
-- 字节数,并且能发现那些**视图正在抑制**的图(被扣账号的、客户端清理失败残留的)。
--
-- 删掉它不影响任何人看图:bucket 是 public 的,公开读走 /object/public/… 那条路径,
-- **完全不经过 RLS**。实测:不带 apikey、不带 Authorization 直接 GET 那张图 → 200。
-- next.config.ts 的 remotePatterns 钉的也正是 /storage/v1/object/public/project-images/**。
--
-- 保留一条「只能看自己那一个对象」的策略:客户端覆盖上传(upsert)时会先探一下
-- 对象在不在,那一步要 SELECT。对象名固定是 `<user_id>.<ext>`,和 0022 的三条写策略
-- 用同一个判据。

drop policy if exists "project image read"     on storage.objects;
drop policy if exists "project image read own" on storage.objects;
create policy "project image read own"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-images'
         and split_part(name, '.', 1) = auth.uid()::text);


-- ═══ 5. 图片清理:关掉开关就删,且两条路都不再致命 ═══════════════════════════

-- 5.1 撤榜路径:加上异常保护。
--     ⚠️ 这一条是本文件里唯一一处**不是**为了新功能而改的:0022 的版本没有异常块,
--     跨 schema 删 storage.objects 一旦失败(属主没有 DELETE 权限、或撞上 storage 的
--     RLS),异常会往上冒,把整条 `DELETE FROM public.leaderboard` 一起带崩 ——
--     那是 0003 的「把我从榜上撤下来」,对所有用户,不只是有图的用户。
--     隐私上宁可少删一张图,也不能让一个人删不掉自己的记录。失败写 warning,
--     在 Supabase 的 Postgres 日志里搜 `project_image_cleanup_failed` 就能捞出来。
--
--     已知且接受的局限:删掉 storage.objects 里的行会让公开 URL 立刻 404(隐私目的
--     达成),但 S3 上的字节要由 storage-api 才能真正回收,SQL 这一侧做不到。
--     线上现在总共 1 个对象、5504 字节,配额影响可以忽略;要真正回收,在 Dashboard
--     的 Storage 里删一次即可。
create or replace function public.drop_project_image_on_delete()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  begin
    delete from storage.objects
     where bucket_id = 'project-images'
       and split_part(name, '.', 1) = OLD.user_id::text;
  exception when others then
    raise warning '[project_image_cleanup_failed] on delete %: %', OLD.user_id, sqlerrm;
  end;
  return OLD;
end;
$$;

revoke all on function public.drop_project_image_on_delete() from public;

-- ⚠️ `create or replace trigger`(PostgreSQL 14+),**不是** `drop trigger` + `create trigger`。
--    本地 PostgreSQL 16 实测的锁级别:
--        drop trigger if exists(触发器存在时)→ public.leaderboard 上 AccessExclusiveLock
--        create or replace trigger           → public.leaderboard 上 ShareRowExclusiveLock
--    AccessExclusive 会一直**持有到事务提交**,也就是覆盖后面所有 DDL、撤权和三次自检读,
--    期间整张 leaderboard 连读都读不了(榜单页、价值榜、/badge 全部挂住),而且这把锁
--    要排在所有在途读写之后才拿得到 —— 万一排队超过 SQL Editor 的语句超时,这一次就白跑了,
--    正是本文件要避免的「再来一次」。ShareRowExclusive 不挡读,只挡写。
--    版本前提是确定的:0025/0026 用的 `with (security_invoker = true)` 视图选项是
--    PostgreSQL **15+** 才有的语法,而它们已经在线上跑过 —— 所以线上至少是 15。
create or replace trigger trg_drop_project_image
  after delete on public.leaderboard
  for each row execute function public.drop_project_image_on_delete();

-- 5.2 关掉开关的路径(本文件新增)。
--     触发条件写在 WHEN 里:旧的图存在,且这次「图」或「名字」真的变了。三种情形都命中:
--       • 关掉项目展示 → 四个空字符串 → BEFORE 触发器归一成 NULL → 删掉整个前缀;
--       • 换了一张图并且扩展名也换了(webp → png)→ 旧对象不会被覆盖,要单独删;
--       • **只把项目名清空、图原样留着** → 视图判定「没填名字 = 没有项目」,面板消失,
--         但图还挂在公网上。审计单独把这一条列了出来,而六份隐私文件写的是
--         「关掉开关会删掉已上传的图片」—— 所以这一条也必须删图,不能只看 project_image。
--     换图那一种情形有个陷阱:删除判据是「对象名前缀 = user_id」,它会同时命中刚写进来的
--     新对象。所以先算出**新 URL 指向的那个对象名**,把它排除在外。
--     同名覆盖(webp → webp,名字也没动)时 WHEN 不成立,不会误删。
--     v_keep 只在「项目还在(名字非空)且有图」时才算 —— 名字被清空时它保持 null,
--     于是整个前缀都被删掉,这正是上面第三种情形要的结果。
--     NEW.project_name 在这里一定已经被 0022/0024 的 BEFORE 触发器归一过
--     (btrim,空串 → NULL),所以判「is not null」就够,不必再 btrim 一次。
create or replace function public.drop_project_image_on_unset()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_keep text := null;
begin
  if NEW.project_image is not null and NEW.project_name is not null then
    -- 0024 的校验触发器保证 project_image 一定以 project_image_prefix() 开头,
    -- 所以这里切出来的就是 storage.objects.name(对象都放在 bucket 根目录)。
    v_keep := substr(NEW.project_image, length(public.project_image_prefix()) + 1);
  end if;

  begin
    delete from storage.objects
     where bucket_id = 'project-images'
       and split_part(name, '.', 1) = OLD.user_id::text
       and (v_keep is null or name <> v_keep);
  exception when others then
    raise warning '[project_image_cleanup_failed] on unset %: %', OLD.user_id, sqlerrm;
  end;

  return null;
end;
$$;

revoke all on function public.drop_project_image_on_unset() from public;

-- 同样用 create or replace(见 5.1 的锁级别实测)。
-- 监听列表里必须带上 project_name:只清名字、不动图,是上面第三种情形。
create or replace trigger trg_drop_project_image_unset
  after update of project_name, project_image on public.leaderboard
  for each row
  when (OLD.project_image is not null
        and (OLD.project_image is distinct from NEW.project_image
             or OLD.project_name is distinct from NEW.project_name))
  execute function public.drop_project_image_on_unset();


-- ═══ 6. 撤掉 anon 对 app_version / prev_uid 的读取 ═══════════════════════════
-- 只撤 anon,**不动 authenticated** —— 桌面端的主写入路径是
-- `INSERT … ON CONFLICT (user_id) DO UPDATE`,它对 payload 里的每一列都要 SELECT,
-- 少一列整条请求 42501 静默失败。那正是 0023 的整个由来,不能重演。
-- 桌面端是匿名登录会话,身份是 authenticated(0016:483-485 也只给 authenticated
-- 授了逐列的 INSERT/UPDATE,anon 根本写不进来),所以撤 anon 不影响同步。
-- 网站侧三条 anon 读取路径都不碰这两列:leaderboard_public 视图的 13 列里没有;
-- lib/leaderboard-boards.ts:172 的 join 列表里没有;app/badge/[userId]/route.ts:214
-- 的四列里也没有。/ranger 用 service_role,不受影响。
--
-- ⚠️ **这一撤到底关掉了什么,说准确**:它关掉的是 `anon` 这个角色,不是「拿着公开 key 的人」。
--    本项目开着匿名登录(实测 GET /auth/v1/settings → external.anonymous_users = true,
--    disable_signup = false),所以同一个公开 key 多发一次注册请求就能拿到 authenticated 会话,
--    而 authenticated 必须保留这两列的 SELECT(桌面端 upsert 的读取面,0023 的教训)。
--    因此这是「不再显示、匿名角色也读不到」,**不是**「数据库层面锁死」。
--    隐私文件里那句「否 = 不出现在公开页面上」正是按这个强度写的,两边一致;
--    不要把它升级成「任何人都拿不到」。
-- 同样给一条一行的退路(理论上用不到,但代价是零):
--   grant select (app_version, prev_uid) on public.leaderboard to anon;
--   notify pgrst, 'reload schema';
revoke select (app_version, prev_uid) on public.leaderboard from anon;


-- ═══ 7. 自检:以真实身份读一次,读不动就整体回滚 ═════════════════════════════
-- 这一段的存在理由:0025 的失败之所以要多花一个迁移,是因为**没有人以 anon 的身份
-- 真的查一次那个视图**。授权表看上去都对,查询却直接 42501。下面这段把这件事
-- 做进迁移本身 —— 有问题就抛异常,整个事务回滚,线上保持 0026 的状态,
-- 绝不会出现「SQL Editor 显示 Success,榜单却白屏」。
--
-- ⚠️ 一条纪律写在前面:**只有「本该能读却读不动」才抛异常**。「切不到某个角色」
--    一律降级成 warning —— 否则一个和本次改动无关的环境差异就能把整份迁移打回,
--    那正是要避免的「再来一次」。
do $verify$
declare
  n_anon   bigint;
  n_auth   bigint;
  n_admin  bigint;
  ok_anon  boolean := true;
  ok_auth  boolean := true;
  ok_admin boolean := true;
  v_definer   text;
  can_delete  boolean;
  can_bypass  boolean;
begin
  -- ① 逐个探一下这条连接能不能切到这三个角色,一个一个探、探完立刻切回来。
  --    这样拆开是为了**故障隔离**:某个角色在这条连接上切不过去时,只让它那一段降级成
  --    warning,不连累另外两段的检查。(注:SET ROLE 的授权是对**会话用户**判定的,
  --    不是对当前角色,所以连着切并不会因为「anon 不是 authenticated 的成员」而失败 ——
  --    早先的注释在这一点上说错了,拆开的真正理由是上面这条。)
  begin
    perform set_config('role', 'anon', true);
    perform set_config('role', 'none', true);
  exception when others then ok_anon := false;
  end;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('role', 'none', true);
  exception when others then ok_auth := false;
  end;
  begin
    perform set_config('role', 'service_role', true);
    perform set_config('role', 'none', true);
  exception when others then ok_admin := false;
  end;

  -- ② anon:必须能把 13 列整份读出来。这是 0025 栽的那一刀。
  if ok_anon then
    perform set_config('role', 'anon', true);
    select count(*) into n_anon from public.leaderboard_public;
    perform id, username, score, stage_index, tree, region, trees, created_at, updated_at,
            project_name, project_desc, project_url, project_image
       from public.leaderboard_public limit 1;

    -- ③ anon:基表上「价值榜 join」和「/badge 路由」还要用到的那几列不能被误伤。
    perform id, user_id, username, score, stage_index, tree, region, trees, created_at, updated_at
       from public.leaderboard limit 1;

    perform set_config('role', 'none', true);
  else
    raise warning '[0028] ⛔⛔⛔ 切不到 anon —— 本文件最重要的那一项自检(anon 能不能读视图,
                   也就是 0025 白屏的那一刀)**没有跑**。这次提交不代表榜单还活着。
                   跑完必须立刻手工执行文末 8.4 的两条 anon 请求,那是**必做**不是可选。';
  end if;

  -- ④ authenticated:视图和四个 project 列都还在(客户端 upsert 的读取面)。
  if ok_auth then
    perform set_config('role', 'authenticated', true);
    select count(*) into n_auth from public.leaderboard_public;
    perform user_id, app_version, prev_uid, project_name, project_desc, project_url, project_image
       from public.leaderboard limit 1;
    perform set_config('role', 'none', true);
  else
    raise warning '[0028] 切不到 authenticated,已跳过该侧自检。';
  end if;

  -- ⑤ service_role:0027 要修的那两张表,现在都得读得动。
  if ok_admin then
    perform set_config('role', 'service_role', true);
    select count(*) into n_admin from public.leaderboard_public;
    perform user_id from public.leaderboard_project_allowances limit 1;
    perform set_config('role', 'none', true);
  else
    raise warning '[0028] 切不到 service_role,已跳过该侧自检 —— 请务必用 service_role key 手工发一次 8.4 的两条请求。';
  end if;

  -- ⑥ 目录层面的负向检查(确定性读 pg_catalog,不依赖角色切换,不会误报)。
  if to_regprocedure('public.project_visible(uuid)') is not null
     or to_regprocedure('public.is_project_allowed(uuid)') is not null then
    raise exception 'public 里的两个探针函数没删干净';
  end if;
  if has_function_privilege('anon', 'public.project_text_rejection(text,integer)', 'execute')
     or has_function_privilege('anon', 'public.username_rejection(text)', 'execute')
     or has_function_privilege('anon', 'public.normalize_name(text)', 'execute')
     or has_function_privilege('anon', 'public.spaced_name(text)', 'execute') then
    raise exception 'anon 仍然能调用判词器';
  end if;
  if has_column_privilege('anon', 'public.leaderboard', 'app_version', 'select')
     or has_column_privilege('anon', 'public.leaderboard', 'prev_uid', 'select') then
    raise exception 'anon 仍然能读 app_version / prev_uid';
  end if;
  if not (has_column_privilege('authenticated', 'public.leaderboard', 'app_version', 'update')
          and has_column_privilege('authenticated', 'public.leaderboard', 'prev_uid', 'update')
          and has_column_privilege('authenticated', 'public.leaderboard', 'project_image', 'update')
          and has_column_privilege('authenticated', 'public.leaderboard', 'project_image', 'select')) then
    raise exception 'authenticated 的写入面被误伤了 —— 桌面端同步会 403';
  end if;

  -- ⑦ 图片清理到底能不能删掉 storage.objects —— 第 5 节整段的前提。
  --    以前这个答案只写在文末那段注释里,要等迁移提交完才看得到;而第 5 节新加的异常包裹
  --    会把失败压成一条 warning,于是「迁移成功 + 隐私文件已经承诺删图 + 图其实还在」
  --    三件事可以同时成立而没有任何地方报警。所以把答案挪进这次运行里,当场打出来。
  --    ⚠️ 全程只 raise warning,绝不 raise exception:这一项与本次改动无关,
  --       让它有权否决整个迁移就是又一次「再来一次」。
  select p.proowner::regrole::text into v_definer
    from pg_proc p
   where p.proname = 'drop_project_image_on_delete'
     and p.pronamespace = 'public'::regnamespace;

  select has_table_privilege(v_definer, 'storage.objects', 'delete') into can_delete;

  -- 绕不绕得过 storage 的 RLS 有**三**条路,不是两条:超级用户、BYPASSRLS,
  -- 以及「本身就是该表属主、或属主角色的继承成员」——PostgreSQL 判属主用的是
  -- has_privs_of_role,不是 rolsuper/rolbypassrls。Supabase 上 storage.objects 归
  -- supabase_storage_admin,postgres 走的正是第三条,所以只看前两个标志会**假报失败**。
  select (r.rolsuper or r.rolbypassrls
          or (pg_has_role(v_definer, c.relowner, 'USAGE') and not c.relforcerowsecurity))
    into can_bypass
    from pg_class c, pg_roles r
   where c.oid = 'storage.objects'::regclass
     and r.rolname = v_definer;

  if not coalesce(can_delete, false) then
    raise warning '[0028] ⚠️ 图片清理不可用:清理函数的属主(%)对 storage.objects 没有 DELETE 权限。
                   撤榜/关开关都不会真的删图,而隐私文件已经承诺会删。
                   修法(以 storage 的属主身份执行,不需要再写迁移):
                     grant delete on storage.objects to %;', v_definer, v_definer;
  elsif not coalesce(can_bypass, false) then
    raise warning '[0028] ⚠️ 图片清理可能被 storage 的 RLS 挡住:属主(%)既不是超级用户/BYPASSRLS,
                   也不是 storage.objects 属主的继承成员。DELETE 会**静默删 0 行**,不报错。
                   修法(以 storage 的属主身份执行,不需要再写迁移):
                     create policy "project image delete by owner role" on storage.objects
                       for delete to % using (bucket_id = ''project-images'');', v_definer, v_definer;
  else
    raise notice '[0028] 图片清理可用:属主=% 有 DELETE 且绕得过 RLS。', v_definer;
  end if;

  raise notice '[0028] 自检通过:leaderboard_public 读到的行数 anon=% authenticated=% service_role=%',
               n_anon, n_auth, n_admin;

exception
  when others then
    -- 角色一定要还回去,再把失败原因原样抛出去让事务回滚。
    begin perform set_config('role', 'none', true); exception when others then null; end;
    raise exception '[0028] 自检失败,整个迁移已回滚,线上保持执行前的状态。原因:%', sqlerrm;
end
$verify$;


notify pgrst, 'reload schema';


-- ═══ 8. 部署后自检(在 SQL Editor 里跑,逐行读**返回值**,别只看「Success」)══════
--
-- 8.1 一次跑完的权限总表。把下面整段贴进 SQL Editor,期望值那一列对不上就是有问题。
--
-- select * from (values
--   ('视图是 security_invoker',
--    (select (c.reloptions::text like '%security_invoker=true%')::text
--       from pg_class c where c.oid = 'public.leaderboard_public'::regclass), 'true'),
--   ('anon 能读视图',        has_table_privilege('anon','public.leaderboard_public','select')::text, 'true'),
--   ('service_role 能读视图', has_table_privilege('service_role','public.leaderboard_public','select')::text, 'true'),
--   -- 这四行不用 information_schema.role_table_grants:那个视图只列出「grantee 或 grantor
--   -- 是当前用户可用角色」的行,SQL Editor 的身份不是 service_role 的成员时会返回 0,
--   -- 明明授权好好的却报失败 —— 又一次假警报。has_*_privilege 与成员关系无关。
--   ('service_role 能 select 许可表', has_table_privilege('service_role','public.leaderboard_project_allowances','select')::text, 'true'),
--   ('service_role 能 insert 许可表', has_table_privilege('service_role','public.leaderboard_project_allowances','insert')::text, 'true'),
--   ('service_role 能 update 许可表', has_table_privilege('service_role','public.leaderboard_project_allowances','update')::text, 'true'),
--   ('service_role 能 delete 许可表', has_table_privilege('service_role','public.leaderboard_project_allowances','delete')::text, 'true'),
--   ('public.project_visible 已删除',   (to_regprocedure('public.project_visible(uuid)') is null)::text, 'true'),
--   ('public.is_project_allowed 已删除',(to_regprocedure('public.is_project_allowed(uuid)') is null)::text, 'true'),
--   ('private.project_visible 存在',    (to_regprocedure('private.project_visible(uuid)') is not null)::text, 'true'),
--   ('anon 有 private 的 USAGE',        has_schema_privilege('anon','private','usage')::text, 'true'),
--   ('anon 能 EXECUTE private.project_visible',
--    has_function_privilege('anon','private.project_visible(uuid)','execute')::text, 'true'),
--   ('anon 不能调 project_text_rejection',
--    has_function_privilege('anon','public.project_text_rejection(text,integer)','execute')::text, 'false'),
--   ('anon 不能调 username_rejection', has_function_privilege('anon','public.username_rejection(text)','execute')::text, 'false'),
--   ('anon 不能调 normalize_name',     has_function_privilege('anon','public.normalize_name(text)','execute')::text, 'false'),
--   ('anon 不能调 spaced_name',        has_function_privilege('anon','public.spaced_name(text)','execute')::text, 'false'),
--   ('anon 仍能调 is_banned(0005 的策略要用)',
--    has_function_privilege('anon','public.is_banned(uuid)','execute')::text, 'true'),
--   ('anon 不能读 app_version', has_column_privilege('anon','public.leaderboard','app_version','select')::text, 'false'),
--   ('anon 不能读 prev_uid',    has_column_privilege('anon','public.leaderboard','prev_uid','select')::text, 'false'),
--   ('anon 仍能读 user_id',     has_column_privilege('anon','public.leaderboard','user_id','select')::text, 'true'),
--   -- ⚠️ 这一行期望 true 不是因为「应该这样」,而是因为**本文件故意没有关它**:
--   -- 基表上的四个 project_* 列 anon 仍然读得到,理由写在文件头「故意没有关掉的那个洞」。
--   -- 期望值写 true 是为了确认现状没有被无意改动,不代表这是终态。
--   ('anon 仍能读 project_name(已知未关,见文件头)',
--    has_column_privilege('anon','public.leaderboard','project_name','select')::text, 'true'),
--   ('authenticated 仍能写 project_image',
--    has_column_privilege('authenticated','public.leaderboard','project_image','update')::text, 'true'),
--   ('authenticated 仍能读 app_version(upsert 要用)',
--    has_column_privilege('authenticated','public.leaderboard','app_version','select')::text, 'true'),
--   ('leaderboard 上的 project 触发器数(应为 3)',
--    (select count(*)::text from pg_trigger
--      where tgrelid='public.leaderboard'::regclass and not tgisinternal and tgname like '%project%'), '3'),
--   ('storage 上给 anon 的整桶读策略已删',
--    (select count(*)::text from pg_policies
--      where schemaname='storage' and tablename='objects' and policyname='project image read'), '0'),
--   ('storage 上「只读自己那张」策略在',
--    (select count(*)::text from pg_policies
--      where schemaname='storage' and tablename='objects' and policyname='project image read own'), '1'),
--   ('校验器仍然钉住主机(0024)',
--    (select (prosrc like '%project_image_prefix%')::text from pg_proc
--      where proname='validate_leaderboard_project' and pronamespace='public'::regnamespace), 'true'),
--   ('校验器里没有残留的通配主机名(0022 的洞)',
--    (select (position('.supabase.co' in prosrc) > 0)::text from pg_proc
--      where proname='validate_leaderboard_project' and pronamespace='public'::regnamespace), 'false'),
--   ('清理函数的属主能删 storage.objects',
--    (select has_table_privilege(p.proowner::regrole::text,'storage.objects','delete')::text
--       from pg_proc p where p.proname='drop_project_image_on_delete'
--        and p.pronamespace='public'::regnamespace), 'true'),
--   ('清理函数的属主绕得过 storage 的 RLS',
--    (select (r.rolsuper or r.rolbypassrls
--             or (pg_has_role(p.proowner, c.relowner, 'USAGE') and not c.relforcerowsecurity))::text
--       from pg_proc p, pg_class c, pg_roles r
--      where p.proname='drop_project_image_on_delete' and p.pronamespace='public'::regnamespace
--        and c.oid='storage.objects'::regclass and r.oid=p.proowner), 'true'),
--   ('触发器函数没有留给 PUBLIC 的 EXECUTE',
--    (has_function_privilege('public','public.drop_project_image_on_delete()','execute')
--     or has_function_privilege('public','public.drop_project_image_on_unset()','execute'))::text, 'false')
-- ) as t(检查项, 实测值, 期望值);
--
-- ⚠️ 关于最后那两行「能删 / 绕得过 RLS」——第 7 节的自检已经在**迁移运行当场**把同样的
--    结论用 notice / warning 打出来了,这里只是事后复核。两行的含义和补救**不一样**,
--    不要混用(混用会出现「按提示做了、值还是 false」→ 以为要再写一个迁移的死循环):
--
--      • 「能删 storage.objects」= false → 是**权限**不足。以 storage 的属主身份执行:
--            grant delete on storage.objects to <上一行查出来的属主>;
--        补完之后这一行会变 true。
--
--      • 「绕得过 storage 的 RLS」= false → 是 **RLS** 挡住,不是权限不足。这时候补 grant
--        改不了这一行的值。要加一条策略:
--            create policy "project image delete by owner role" on storage.objects
--              for delete to <属主> using (bucket_id = 'project-images');
--
--    判据里为什么有 pg_has_role 那一项:PostgreSQL 判「属主可以绕过 RLS」用的是
--    has_privs_of_role(当前角色是不是表属主、或属主的继承成员),**不是** rolsuper /
--    rolbypassrls。Supabase 上 storage.objects 归 supabase_storage_admin,postgres 走的
--    正是继承成员这条路 —— 只看前两个标志会得到 false,而清理其实工作正常。
--    (本地 PostgreSQL 16 按同样的属主/成员关系搭了一份实测:旧判据 false、新判据 true,
--     而同一个库上撤榜确实把对象从 2 个删到 1 个。)
--
-- 8.2 存量数据没有被任何规则锁死 / 抹掉(两条都应当返回 0 行)。
--
-- -- (a) 已有的图仍然符合 0024 的主机钉死规则
-- select user_id, project_image from public.leaderboard
--  where project_image is not null
--    and (left(project_image, length(public.project_image_prefix()))
--           is distinct from public.project_image_prefix()
--         or substr(project_image, length(public.project_image_prefix()) + 1)
--              !~ ('^' || user_id::text || '\.(webp|jpg|png)$'));
--
-- -- (b) 本该公开的项目没有被规则误伤(应当只列出确实被扣且未获许可的账号)
-- select l.username, l.project_name is not null as 填了项目,
--        coalesce(l.held_tokens,0) > 0 as 被扣留,
--        exists (select 1 from public.leaderboard_project_allowances a where a.user_id=l.user_id) as 已放行,
--        private.project_visible(l.user_id) as 判定可见
--   from public.leaderboard l
--  where l.project_name is not null or coalesce(l.held_tokens,0) > 0
--  order by l.score desc;
--
-- 8.3 封禁过滤真的还在(唯一能证明 security_invoker 生效的办法 —— 现在
--     leaderboard_bans 是空的,光看行数看不出任何区别)。**逐句执行,读每一步的返回值**,
--     最后一定要 rollback。
--
-- begin;
--   set local role anon;
--   select count(*) as anon_看到的行数_封禁前 from public.leaderboard_public;   -- 记下这个数
--   reset role;
--   insert into public.leaderboard_bans(user_id, reason, banned_by)
--   select user_id, 'self-check 0028', '0028' from public.leaderboard order by score desc limit 1;
--   set local role anon;
--   select count(*) as anon_看到的行数_封禁后 from public.leaderboard_public;   -- 必须比上面少 1
--   reset role;
-- rollback;
--
-- 8.4 用真实的 key 各发一次请求(SQL 层面对了,PostgREST 的 schema cache 也要对上)。
--
--   anon key:
--     GET  /rest/v1/leaderboard_public?select=id,username,project_name&limit=3   → 200
--     GET  /rest/v1/leaderboard?select=app_version&limit=1                       → 401 42501
--     GET  /rest/v1/rpc/project_visible?p_user_id=<任意 uid>                     → 404 PGRST202
--     GET  /rest/v1/rpc/is_project_allowed?uid=<任意 uid>                        → 404 PGRST202
--     GET  /rest/v1/rpc/project_text_rejection?txt=fuck&max_len=24               → 401 42501
--     GET  /rest/v1/rpc/username_rejection?txt=fuck                              → 401 42501
--     POST /storage/v1/object/list/project-images  {"prefix":"","limit":100}     → 200 但返回 []
--   service_role key:
--     GET  /rest/v1/leaderboard_project_allowances?select=user_id&limit=1        → 200
--     GET  /rest/v1/leaderboard_public?select=id&limit=1                         → 200
--   不带任何 key:
--     GET  /storage/v1/object/public/project-images/<uid>.webp                   → 200(必须还能看图)
--   然后打开 /zh/leaderboard 与 /zh/leaderboard/value,确认榜单和项目面板都还在;
--   登录 /ranger,确认列表能加载、封禁与项目放行开关都能点。
