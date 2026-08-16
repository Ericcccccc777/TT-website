-- Migration: 0030_takedown_no_destroy
--
-- 撤掉 0029 的第 5 节:**下架和封禁都不该销毁任何东西。**
--
-- ── 我在 0029 里做错了什么 ──────────────────────────────────────────────────
-- 0029 §5 让「下架」顺手做两件事:把行上四个 project_* 列清空,并删掉存储桶里的图。
-- 两件都是错的,而且第一件当场就被用出来了:管理员下架、再点撤销下架,内容没了。
--
-- 错在哪:**销毁只应该伴随销毁,不应该伴随隐藏。**
--
--   玩家自己关掉开关、或整行被删(0003)  -> 删图是对的。那是玩家自己的动作,
--                                          客户端的 project_image_sha 状态与之一致。
--   下架 / 封禁                          -> 这两个都是**可撤销**的管理动作。
--                                          可撤销的动作销毁不可恢复的数据,是设计错误。
--
-- 清空四列本来就没有必要:可见性规则在 private.project_visible() 里,被下架的账号
-- 视图已经一列都不发了。清空只是额外毁掉了 /ranger 自己要看的东西 —— 管理员应该
-- 能看见他下架的是什么。
--
-- ── 而且删图是**不可逆**的,这一条是去客户端源码查实的 ───────────────────────
-- src/leaderboard.py::_sync_project_image():
--     if sha and sha == synced:
--         return project_image_url(user_id, ext)   # 本机 sha 没变 -> 什么都不传
-- 客户端只要认为「我上次传过了」就永远不会重传。服务端把对象删掉之后,它仍然会把
-- 那个 URL 写进行里,而对象已经不在 —— 网页端 onError 静默隐藏,图片就此永久消失,
-- 除非玩家自己换一张图。一个「撤销」按钮救不回来的东西,不该由一个可撤销的动作来删。
--
-- 附带记录:0029 那次删除**其实没成功**(实测下架之后
-- GET /storage/v1/object/public/project-images/<uid>.webp 仍然 200),异常块把失败
-- 吞成了一条 warning。也就是说这个洞既是错的、又没生效 —— 一起撤掉最干净。
--
-- ── 那图片怎么办 ────────────────────────────────────────────────────────────
-- 下架之后视图不再发布任何一列,图片地址也就不出现在页面上。但对象名是
-- `<project_image_prefix()><user_id>.webp`,而 user_id 是公开可读的,所以知道规则的人
-- 仍然能直接取到那张图。这是**已知且接受的残留**:
--   • 隐藏内容 ≠ 销毁内容,后者需要一个管理员明确知道「玩家拿不回来」才按的按钮;
--   • 真的遇到图片本身必须消失的情况,在 Supabase Dashboard 的 Storage 里手删一次,
--     那是一个有意识的、一次性的动作,不该藏在「下架」这个可撤销开关背后。
--
-- 0029 的其余部分(黑名单表、private.is_project_blocked、校验触发器里的拒绝、
-- private.project_visible 里的抑制)全部保留 —— 那些才是下架真正该做的事。
--
-- ⚠️ 需在 Supabase SQL Editor 手动执行。幂等,可重复跑。假设 0001–0029 已应用。

-- ── 1. 拆掉两个会销毁数据的触发器 ───────────────────────────────────────────

drop trigger if exists trg_on_project_blocked   on public.leaderboard_project_blocks;
drop trigger if exists trg_on_leaderboard_banned on public.leaderboard_bans;

drop function if exists public.on_project_blocked();
drop function if exists public.on_leaderboard_banned();

-- public.drop_project_image_for_user() 保留:它本身没问题(带异常保护的删图),
-- 只是不该被上面两个可撤销的动作调用。留着供将来那个「明确销毁」的动作使用,
-- 以及供管理员在 SQL Editor 里手动执行一次。
-- 权限维持 0029 的样子:PUBLIC 无权,只有 service_role。

notify pgrst, 'reload schema';

-- ── 2. 自检 ────────────────────────────────────────────────────────────────
--
-- 2.1 两个触发器都没了(应当 0 行)
--   select tgname, tgrelid::regclass from pg_trigger
--    where tgname in ('trg_on_project_blocked','trg_on_leaderboard_banned');
--
-- 2.2 下架仍然生效、但不再毁数据。拿有项目的那个 uid 跑,最后回滚:
--   begin;
--     insert into public.leaderboard_project_blocks(user_id, blocked_by)
--       values ('<有项目的 uid>','selftest');
--     -- 行上四列应当**原样还在**(这是本次修复的重点)
--     select project_name, project_image from public.leaderboard
--      where user_id = '<有项目的 uid>';
--     -- 而公开视图应当一列都不发
--     select project_name, project_image from public.leaderboard_public
--      where id = (select id from public.leaderboard where user_id = '<有项目的 uid>');
--     -- 再写内容仍应被拒(报 [project_rejected] blocked = 通过)
--     update public.leaderboard set project_desc = 'x'
--      where user_id = '<有项目的 uid>';
--   rollback;
--
-- 2.3 清空仍然放行(单独一段,同样回滚)
--   begin;
--     insert into public.leaderboard_project_blocks(user_id, blocked_by)
--       values ('<有项目的 uid>','selftest');
--     update public.leaderboard
--        set project_name = null, project_desc = null, project_url = null, project_image = null
--      where user_id = '<有项目的 uid>';     -- 期望成功
--   rollback;
