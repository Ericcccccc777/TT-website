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

  // ── Quarantine (0016): buttons, badges, batch bar ──
  qHeld: "held",
  qHeldNotCounted: "held (not counted)",
  qRawTotal: "raw total",
  qWithHeld: "{n} with held gains",
  qRelease: "Release (count it)",

  // project showcase (0022) + admin allowance (0025)
  sectProject: "Project showcase",
  pjNone: "This player has published nothing.",
  pjName: "Name",
  pjDesc: "Description",
  pjLink: "Link",
  pjImage: "Image",
  pjLiveYes: "Showing on the public board",
  pjLiveNo: "Hidden from the public board",
  pjHiddenWhy:
    "Hidden because this account has held gains. Holding a gain says we do not believe the number — not that this person may not describe what they built. Allow it if the content itself is fine.",
  pjAllow: "Allow on the board",
  pjDisallow: "Withdraw from the board",
  pjAllowedBy: "Allowed by an admin",
  qHold: "Hold (stop counting)",
  qDecidedBy: "by {who}",
  qSelectAll: "Select all held",
  qSelectAllOpen: "Select all counted",
  qClearSel: "Clear selection",
  qBatchRelease: "Release selected ({n})",
  qBatchHold: "Hold selected ({n})",
  qSelectedNone: "Nothing selected",
  qSelectedHeld: "{n} selected · all held",
  qSelectedOpen: "{n} selected · all counted",
  qSelectedMixed: "{n} selected · {held} held + {open} counted",
  qHintIdle:
    "Tick the gains you want to act on. Release puts tokens back into the public score; Hold takes them out. Both are recorded against your name and survive re-evaluation.",
  qHintHeld: "These are not counted right now. Release adds them back to the public score.",
  qHintOpen: "These are counted right now. Hold removes them from the public score.",
  qHintMixed:
    "Held and counted gains are selected together. The two actions move in opposite directions, so pick one kind at a time.",
  qThrottleTitle: "Possible throttling — nothing was held",
  qThrottleBody:
    "{note} Every individual gain stayed legal, so no rule fired and no tokens were withheld. This is a shape, not proof — judge it yourself.",
  qThrottleNote:
    "{hug} of {n} measurable gains sat at or above 60% of a limit without crossing it. Real usage is bursty and rarely comes close; a run this consistent looks governed — as if something is pacing itself just under the line.",

  // ── Hold reasons ──
  hrPeak: "Impossible burst",
  hrPeakWhy:
    "One 5-minute window holds more tokens than any real session has produced (over 250k/second). The busiest honest account on this board peaks at 185k/second.",
  hrRate: "Too fast for the time it claims",
  hrRateWhy:
    "The tokens it says it burned do not fit in the number of 5-minute windows it reports (over 400M/hour). Heaviest honest account: 337M/hour.",
  hrWallclock: "Gained faster than the clock allows",
  hrWallclockWhy:
    "The part of the gain that no bucket accounts for arrived faster than 600M/hour of real elapsed time. Buckets vouch for the tokens they cover and nothing else, so the rest is measured against the server's own clock. Heaviest honest remainder here: 334M/hour.",
  hrRelaunder: "Re-added the row to skip the evidence",
  hrRelaunderWhy:
    "Switching the leaderboard off deletes the row; switching it back on re-inserts it, and an insert carries no anti-cheat summary. This gain arrived through that gap. Honest accounts insert exactly once, when they first join.",
  hrWindows: "Claims more active time than the account has existed",
  hrWindowsWhy:
    "Every 5-minute window is a distinct slice of real time, so their total cannot exceed the account's age. This one claims more (a day of grace is allowed for an app that ran before the leaderboard was switched on).",
  hrUnknown: "Unrecognised rule — check the migration.",

  // ── Analysis signals ──
  sigBaseline: "Starting baseline — the accumulated total before per-change history began.",
  sigBaselineSus: "First-ever total is {v} — far past any plausible lifetime usage.",
  sigBaselineWatch: "First-ever total is {v} — unusually high for a fresh registration.",
  sigDecreased: "Score DECREASED — scores normally only grow; a drop is a tamper signal.",
  sigX100: "Exact ×100 — matches the one-time v2→v3 metric migration (legit).",
  sigBusyWindow: "Busiest 5-minute window holds {max} tokens ({rate}) — high, but not impossible.",
  sigOverCeiling: "Gained {gain} in {gap} — over the {ceiling} ceiling for that interval.",
  sigLargeButAccounted:
    "Large gain ({gain}) but accounted for: {n} five-minute windows over {span}, busiest {max}, total matches.",
  sigGrewPct: "Grew {pct}% in one step.",
  sigNormal: "Within normal bounds.",
  sigNormalWithBuckets: "Within normal bounds — {n} five-minute windows, total matches the delta.",
  sigServerFlagged: "Server-flagged{reason}.",
  sigReviewedOk: "Reviewed OK — cleared by an admin.",
  sigSumMismatch:
    "Bucket total ({sum}) does not match the score delta ({delta}) — the uploaded score is not backed by the token log.",
  sigWindowImpossible: "One 5-minute window holds {max} tokens — beyond any real machine.",
  sigWindowsDontFit:
    "{n} five-minute windows cannot fit inside a {span} span — the buckets are fabricated.",
  sigMaxOverSum: "Busiest window exceeds the total — internally inconsistent.",
  sigZeroBuckets: "Tokens claimed with zero buckets — internally inconsistent.",
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

  // ── 扣留(0016):按钮、徽章、批量条 ──
  qHeld: "已扣",
  qHeldNotCounted: "已扣留(不计入)",
  qRawTotal: "原始总量",
  qWithHeld: "{n} 人有被扣的涨分",
  qRelease: "放行(计入分数)",

  // 项目展示(0022) + 管理员许可(0025)
  sectProject: "项目展示",
  pjNone: "这个玩家没有填写任何内容。",
  pjName: "名称",
  pjDesc: "简介",
  pjLink: "链接",
  pjImage: "图片",
  pjLiveYes: "正在公开榜单上显示",
  pjLiveNo: "未在公开榜单上显示",
  pjHiddenWhy:
    "因为这个账号有被扣留的增量而不显示。扣留说的是「我们不相信这个数字」,不是「这个人不许介绍自己做的东西」。内容本身没问题就放行。",
  pjAllow: "允许显示在榜上",
  pjDisallow: "从榜上撤下",
  pjAllowedBy: "已由管理员放行",
  qHold: "扣下(不计入)",
  qDecidedBy: "由 {who} 裁决",
  qSelectAll: "全选已扣的",
  qSelectAllOpen: "全选未扣的",
  qClearSel: "取消选择",
  qBatchRelease: "放行选中的 {n} 笔",
  qBatchHold: "扣下选中的 {n} 笔",
  qSelectedNone: "未选择",
  qSelectedHeld: "已选 {n} 笔 · 全部已扣",
  qSelectedOpen: "已选 {n} 笔 · 全部未扣",
  qSelectedMixed: "已选 {n} 笔 · {held} 已扣 + {open} 未扣",
  qHintIdle:
    "勾选要处理的涨分。放行 = 把 token 加回公开分数;扣下 = 从公开分数减掉。两者都会记下是谁裁决的,之后重新评估不会推翻。",
  qHintHeld: "这些目前不计入公开分数。放行会把它们加回去。",
  qHintOpen: "这些目前计入公开分数。扣下会把它们减掉。",
  qHintMixed: "选中的里面既有已扣的也有未扣的。这两个操作方向相反,请一次只选一种。",
  qThrottleTitle: "疑似节流 —— 但没有扣留任何涨分",
  qThrottleBody:
    "{note} 每一笔单独看都合规,所以没有规则触发、没有 token 被扣。这是一种形状,不是证据 —— 请你自己判断。",
  qThrottleNote:
    "{n} 笔可测量的涨分里有 {hug} 笔贴着某条上限的 60% 以上却始终没越线。真实使用是忽高忽低的,很少接近上限;这么稳定的节奏像是被控制过——好像有什么东西在贴着线下方匀速跑。",

  // ── 扣留原因 ──
  hrPeak: "不可能的爆发",
  hrPeakWhy:
    "某个 5 分钟窗口里的 token 超过了任何真实会话能产出的量(每秒 25 万以上)。本榜最重度的诚实账号峰值是每秒 18.5 万。",
  hrRate: "比它声称的时间跑得快",
  hrRateWhy:
    "它说烧掉的 token 塞不进它报告的 5 分钟窗口数(每小时 4 亿以上)。最重度的诚实账号:每小时 3.37 亿。",
  hrWallclock: "涨得比时钟允许的还快",
  hrWallclockWhy:
    "这笔涨分里没有任何桶为之作证的部分,超过了每小时 6 亿的真实流逝时间。桶只能为它统计到的 token 作证,剩下的只能按服务端自己的时钟衡量。本榜诚实账号的最高余量:每小时 3.34 亿。",
  hrRelaunder: "删掉再加回来,绕过了证据",
  hrRelaunderWhy:
    "关闭排行榜会删掉这一行,重新开启则是插入一行新的,而插入不带任何反作弊摘要。这笔涨分正是从这个缺口进来的。诚实账号一生只插入一次——第一次上榜的时候。",
  hrWindows: "声称的活跃时长超过了账号存在的时间",
  hrWindowsWhy:
    "每个 5 分钟窗口都是一段互不重叠的真实时间,总和不可能超过账号的年龄。这个账号声称的超了(已经给了一天宽限,覆盖 App 先跑了一阵才打开排行榜的情况)。",
  hrUnknown: "无法识别的规则 —— 去看迁移文件。",

  // ── 分析信号 ──
  sigBaseline: "起始基线 —— 逐笔历史开始之前累积的总量。",
  sigBaselineSus: "首次上传就是 {v} —— 远超任何合理的终身用量。",
  sigBaselineWatch: "首次上传就是 {v} —— 对一个刚注册的账号来说偏高。",
  sigDecreased: "分数【下降】了 —— 分数正常只增不减,下降是被篡改的信号。",
  sigX100: "恰好 ×100 —— 与 v2→v3 那次一次性口径迁移吻合(合法)。",
  sigBusyWindow: "最忙的 5 分钟窗口有 {max} 个 token({rate})—— 偏高,但不是不可能。",
  sigOverCeiling: "{gap} 内涨了 {gain} —— 超过该时长对应的 {ceiling} 上限。",
  sigLargeButAccounted:
    "涨幅很大({gain})但有据可查:{n} 个 5 分钟窗口跨 {span},最忙的一个 {max},总数对得上。",
  sigGrewPct: "一步涨了 {pct}%。",
  sigNormal: "在正常范围内。",
  sigNormalWithBuckets: "在正常范围内 —— {n} 个 5 分钟窗口,总数与涨幅相符。",
  sigServerFlagged: "服务端已标记{reason}。",
  sigReviewedOk: "已复核通过 —— 管理员放行。",
  sigSumMismatch: "桶总数({sum})与分数增量({delta})对不上 —— 上传的分数没有 token 日志支撑。",
  sigWindowImpossible: "某个 5 分钟窗口有 {max} 个 token —— 超出任何真实机器。",
  sigWindowsDontFit: "{n} 个 5 分钟窗口塞不进 {span} 的跨度 —— 这些桶是伪造的。",
  sigMaxOverSum: "最忙窗口超过了总数 —— 自相矛盾。",
  sigZeroBuckets: "声称有 token 却没有任何桶 —— 自相矛盾。",
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
