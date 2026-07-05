# `/dashboard` 独立页 — 市场调查 + 页面蓝图(设计输入稿)

> 流程定位:**本文档(调查+讨论)→ Claude Design 出设计稿 → 再写代码**。定稿前不动网站代码。
> App 端功能事实来自 `Token-Forest/docs/DASHBOARD.md`;素材与文案基础见本仓库 `docs/dashboard-section.md`(其"放置方案"部分已被本文取代)。

---

## 0. 已定决策(2026-07-05 拍板)

| 项 | 决定 |
|---|---|
| 形态 | **独立页面 `/dashboard`**(之前讨论的首页 section 方案不做) |
| 导航 | 顶栏在**「下载」与「排行榜」之间**加一项 |
| 英文名 | **Dashboard**(页面 & 导航) |
| 首页入口 | Features 区加一张简介卡,**点击跳转 `/dashboard`** |
| 流程 | 文档 → Claude Design → code(本文就是给设计的 brief) |
| 中文导航名 | **数据面板**(页内 hero 仍玩「成绩单」叙事;ja ダッシュボード / ko 대시보드) |
| $ 示例数字 | **中性小数 ≈ $128.40**,配「数字为虚构示例」小字 |
| 发布状态 | App 端已完成、**安装包尚未发布**(仍在改动)→ 挂「即将推出 · 随下个版本」,发布日切 Live(§6-D3) |
| 全球统计 chips | **放**:尾部 CTA 上方一行(§6-D4) |
| FAQ | **4 问全上**(设计可折叠) |

(小项已于 2026-07-05 二轮全部拍板,记录见 §6。)

---

## 1. 市场调查(2026-07-05 实查 7 站)

### 1.1 逐站拆解

#### ccusage(ccusage.com + GitHub README)— 行业事实标准,CLI
- **定位句**:「A fast local CLI for tracking tokens and estimated costs across Claude Code, Codex, …(15 个工具)」。
- **落地页结构**:一句话定位 → 6 张 feature 卡(All Sources by Default / Focused Views / Local Data Sources / Cost Analysis / Enhanced Display / JSON Output)→ Get Started + GitHub 两个 CTA。
- **演示方式**:README 用终端截图 + 徽章墙;落地页无截图,纯 feature 卡。
- **功能面**:daily / weekly / monthly / session / 5h blocks 报表、模型拆分、cache 分类、离线模式(可选,默认联网拉价)、JSON 导出、statusline、`npx ccusage@latest` 零安装。
- **可借鉴**:① feature 卡片化、每卡一个动词短语;②「local / 不上传」独立成卡;③ 零门槛 quick start 放最显眼处。
- **避坑**:落地页无任何视觉演示,感染力弱——我们必须放演示。

#### tokscale(tokscale.ai)— CLI/TUI + 排行榜社交平台,最接近的竞品
- **定位句**:「The Kardashev Scale for AI Devs」(玩梗:按 token 量给开发者分级)。
- **结构**:hero(星空背景 + GitHub 星数 CTA)→ 大厂 logo 墙(Trusted by Microsoft/Amazon/Meta/Google)→ 双栏 quickstart → **落地页直接内嵌 top-5 排行榜** → 支持的 20+ 客户端 grid → 作者关注 CTA。
- **演示方式**:两张静态截图(TUI + 排行榜),无交互。
- **功能面**:TUI 6 视图(Overview/Models/Daily/Hourly/Stats/Agents)、9 主题、**GitHub 风 2D/3D 贡献图**、LiteLLM 实时在线拉价、公开个人主页。
- **可借鉴**:① 把「全球总量」当社会证明(Tracking Trillions of Tokens Worldwide);② 排行榜内容直接上落地页;③ 梗式定位句有记忆点。
- **对我们的威胁/差异**:它是「多源+社交」路线;我们是「养成+离线」路线,不要在"支持面"上正面比。

#### viberank(viberank.app)— 网页排行榜(数据来自 ccusage 导出)
- **定位句**:「The AI coding usage leaderboard」。
- **结构**:hero → **实时榜单表直接当首屏主体**(rank/头像/tier 徽章/cost/tokens)→「Get on the board」CTA → **tier 阶梯可视化** → How it works 3 步 → FAQ 4 问 → footer。
- **数字钩子**:全局计数器「$3.7M tracked · 4.1T tokens burned」;榜首「$149.4K」被当标题写。
- **隐私话术**:「Your code and prompts never leave your machine」(但用量数据是上传且公开的——和我们"绝不上传"有本质区别,文案上可衬托我们)。
- **可借鉴**:① 3 步 How it works;② FAQ 区;③ tier/gamification 阶梯(和我们的 8 阶段树同构);④ 大 $ 数字当钩子。

#### WakaTime(wakatime.com)— 成熟开发者统计产品(500k+ 用户)
- **重大信号**:整个产品已 pivot 到 AI:hero =「Understand your AI Code」,6 个指标卡全是 AI(AI Cost / AI Adoption / AI Effectiveness / model efficiency / per-agent breakdown / prompt length)。**这个赛道 2026 年很热,官方(Anthropic Console/usage 命令)也在做**——差异化必须站稳。
- **结构**:hero + 仪表盘截图 → 指标 grid → 按受众分段(Developers/Team leads/Decision Makers)→ 真人 testimonials → 100+ 编辑器集成墙。
- **可借鉴**:① 仪表盘截图紧贴 hero;② 指标名全部动词/名词短语化。

#### Code::Stats(codestats.net)— 游戏化编码统计(XP/等级)
- **结构**:三个动词段「Write code → Level up → Show off」+「See example profile →」。
- **可借鉴**:**三动词叙事结构**——完美映射我们的三层(种树 → 看成绩 → 晒账单);「示例主页」链接 = 低成本演示。
- **避坑**:全文字无视觉,存在感弱。

#### Plausible(plausible.io)— 隐私优先分析工具的营销范本
- **定位句**:「Easy to use and privacy-friendly Google Analytics alternative」+「No cookies, just insights」。
- **王牌**:hero 双 CTA 之一是 **「View live demo」→ 一个真实的公开仪表盘**。演示即产品。
- **隐私话术密度极高**:「doesn't process personal data」「no persistent identifiers」「no need for cookie banners」,并有独立 vs-Google-Analytics 对比页 +「It's time to ditch Google Analytics」问题陈述区。
- **可借鉴**:① **可交互的 live demo 是隐私类产品的最强证明**(我们的 CSS mock 就扮演这个角色);② 隐私话术要具体到"没有什么"而不是空喊"安全";③ 和 incumbent(对我们=ccusage)做温和对比。

#### Claude Code Usage Monitor(GitHub)— 终端实时监控
- **定位句**:「A privacy-first Claude Usage-Ops companion」。
- **功能面**:实时刷新、P90 限额检测、burn rate、session 预测、**opt-in 本地 warehouse(卖点原话:数据在 Claude 30 天清理后仍在)**、WCAG 配色。
- **对我们的启示**:①「日志被官方清理后历史仍在」**已被竞品当卖点营销**——我们的账本功能同款,要讲但讲法要不同(结合树的一生叙事);② 限额预测(5h blocks)是它的核心——我们**刻意不做**(DASHBOARD.md 附录 B:官方限额不可知,避免错误承诺),文案里绝不承诺。

### 1.2 跨站规律:详情页的必备构件(出现频次)

| 构件 | 出现 | 结论 |
|---|---|---|
| 一句话定位(what + for whom)| 7/7 | **必备**,hero 首行 |
| 首屏立即可见的产品演示 | 5/7(缺的两家明显吃亏)| **必备**;交互 demo > 截图 > 无 |
| feature 卡 grid(4-6 张,动词短语)| 6/7 | **必备** |
| 隐私/local-first 独立区块 | 7/7(全场 table stakes)| **必备**,且要具体 |
| Quick start / 获取方式 CTA | 7/7 | **必备**(我们=下载按钮) |
| 大数字钩子($ / token 总量)| 4/7 | 强烈建议(我们有 $ 大数 + 全球统计)|
| How it works 3 步 | 3/7 | 建议(下载→用→右键打开,恰好 3 步)|
| FAQ | 2/7 | 建议(承载"口径诚实"叙事,见 §3)|
| 社会证明(星数/用户数/logo)| 5/7 | 有多少放多少(GitHub 链接 + 全球树数)|

---

## 2. 功能对照:table stakes vs 我们的亮点

### 2.1 功能矩阵(诚实版,文案不得超出「我们」列)

| 功能 | ccusage | tokscale | viberank | CC Monitor | **Token-Forest** |
|---|---|---|---|---|---|
| 每日/累计曲线 | ✅ | ✅ | ✅(profile) | ✅ | ✅ 日/周/月聚合 |
| 各模型拆分 + 花费 | ✅ | ✅ | ✅ | ✅ | ✅ Claude+Codex 并排 |
| cache token 分类 | ✅ | ✅ | — | ✅ | ✅ **四类分列+人话注解** |
| 离线计价 | 可选(默认联网) | ❌ 实时联网拉价 | —(网站) | ✅ | ✅ **默认且唯一模式** |
| 支持源数量 | 15 | 20+ | 聚合自 ccusage | 1 | **2(Claude Code+Codex)** |
| burn rate | ✅(blocks) | — | — | ✅+预测 | ✅ 近 7 日均(**无限额预测,刻意**)|
| 贡献热力图 | ❌ | ✅ 2D/3D | ❌ | ❌ | ✅ 26 周 |
| 按项目拆分 | ✅ | — | ❌ | — | ✅ 前 8 |
| 会话/对话维度 | ✅ 文件级 | — | ❌ | ✅ | ✅ **账单级(标题/项目/提问数)** |
| 长历史(日志清理后仍在)| ❌ | —(上传后网站存)| ✅ 网站存 | ✅ opt-in warehouse | ✅ **默认本地账本** |
| 排行榜 | ❌ | ✅ 公开 profile | ✅ 公开 | ❌ | ✅ **可选、只传总数+昵称** |
| 界面形态 | 终端表格 | TUI+网页 | 网页 | 终端 | ✅ **像素 GUI 桌面窗口** |
| 养成/情感层 | ❌ | tier 分级 | tier 徽章 | ❌ | ✅ **树本体+每树估值,独有** |

### 2.2 我们的亮点(建议的文案排序)

1. **养成叙事(全场独有)**:统计不是表格,是你那棵树的成绩单;每棵树有自己的估值「这棵树至今 ≈ $X」。竞品最多做到 tier 徽章。
2. **对话级账单**:每次对话一行——标题、项目、提问数、四类 token、≈$。比竞品的 session 文件级更"人话"。
3. **默认离线计价**:价格表内置随版本发布,运行时零联网(ccusage 默认联网、tokscale 实时拉价)。与全站「不联网不上传」一致。
4. **诚实口径**:四类 token 分开计价、cache 读按 0.1× 折算并解释来历,与官方限额同口径——把"口径"本身讲成人话是空白区。
5. **长历史账本**:CLI 日志 30 天被清理后你的曲线还在(竞品 opt-in,我们默认;且树的一生完整可回看)。
6. **像素 GUI**:羊皮纸账本美术,与桌宠同套;全场唯一非终端/非网页的原生桌面成绩单。

### 2.3 竞品有而我们没有的(话术防御)

- **多源(15-20 个工具)**:不比广度。话术永远是「Claude Code 与 Codex,并排看」,不出现"支持最多/更多"。
- **限额预测 / 5h blocks / 实时监控**:刻意不做(官方限额不可知)。不承诺、不暗示;若被问,口径是"我们只陈述事实,不猜配额"。
- **JSON 导出 / MCP / statusline**:工具向功能,与桌宠定位无关,不提。
- **公开个人主页**:我们排行榜只有总数+昵称,这是隐私卖点,反着讲。

### 2.4 定位一句话(候选,待选)

- zh:「别人给你一张表,Token-Forest 给你一棵树——和一份看得懂的账单。」
- en:**"Other tools print a table. Token-Forest grows a tree — and keeps the receipts."**(keeps the receipts 双关对话账单)
- 备选 en:"Growth, usage and cost for Claude Code & Codex — computed locally, priced offline, never uploaded."(更平实,可做副标)

---

## 3. `/dashboard` 页面蓝图(给 Claude Design 的 brief)

> 站内约束:沿用全站像素风 design tokens(`--font-pixel/--font-body`、`--color-leaf-*`、`--color-surface-parchment/forest`、`--shadow-pixel`、neon 标题、reveal 动画、grain overlay)。页面明暗节奏建议与首页一致:parchment 与 forest 底色交替。

### §1 Hero(参考:Plausible hero+demo、WakaTime 截图贴 hero)
- 内容:页名 Dashboard(eyebrow)+「即将推出 · 随下个版本」badge(gold/soon 色)→ 主标(成绩单叙事)→ 副标(一句话功能+离线)→ 双 CTA(下载 / GitHub)→ 隐私一行(复用全站 `🔒 Local · Log-only · Offline · No uploads` 风格)。
- 主视觉 = **§2 的交互 mock 直接顶上来**(首屏可见,不放静态截图)。

### §2 交互演示:羊皮纸成绩单 mock(本页核心,参考:Plausible live demo)
- 形式:纯 CSS/JSX(照抄 `feature-demos.tsx` 工程模式:服务端组件 + keyframes + `InViewGate` 离屏冻结 + `aria-hidden` + reduced-motion 静帧),**不用截图**(要 i18n、要动)。
- 三层 tab 🌳成长 / 📊用量 / 💬对话,自动轮播 + hover/点击暂停切换(与 TreeShowcase 的 auto-rotate 呼应)。
- 分镜(还原 DASHBOARD.md §5 布局的缩小版):
  - 🌳:左树景卡(小树+Lv 徽章)+ 阶段进度条;右「已种植 41 天 / 累计 112.6M」双数字。
  - 📊:`≈ $128.40` 大数字滚动 + 四类按金额堆叠条(cache读/output/cache写/input)+ 迷你折线 + 两行模型条(Claude 点 `#e0885f` / Codex 点 `#5cc2c9`)+ 迷你 26 周热力图角落。
  - 💬:三行对话账单(标题省略号 · 项目 · 提问数 · ≈$)。
- 配色:v2a 羊皮纸色表直接搬(`design_handoff_dashboard_v2a/README.md` 全表)。关键值:底 `#f2dfae` / 卡 `#faedc8` / 文字 `#33210d` / 描边 `#4a2a0d` / 绿 `#57a568` / 金 `#d9a83c` / 热力图五档 `#eadcab→#2e7d3c`。
- mock 下方小字:「界面为演示;数字为虚构示例」(免责,§6-D2;$ 大数统一用 ≈ $128.40)。

### §3 三层导览(参考:Code::Stats 三动词、WakaTime 指标 grid)
- 三段横排/竖排卡:🌳 成长 / 📊 用量 / 💬 对话,每段 = icon + 标题 + 两句话 + 3-4 个指标名 chips(如「种植天数 · 成长曲线 · 每树估值」)。
- 内容清单(全部已实现,不许超卖):
  - 成长:树切换 · 阶段+种植天数 · 成长曲线(累计/每日/价值)· 每树估值。
  - 用量:日/周/月曲线 · Claude&Codex 模型表 · 真实消耗卡(总$+四类堆叠)· 26 周热力图 · burn rate · 按项目拆分。
  - 对话:每对话一行(标题/项目/时间/提问数/模型/四类/≈$)· 近 200 条分页。

### §4 亮点区(参考:ccusage 6 卡;我们 4 卡,§2.2 的 1-4 条)
- 2×2 卡:养成叙事 / 对话账单 / 默认离线计价 / 诚实口径。每卡标题动词短语 + 两行说明。
- 长历史(§2.2-5)并入「诚实口径」卡或单独第 5 卡,设计定。

### §5 口径与 FAQ(参考:viberank FAQ;差异化承载区)
- 4 问(答案要点见 §4 文案):
  1. 为什么我的 cache 读有十亿级?(agent 工作方式 + 0.1× 计价 + 成本占比)
  2. 花费数字准吗?(估算 · 内置价格表更新于 X · 非账单)
  3. 我的数据会上传吗?(不;排行榜是独立可选功能,只传总数+昵称)
  4. 历史能追多久?(全量日志重解析 + 本地账本;官方日志 30 天清理后仍在)

### §6 How it works(参考:viberank 3 步)
- 3 步:① 下载 Token-Forest,树开始随 token 生长 → ② 正常用 Claude Code / Codex → ③ 右键树 →「📊 查看成绩单」。
- 第 3 步配一个 mini 右键菜单示意(像素风)。

### §7 尾部 CTA(复用首页 DownloadCta 模式)
- 下载双按钮 + GitHub 链接;按钮上方一行**全球统计 chips**(已定放,§6-D4):「🌳 全球 N 棵树 · ⚡ 累计 M token」,复用 LeaderboardTeaser 数据源(totalTrees/totalTokens),tokscale 式数字社会证明。

---

## 4. 文案初稿(zh / en;ja·ko 定稿后照译)

### Metadata + 导航

| key | zh | en |
|---|---|---|
| `Metadata.dashboardTitle` | 数据面板 — Token-Forest | Dashboard — Token-Forest |
| `Metadata.dashboardDescription` | 你的 token 成绩单:成长、用量与花费,本地计算、离线计价、绝不上传。 | Your token report card: growth, usage and cost — computed locally, priced offline, never uploaded. |
| `TopBar.dashboard` | 数据面板 | Dashboard |

### Hero

| key | zh | en |
|---|---|---|
| `eyebrow` | DASHBOARD | DASHBOARD |
| `badge` | 即将推出 · 随下个版本 | Coming in the next release |
| `heading` | 你的 token 成绩单 | Your token report card |
| `tagline` | 别人给你一张表,Token-Forest 给你一棵树——和一份看得懂的账单。 | Other tools print a table. Token-Forest grows a tree — and keeps the receipts. |
| `sub` | Claude Code 与 Codex 的成长、用量与花费分析:本地计算、离线计价、绝不上传。 | Growth, usage and cost analytics for Claude Code & Codex — computed locally, priced offline, never uploaded. |
| `ctaDownload` | 下载 Token-Forest | Download Token-Forest |
| `ctaGithub` | GitHub | GitHub |

### 三层导览(标题/正文,chips 由设计排)

| 层 | zh | en |
|---|---|---|
| 成长 | 每棵树一份档案:阶段、种植天数、成长曲线,还有「这棵树至今 ≈ $X」。 | A profile for every tree: stage, days planted, growth curve — and what it's worth so far. |
| 用量 | 全历史统计:日/周/月曲线、Claude 与 Codex 各模型拆分、26 周热力图、burn rate、按项目分账。 | Full local analytics: daily, weekly and monthly charts, per-model splits for Claude & Codex, a 26-week heatmap, burn rate, per-project breakdown. |
| 对话 | 每次对话一行账单:标题、项目、提问数、四类 token 与估算花费。 | One line per conversation: title, project, prompts, all four token types, estimated cost. |

### 亮点 4 卡

| 卡 | zh | en |
|---|---|---|
| 养成叙事 | 统计长在树上——数字不再是报表,是你养出来的东西。 | Your stats grow on a tree — numbers you raised, not rows you scroll. |
| 对话账单 | 每次对话一行:干了什么、在哪个项目、花了多少,一眼看完。 | One line per conversation: what it was, which project, what it cost. |
| 默认离线计价 | 官方价格表内置随版本发布,运行时零联网——不是可选项,是唯一模式。 | The official price table ships inside the app. Zero network at runtime — not an option, the only mode. |
| 诚实口径 | 四类 token 分开计价,cache 读按 0.1× 折算并写明来历,与官方限额同口径。 | Four token types priced separately, cache reads at 0.1× with the math shown — the same accounting the official quotas use. |

### FAQ(问/答要点)

| # | zh | en |
|---|---|---|
| 1 | 为什么我的 cache 读有十亿级?/ 这是 agent 的工作方式:每次工具调用都会重读整段会话前缀。所以它单价最低(约 input 的 0.1×),成绩单按 0.1× 计价并单独列出。 | Why are my cache reads in the billions? / That's how agents work: every tool call re-reads the conversation prefix. It's also the cheapest type (~0.1× input) — the report card prices it at 0.1× and lists it separately. |
| 2 | 花费数字准吗?/ 是估算:本地用量 × 内置官方价格表(带更新日期),不是账单,不含订阅折扣。 | Are the cost numbers accurate? / They're estimates: local usage × a bundled official price table (with its update date). Not a bill; subscription discounts not included. |
| 3 | 我的数据会上传吗?/ 不会。成绩单只读用量数字、模型名、时间与会话标题等元数据,不读对话正文,全部本地展示。排行榜是另一个可选功能,开启后也只上传 token 总数和昵称。 | Does any data leave my machine? / No. The dashboard reads metadata only — counts, model names, timestamps, session titles — never conversation content, all shown locally. The leaderboard is a separate opt-in that uploads only a total and a nickname. |
| 4 | 历史能追多久?/ 首次打开会重解析全部本地日志(装 App 之前的也算),之后记入本地账本——CLI 日志 30 天被清理后,你的曲线还在。 | How far back does history go? / First open re-parses all local logs (even from before you installed), then a local ledger takes over — your history survives the CLI's 30-day log cleanup. |

### 常驻小字(与 App 端逐字同源)

- zh:`只读用量数字、模型名、时间与会话标题等元数据,不读对话正文,绝不上传。花费为估算值,基于内置价格表,非账单。`
- en:`Reads only metadata — token counts, model names, timestamps, session titles. Never your conversation content, never uploaded. Costs are estimates from a bundled price table, not a bill.`

### 首页 Features 第 6 卡(跳转 `/dashboard`)

| key | zh | en |
|---|---|---|
| `dashTitle` | 数据面板 · 成绩单 | Dashboard · Report Card |
| `dashBullet0` | 成长 / 用量 / 对话三层视图,像素风成绩单 | Three views — growth, usage, conversations — in one pixel report card |
| `dashBullet1` | 完全离线的花费估算:这棵树至今 ≈ $X | Fully offline cost estimates: see what your tree is worth |
| `dashMore` | 了解更多 → | Learn more → |
| badge | 即将推出 | Coming soon |

---

## 5. 入口与路由改动清单(施工时逐项打勾)

1. **TopBar**:`components/top-bar.tsx` 导航数组加 dashboard 项(位置:download 与 leaderboard 之间);`TopBar.dashboard` key ×4 语言;移动端菜单同步。
2. **Footer**:product 列加 dashboard 链接(`Footer.dashboard` ×4)。
3. **Metadata**:`Metadata.dashboardTitle/Description` ×4;`app/[locale]/dashboard/page.tsx` 的 `generateMetadata`。
4. **路由**:新建 `app/[locale]/dashboard/page.tsx`;补 `app/dashboard/page.tsx` 空 stub(与 download/leaderboard 的既有模式一致,non-locale 由 middleware 跳转)。
5. **首页 Features 卡**:`FEATURES` 数组第 6 项 + mini demo;**`FeatureCard` 需支持链接**(现为纯展示组件——加可选 `href` prop 或外层 `<Link>` 包裹,hover 效果保留)。6 张卡正好补齐 2 列 grid。
6. **Roadmap.f2**:保留,label 不变,desc 改为 zh「已开发完成,随下个版本推出——详情见『数据面板』页。」/ en "Feature-complete — shipping with the next release. See the Dashboard page.";**安装包发布日**再删除该条并把页面/卡片 badge 切 Live(§6-D3 的切换待办)。
7. **新 i18n 命名空间**:`DashboardPage`(hero/三层/亮点/FAQ/CTA,约 30 key ×4 语言)。
8. 检查 `app/globals.css` 新增 §DASHBOARD DEMO 段;`npm run lint && npm run type-check`;四语过一遍长词溢出(ja/ko)。

---

## 6. 拍板记录(2026-07-05 二轮,全部已定)

| # | 项 | 结论 |
|---|---|---|
| D1 | 中文导航名 | **数据面板**(与 Roadmap 现用词一致);页内 hero 仍用「你的 token 成绩单」叙事;ja ダッシュボード / ko 대시보드 |
| D2 | $ 示例数字 | **中性小数 ≈ $128.40**:足够真实但不吓人,配「数字为虚构示例」小字;真实大数($1,065 级)留给日后社交分享图 |
| D3 | 发布状态 | App 端功能已完成,**安装包尚未发布**(仍在改动)→ ① `/dashboard` hero 挂「即将推出 · 随下个版本」badge(gold/soon 色);② 首页第 6 卡 badge「即将推出」(与水果卡同款);③ Roadmap.f2 保留、desc 改口(§5-6)。**发布日切换待办**:badge 换 Live(绿),f2 删除 |
| D4 | 全球统计 chips | **放**。含义:排行榜 Supabase 表里现成的全球总数——`totalTrees`(全球树数)与 `totalTokens`(全球累计 token),首页排行榜预告区已在展示同款数字。表现:尾部下载按钮上方一行两枚像素小 chip:「🌳 全球 1,234 棵树 · ⚡ 累计 5.6B token」——tokscale 式社会证明,证明"真的有人在种"。设计若觉得挤,可并成一行小字 |
| D5 | FAQ | **4 问全上**(「诚实口径」差异化的主要承载区);设计可做折叠手风琴 |

---

## 7. 下一步

1. ✅ 拍板(2026-07-05 完成,记录见 §6);
2. ✅ Claude Design 出稿(`dashboard-claudedesign/`,选定:整页 1b 暗色分栏 · 首页第 6 卡 4a · 胶囊卡 5a;按反馈去掉「即将推出」badge、右键菜单对齐真实 App);
3. ✅ **施工完成(2026-07-05)**:`/dashboard` 页(1b)+ 交互 mock(`components/dashboard-mock.tsx`,4s 轮播/hover 暂停/点击保持 12s/$ 滚动/reduced-motion 静态)+ 首页第 6 卡(4a,整卡跳转)+ 胶囊卡(5a,替换原 taskbar 卡)+ TopBar/Footer 导航 + 四语 i18n(每语言 95 个新 key)+ lint/type-check/build 全绿,zh/en/ja/ko 目检通过;
4. 待办:移动端 390 宽目检(设计稿未含移动版,已按全站响应式惯例实现,待真机过一遍);
5. 安装包发布日:Roadmap.f2 删除、CTA 文案「安装包正在打包」改为直链(§6-D3)。
