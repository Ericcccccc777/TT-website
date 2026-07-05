# 网站「Dashboard / 成绩单」介绍区 — 讨论稿

> **⚠️ 2026-07-05 决策更新:放置方案已定为独立页 `/dashboard`(本文 §4 的方案 C 变体),**
> **市场调查与页面蓝图见 [dashboard-page.md](dashboard-page.md)(为准)。**
> 本文 §3 素材库、§5 mock 色表、§6 文案初稿仍被新文档引用,保留存档。

> 目标:在官网上给桌面端 Dashboard(应用内叫「成绩单」)一个正式的描述与简介。
> 本文只做方案与文案讨论,**不含实现代码,定稿前不动网站代码**。
> App 端功能事实全部来自 `Token-Forest/docs/DASHBOARD.md`(设计+施工记录)。

---

## 1. 现状与差距

**网站现状**:Dashboard 目前只在 Roadmap 区占一行(`Roadmap.f2`:「数据面板 · 即将推出 —
种植天数、成长曲线、各模型用量拆分,以及完全离线的成本估算」)。Features 区 5 张卡里没有它。

**App 端现状**(截至 2026-07-02,见 DASHBOARD.md §8/§9):一期 + 二期**全部施工完成**,tests 99/99:

- 三层视图:🌳 成长 / 📊 用量 / 💬 对话,左上角切换;
- 右键树菜单「📊 查看成绩单」打开,独立可缩放窗口;
- 视觉即将套用 v2a「羊皮纸」主题(`design_handoff_dashboard_v2a/`,与游戏内菜单/宝箱同套配色)。

**差距**:网站还把它当"未来功能"一句话带过,而它实际上是产品中体量最大、
与 ccusage/tokscale 等工具正面竞争的差异化功能。这次要把一句话占位升级为正式介绍。

---

## 2. 参考:同类工具官网怎么介绍(2026-07-05 实查 ccusage.com)

| 工具 | 官网做法 | 可借鉴 |
|---|---|---|
| **ccusage** | Hero 一句话定位(「A fast local CLI for tracking tokens and estimated costs across Claude Code, Codex, …」)+ 6 张 feature 卡(All Sources by Default / Focused Views / Local Data Sources / Cost Analysis / Enhanced Display / JSON Output)+ Get Started / GitHub 两个 CTA | ① 一句话定位里直接点名支持的工具;② 功能卡片化,每卡一个动词短语;③ 「local / 不上传」作为独立卖点反复出现 |
| **tokscale**(DASHBOARD.md §0.2 已核实) | 榜单双指标:含 cache 总量 + Cost | 「token 数 + 折算 $」双数字并排,是行业通用表达 |
| 通用套路 | 大截图/终端演示做主视觉,成本数字做锚点 | 我们的 $ 大数字(「这棵树至今 ≈ $X」)天然就是钩子 |

**我们与 ccusage 的差异化(= 网站文案的卖点来源)**:

1. **完全离线计价**:价格表内置随版本发布,绝不联网拉取(ccusage 默认在线拉 LiteLLM 价格表)——与全站「不联网、不上传」的信任叙事一致。
2. **不止统计,还有养成叙事**:同一套数字既是报表也是树的成长档案;「这棵树值多少钱」是 ccusage 给不了的情感钩子。
3. **GUI 像素风成绩单**,不是终端表格;与桌宠同套美术(羊皮纸账本)。
4. **对话级账单**(第 3 层):每次对话一行,标题/项目/提问数/四类 token/≈$ ——ccusage 的 session 维度是会话文件级,我们展示得更像"账单"。
5. Claude Code + Codex 双源(ccusage 现在支持面更广,这点不吹"更多",只说"双源并排")。

---

## 3. 素材库:App 端已实现的功能(网站文案只能从这里取,不许超卖)

### 三层视图(二期,已完成)

| 层 | 内容 |
|---|---|
| 🌳 **成长** | 树切换条(苹果/樱花/仙人掌,未解锁带 🔒);单棵树:阶段 + 种植天数 + 累计能量 + 成长曲线(累计/每日/价值);每树估值「这棵树 ≈ $X」;恒显全部树总成长 |
| 📊 **用量** | 累计/每日/花费曲线(日/周/月聚合切换);Claude & Codex 各模型用量与花费表;「真实消耗」卡:总 $ + 四类 token 按金额堆叠条 + 图例;26 周贡献热力图;burn rate(近 7 日均 token/日 + $/日);按项目拆分(前 8) |
| 💬 **对话** | 每对话一行:标题(AI 生成)/ 项目 / 时间 / 提问数 / 模型 + 四类 token + ≈$;30 条分页,近 200 条 |

### 底层卖点(可拆成 feature bullets)

- **离线计价**:内置 `pricing.json`(Anthropic + OpenAI 官方价,带 `_updated` 时间戳),运行时零联网。
- **四类 token 分开计价**(input / output / cache 读 / cache 写),与官方订阅限额同口径(cache 读 ≈0.1×)——「诚实回答我到底用了多少」。
- **全历史统计**:重解析全量日志 + 本地账本(`usage_ledger.json`),日志被官方 30 天清理后历史仍在。
- **口径全站统一**:树、曲线、排行榜、模型表同一套数(四类全量),任何两个界面数字能对上。

### 两句必须逐字对齐的话(网站不得另写口径)

1. **隐私措辞(D1 定稿)**:「读取用量数字、模型名、时间与会话标题等元数据,**不读对话正文**;所有数据仅本地展示、绝不上传」。
2. **花费免责**:「估算值,仅供参考;基于本地用量 × 内置价格表(更新于 X),非账单」。网站任何出现 $ 数字的地方带同款小字。

---

## 4. 放置方案(A / B / C,推荐 B)

### 方案 A — Features 区加第 6 张卡(最小改动)

- 照抄现有模式:`Features` 命名空间加 `dashTitle/dashBullet0/dashBullet1/dashBadge`,`FEATURES` 数组加一项,配一个 mini demo。
- ✅ 顺手的好处:现在 5 张卡在 2 列 grid 里最后一张落单,补成 6 张正好排满。
- ❌ 缺点:体量与地位不匹配——dashboard 是最大差异化功能,一张卡讲不完三层。

### 方案 B — 首页独立 Section(推荐)

- 位置:**TreeShowcase(§4)之后、Roadmap(§5)之前**——顺序变成「看树 → 看成绩单 → 看未来」,叙事顺:先情感(树),再理性(数据),再期待(路线图)。
- 结构(与现有 section 同构:pixel 标题 + 副标 + 主体 + 底部隐私行):
  1. 标题 + 一句话副标(钩子:「这棵树到底吃了多少 token、值多少钱」);
  2. **大号羊皮纸 mock**(见 §5),三层 tab 可切换/自动轮播;
  3. 三层各一行简介(icon + 标题 + 一句话);
  4. 2×2 feature bullets(离线计价 / 四类口径 / 全历史 / 双源);
  5. 隐私 + 免责小字行。
- i18n:新命名空间 `DashboardSection`(≈ 15 个 key × 4 语言)。
- 同时把 Features 区 A 方案那张卡也加上(可选,一句话版指到本 section)。

### 方案 C — 独立页 `/dashboard`(暂缓)

- 完整介绍 + 设计稿多屏 + 口径 FAQ。信息量最大,但要动导航、页脚、4 语 metadata,
  且发布前流量撑不起独立页。**留到桌面端正式发布后再议**。

### Roadmap 的同步处理(选任一方案都要做)

`Roadmap.f2`(数据面板 · 即将推出)与新 section 矛盾,二选一:

- 若 dashboard 随下个安装包发布 → f2 删除,空位可补「对话账单」以外的真未来项(或四项减为三项);
- 若安装包还没带上 → 新 section 用 **Beta / 开发完成** badge,f2 保留但文案改为「已完成,随下个版本推送」。

**→ 取决于发布节奏,待拍板(见 §7-Q3)。**

---

## 5. 展示形式:CSS mock(推荐)vs 设计稿截图

**推荐纯 CSS/JSX mock**,理由:可 i18n(截图里的字翻不了)、与全站像素风一致、体积小、
可动画。完全照抄 `feature-demos.tsx` 的既有工程模式:服务端组件 + CSS keyframes +
`InViewGate` 离屏冻结 + `aria-hidden` + reduced-motion 兜底。

**配色直接搬 v2a 羊皮纸交接稿**(`design_handoff_dashboard_v2a/README.md` 有完整色表),网站无需自创:

| 用途 | 色值 |
|---|---|
| 内容区底 / 卡底 / 槽 | `#f2dfae` / `#faedc8` / `#e3cd8f` |
| 主文字 / 卡描边 | `#33210d` / `#4a2a0d` |
| 绿(图形)/ 金(图形) | `#57a568` / `#d9a83c` |
| Claude 点 / Codex 点 | `#e0885f` / `#5cc2c9`(与网站现有 bubble 色一致) |
| 热力图五档(少→多) | `#eadcab #b9d98b #8cc46a #57a94e #2e7d3c` |

**mock 内容分镜**(还原 DASHBOARD.md §5 布局的缩小版):

- 🌳 tab:左小树 + 阶段进度条,右「已种植 41 天 / 累计 112.6M」;
- 📊 tab:`≈ $1,065` 大数字 + 四类堆叠条 + 迷你折线 + 两行模型条(opus/fable);
- 💬 tab:两三行对话账单(标题省略号 + 模型点 + ≈$);
- 动效:tab 自动轮播(hover 暂停),$ 数字滚动,堆叠条生长。

备选:v2a 交接稿的 `数据面板….dc.html` 浏览器截图——**不进网站正文**,但适合
README / 社交分享图 / 以后 `/dashboard` 页。

---

## 6. 文案初稿(zh / en;ja·ko 定稿后照译)

> 语气对齐现有文案:短句、名词短语、不吹「最」;$ 示例数字刻意用中性小数(见 §7-Q4)。

### Section 主体

| key(拟) | zh | en |
|---|---|---|
| `heading` | 你的 token 成绩单 | Your Token Report Card |
| `tagline` | 树只是表面。点开成绩单,看看这棵树到底吃了多少 token、值多少钱。 | The tree is just the surface. Open the report card to see exactly what it ate — model by model, dollar by dollar. |
| `layerGrowthTitle` | 成长 | Growth |
| `layerGrowthBody` | 每棵树一份档案:阶段、种植天数、成长曲线,还有「这棵树至今 ≈ $X」。 | A profile for every tree: stage, days planted, growth curve — and what it's worth so far. |
| `layerUsageTitle` | 用量 | Usage |
| `layerUsageBody` | 每日/累计/花费曲线、Claude & Codex 各模型拆分、26 周热力图、burn rate、按项目分账。 | Daily, cumulative and cost charts, per-model splits for Claude & Codex, a 26-week heatmap, burn rate, per-project breakdown. |
| `layerChatTitle` | 对话 | Conversations |
| `layerChatBody` | 每次对话一行账单:标题、项目、提问数、四类 token 与估算花费。 | One line per conversation: title, project, prompts, all four token types, estimated cost. |

### Feature bullets(2×2)

| key(拟) | zh | en |
|---|---|---|
| `b0` | 完全离线计价——官方价格表内置随版本发布,绝不联网拉取 | Fully offline pricing — the official price table ships with the app, never fetched at runtime |
| `b1` | 四类 token 分开计价(input / output / cache 读 / cache 写),与官方限额同口径 | Four token types priced separately — the same math the official quotas use |
| `b2` | 全历史本地账本,官方日志 30 天清理后你的曲线还在 | A local ledger keeps your full history — even after the CLI prunes its own logs |
| `b3` | Claude Code 与 Codex 并排统计,一张表看完 | Claude Code and Codex side by side, in one table |

### 常驻小字(两句定稿话术的网站版)

- zh:`只读用量数字、模型名、时间与会话标题等元数据,不读对话正文,绝不上传。花费为估算值,基于内置价格表,非账单。`
- en:`Reads only metadata — token counts, model names, timestamps, session titles. Never your conversation content, never uploaded. Costs are estimates from a bundled price table, not a bill.`

### 若同时加 Features 卡(方案 A 组件)

- zh:标题「成绩单 · 数据面板」;bullets:「三层视图:成长 / 用量 / 对话」「离线计价:这棵树至今 ≈ $X」
- en:标题「Report Card · Stats」;bullets:「Three views: growth / usage / conversations」「Offline cost estimate — see what your tree is worth」

---

## 7. 待拍板问题(讨论清单)

| # | 问题 | 默认建议 |
|---|---|---|
| Q1 | 方案 A / B / C? | **B**(首页独立 section),A 的卡可作为附赠一起做 |
| Q2 | 命名:中文「成绩单」已定(App 菜单同名);英文 **Report Card** 还是 **Stats Dashboard**? | 标题用 Report Card(有养成味),副标/正文里出现 stats/dashboard 兜住搜索词 |
| Q3 | badge 状态:Live now / Beta / Coming soon?——取决于 dashboard 是否已随安装包发布 | 需要你确认发布节奏;未发布则 **Beta**,并同步改 Roadmap.f2 文案 |
| Q4 | 网站 mock 里的 $ 示例数字用多大?(真实数据 $1,065 有冲击力,但可能被读成「这工具好烧钱」的反广告) | mock 用中性数字(如 ≈ $128.40),把「数字大小」留给用户自己的成绩单 |
| Q5 | demo 形式:CSS mock vs 设计稿截图? | **CSS mock**(可 i18n、可动画);截图留给 README/分享图 |
| Q6 | 三层 tab 自动轮播还是 hover 切换? | 自动轮播 + hover 暂停(与 TreeShowcase 的 stages auto-rotate 呼应) |
| Q7 | 是否顺手把 `DownloadPage` 的「这是什么」三条里加一条成绩单? | 可以,但放二批,先把首页 section 定了 |

---

## 8. 定稿后的施工清单(预览,不在本次范围)

1. `messages/{zh,en,ja,ko}.json` + `DashboardSection` 命名空间(en/zh 用 §6 定稿,ja/ko 照译);
2. `components/dashboard-showcase.tsx`(section 主体)+ `components/dashboard-demo.tsx`(羊皮纸 mock);
3. `app/globals.css` 新增 §DASHBOARD DEMO 段(动画 keyframes,复用 `.scene-paused` 约定);
4. `app/[locale]/page.tsx` 插入 section(TreeShowcase 与 Roadmap 之间)+ Roadmap.f2 同步处理;
5. (可选)Features 第 6 卡;
6. `npm run lint && npm run type-check` + 四语人肉过一遍换行/溢出(ja/ko 长词注意 `overflowWrap`)。
