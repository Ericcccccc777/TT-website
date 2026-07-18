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
  newAcctBadge: "NEW",
  supersededNote: "claims to replace {id}",
  oldAcctBadge: "OLD?",
  replacedByNote: "claimed replaced by {name}",
  deleteOrphan: "Delete old row",

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

  // Bucket breakdown — click a timestamp to expand. The client buckets its tokens by
  // the Claude Code log's own timestamps into 5-minute windows and uploads four
  // aggregates, never the per-window timeline (that would expose when someone works
  // and sleeps). So we can say how big the busiest window was, but not which one.
  bktWindows: "5-min windows",
  bktWindowsHint: "spread over {span}",
  bktBusiest: "Busiest window",
  bktAvg: "Average window",
  bktAvgHint: "tokens per 5 min",
  bktReconcile: "Reconciliation",
  bktMatch: "✓ Matches",
  bktMismatch: "✗ Does not match",
  bktNoneLegacy:
    "No breakdown — this client predates the evidence summary. Not a red flag; older builds simply cannot produce one.",
  bktNoneModern:
    "No breakdown — client {v} supports it but declined to assert one, meaning its local token ledger could not account for the whole increase (upgraded mid-stream, or it crashed between collecting a bubble and syncing). Not a red flag on its own; the jump ceiling still applies.",
  bktFooter:
    "Windows are keyed on the Claude Code log's own timestamps, so hoarding bubbles spreads the gain across the hours it was really earned. The per-window ceiling is {cap} tokens. Only these aggregates are uploaded — never the per-window timeline. Client {v}.",

  // Charts
  sectCharts: "Charts",
  chEmpty: "Not enough history to plot.",
  chNoEvidence: "No client on this account has uploaded an evidence summary yet.",
  chCumulative: "Tokens over time",
  chCumulativeNote:
    "The score as it actually stood. A cumulative total is a step function — it holds flat between syncs. Flagged changes are marked.",
  chDeltas: "Gain per sync",
  chDeltasNote:
    "What each score change added. Bars sit at their own timestamp, so bursts cluster and quiet spells leave gaps.",
  chHeadroom: "Share of the ceiling used",
  chHeadroomNote:
    "Each gain as a percentage of what a real machine could have produced in the time that had passed. Hoarding a workday lands LOW here — the ceiling grew with the wait. Only fabrication crosses 100%.",
  chCeiling: "ceiling",
  chBusiest: "Busiest 5-minute window",
  chBusiestNote:
    "The biggest single 5-minute window inside each gain, from the client's evidence summary. A hoarded day is many ordinary windows; a forged score needs one impossible one.",
  chWindowCap: "cap",
  chCompare: "Tokens over time — all players",
  chCompareNote:
    "Top {n} by score, last 30 days, sampled daily. An honest run is a staircase: it climbs while someone works and holds flat while they don't. Dashed = hidden from the public board.",
};

const zh: typeof en = {
  brand: "Ranger",
  signOut: "退出登录",
  backToRanger: "← 返回 Ranger",

  subtitle: "排行榜审核,仅限授权管理员。",
  listStats: "{n} 条 · 已隐藏 {m} · 登录为 {email}",
  listLoadError: "无法加载排行榜:{e}。请确认已设置 SUPABASE_SERVICE_ROLE_KEY 且已执行 0005 迁移。",
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
  newAcctBadge: "新号",
  supersededNote: "自称接替 {id}",
  oldAcctBadge: "疑似旧行",
  replacedByNote: "被 {name} 自称接替",
  deleteOrphan: "删除旧行",

  unknownUser: "未知用户",
  detailLoadError:
    "无法加载该用户:{e}。请确认已设置 SUPABASE_SERVICE_ROLE_KEY 且已执行 0006 迁移。",
  noRow: "该用户 ID 没有排行榜记录。可能已退出(行被删除)—— 下方仍会分析已记录的历史。",
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

  // 明细拆分 —— 点时间戳展开。客户端按 Claude Code 日志自己的时间戳把 token 归进 5 分钟
  // 片段,只上传四个聚合数字,**不上传逐片段的时间线**(那等于暴露用户几点在工作、几点睡觉)。
  // 所以这里能告诉你最猛的片段有多大,但不会告诉你那是哪 5 分钟。
  bktWindows: "5 分钟片段数",
  bktWindowsHint: "分布在 {span} 内",
  bktBusiest: "最猛的片段",
  bktAvg: "平均每片段",
  bktAvgHint: "每 5 分钟的 token",
  bktReconcile: "对账",
  bktMatch: "✓ 对得上",
  bktMismatch: "✗ 对不上",
  bktNoneLegacy:
    "没有明细 —— 这个客户端版本还不支持上传证据摘要。这不是问题信号,老版本本来就给不出。",
  bktNoneModern:
    "没有明细 —— 客户端 {v} 支持上传,但它主动选择不出具:说明它本地的 token 账本对不上这次的全部涨幅(中途升级过,或者在收气泡和同步之间崩溃过)。这本身不是问题信号;涨幅上限判据依然生效。",
  bktFooter:
    "片段按 Claude Code 日志自己的时间戳切分,所以囤气泡会把涨幅摊回它真正被赚到的那几个小时。单片段上限 {cap} tokens。**只上传这几个聚合数字,从不上传逐片段的时间线。** 客户端 {v}。",

  // 图表
  sectCharts: "曲线",
  chEmpty: "历史记录不足,画不出曲线。",
  chNoEvidence: "这个账号还没有任何一次上传带了证据摘要。",
  chCumulative: "Token 总量走势",
  chCumulativeNote:
    "分数当时实际的样子。累计量是阶梯函数 —— 两次同步之间保持水平,不会自己爬。被标记的那几次会打点。",
  chDeltas: "每次同步涨了多少",
  chDeltasNote: "每次分数变化的增量。柱子按各自的时间戳落位,所以密集期会挤在一起、安静期留空白。",
  chHeadroom: "用掉了上限的百分之多少",
  chHeadroomNote:
    "每次涨幅占「这段时间内一台真机最多能产出多少」的比例。囤一整天在这里反而很低 —— 因为等得越久,上限涨得越高。只有伪造才会越过 100%。",
  chCeiling: "上限",
  chBusiest: "最猛的 5 分钟片段",
  chBusiestNote:
    "每次涨幅里最大的那个 5 分钟片段(来自客户端的证据摘要)。囤一天是很多个平平无奇的片段;伪造则需要一个物理上不可能的片段。",
  chWindowCap: "上限",
  chCompare: "所有玩家的 Token 走势对比",
  chCompareNote:
    "按分数取前 {n} 名,最近 30 天,按天采样。老实的曲线是楼梯:干活时往上爬,不干活时保持水平。虚线 = 已从公开榜隐藏。",
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
