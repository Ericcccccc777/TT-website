import { cookies } from "next/headers";

/**
 * Self-contained i18n for the /ranger admin console. The ranger routes live
 * OUTSIDE app/[locale] (locale-free, auth-gated), so they don't use the site's
 * next-intl provider. This tiny cookie-driven dictionary gives the admin pages a
 * language switch without touching the public i18n. Add locales by extending
 * `Lang`, `LANGS`, and `dict` — every key is type-checked against `en`.
 */
export type Lang = "en" | "zh";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
];

export const RANGER_LANG_COOKIE = "ranger_lang";

const en = {
  brand: "Ranger",
  signOut: "Sign out",
  backToRanger: "← Back to Ranger",

  // list
  subtitle: "Leaderboard moderation. Authorized admins only.",
  listStats: "{n} entries · {m} hidden · signed in as {email}",
  listLoadError:
    "Could not load the leaderboard: {e}. Check that SUPABASE_SERVICE_ROLE_KEY is set and the 0005 migration is applied.",
  thNum: "#",
  thUser: "User",
  thTokens: "Tokens",
  thRegion: "Region",
  thLastActive: "Last active",
  thUserId: "User ID",
  thAction: "Action",
  hiddenBadge: "HIDDEN",
  hide: "Hide",
  unhide: "Unhide",
  reasonPh: "reason (optional)",
  noEntries: "No leaderboard entries yet.",
  listFooter:
    "Hiding is keyed on the user's account ID, so renaming or changing region does not restore them. The row is kept but filtered out of the public leaderboard and global stats.",
  viewHistory: "View this user's score history",

  // detail
  unknownUser: "Unknown user",
  detailLoadError:
    "Could not load this user: {e}. Check that SUPABASE_SERVICE_ROLE_KEY is set and the 0006 migration is applied.",
  noRow:
    "No leaderboard row for this user id. They may have opted out (row deleted) — any recorded history is still analysed below.",
  cleanTag: "✓ CLEAN",
  reviewTag: "⚠ REVIEW",
  verdictClean: "No anomalies detected across {n} change(s).",
  verdictWatch: "{n} change(s) worth a glance.",
  verdictSuspicious: "{n} suspicious change(s) — review before deciding.",
  advisory: "Heuristics are advisory — you decide whether to hide.",

  sectAccount: "Account",
  sectAnalysis: "Analysis",
  sectHistory: "Change history",

  fTokens: "Tokens (score)",
  fRegion: "Region",
  fMainTree: "Main tree",
  fFirstSeen: "First seen",
  fLastActive: "Last active",
  fStatus: "Status",
  statusVisible: "Visible",
  statusHidden: "Hidden",

  aTracked: "Tracked changes",
  aGained: "Gained (tracked)",
  aActiveSpan: "Active span",
  aAvgInterval: "Avg interval",
  aOverallPace: "Overall pace",
  aPeakRate: "Peak rate",
  aLargestJump: "Largest jump",
  aWatchSusp: "Watch / Suspicious",

  cView: "View:",
  cAll: "All",
  cFlagged: "Flagged",
  cSort: "Sort:",
  cNewest: "Newest",
  cBiggestJump: "Biggest jump",
  cFastestRate: "Fastest rate",

  thWhen: "When",
  thInterval: "Interval",
  thChange: "Change",
  thDelta: "Delta",
  thRate: "Rate",
  thJump: "Jump",
  thSignal: "Signal",

  sevOk: "ok",
  sevWatch: "WATCH",
  sevSuspicious: "SUSPICIOUS",
  sevBaseline: "BASELINE",
  reviewedBadge: "REVIEWED",

  markOk: "✓ Mark OK",
  undo: "Undo",
  reviewedBy: "Reviewed by {who}",

  decision: "Decision",
  hideBtn: "Hide from leaderboard",
  unhideBtn: "Unhide from leaderboard",

  noHistory: "No score history recorded yet for this user.",
  noMatch: "No rows match this filter.",
  detailFooter:
    "History is captured server-side on every score change (trigger, 0006). Rate = delta ÷ interval (an average between syncs). Severity is heuristic and advisory; thresholds live in lib/ranger/analysis.ts. Hiding is keyed on the account ID.",
};

const zh: typeof en = {
  brand: "Ranger",
  signOut: "退出登录",
  backToRanger: "← 返回 Ranger",

  subtitle: "排行榜审核,仅限授权管理员。",
  listStats: "{n} 条 · 已隐藏 {m} · 登录为 {email}",
  listLoadError:
    "无法加载排行榜:{e}。请确认已设置 SUPABASE_SERVICE_ROLE_KEY 且已执行 0005 迁移。",
  thNum: "#",
  thUser: "用户",
  thTokens: "Tokens",
  thRegion: "地区",
  thLastActive: "最后活跃",
  thUserId: "用户 ID",
  thAction: "操作",
  hiddenBadge: "已隐藏",
  hide: "隐藏",
  unhide: "取消隐藏",
  reasonPh: "原因(可选)",
  noEntries: "暂无排行榜记录。",
  listFooter:
    "隐藏以账号 ID 为准,改名或换地区都无法恢复。该行会保留,但从公开排行榜与全局统计中过滤掉。",
  viewHistory: "查看该用户的分数历史",

  unknownUser: "未知用户",
  detailLoadError:
    "无法加载该用户:{e}。请确认已设置 SUPABASE_SERVICE_ROLE_KEY 且已执行 0006 迁移。",
  noRow:
    "该用户 ID 没有排行榜记录。可能已退出(行被删除)—— 下方仍会分析已记录的历史。",
  cleanTag: "✓ 正常",
  reviewTag: "⚠ 待审",
  verdictClean: "共 {n} 次变化,未发现异常。",
  verdictWatch: "{n} 次变化值得留意。",
  verdictSuspicious: "{n} 次可疑变化 —— 处理前请复核。",
  advisory: "以下判定仅供参考,是否隐藏由你决定。",

  sectAccount: "账户",
  sectAnalysis: "分析",
  sectHistory: "变化历史",

  fTokens: "Tokens(分数)",
  fRegion: "地区",
  fMainTree: "主树种",
  fFirstSeen: "首次出现",
  fLastActive: "最后活跃",
  fStatus: "状态",
  statusVisible: "正常显示",
  statusHidden: "已隐藏",

  aTracked: "记录变化数",
  aGained: "累计增长(记录期)",
  aActiveSpan: "活跃跨度",
  aAvgInterval: "平均间隔",
  aOverallPace: "总体节奏",
  aPeakRate: "峰值速率",
  aLargestJump: "最大单次跳幅",
  aWatchSusp: "待看 / 可疑",

  cView: "筛选:",
  cAll: "全部",
  cFlagged: "仅可疑",
  cSort: "排序:",
  cNewest: "最新",
  cBiggestJump: "最大跳幅",
  cFastestRate: "最快速率",

  thWhen: "时间",
  thInterval: "间隔",
  thChange: "变化",
  thDelta: "增量",
  thRate: "速率",
  thJump: "涨幅",
  thSignal: "信号",

  sevOk: "正常",
  sevWatch: "待看",
  sevSuspicious: "可疑",
  sevBaseline: "基线",
  reviewedBadge: "已复核",

  markOk: "✓ 标为正常",
  undo: "撤销",
  reviewedBy: "由 {who} 复核",

  decision: "处理",
  hideBtn: "从排行榜隐藏",
  unhideBtn: "恢复到排行榜",

  noHistory: "该用户暂无分数历史记录。",
  noMatch: "没有符合该筛选的记录。",
  detailFooter:
    "每次分数变化都会在服务端记录(触发器,0006)。速率 = 增量 ÷ 间隔(两次同步间的平均值)。严重度为启发式判定、仅供参考;阈值见 lib/ranger/analysis.ts。隐藏以账号 ID 为准。",
};

const dict: Record<Lang, typeof en> = { en, zh };
export type Key = keyof typeof en;

export function t(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s = dict[lang][key] ?? en[key] ?? String(key);
  if (vars) for (const k of Object.keys(vars)) s = s.replaceAll(`{${k}}`, String(vars[k]));
  return s;
}

export async function getRangerLang(): Promise<Lang> {
  const store = await cookies();
  return store.get(RANGER_LANG_COOKIE)?.value === "zh" ? "zh" : "en";
}
