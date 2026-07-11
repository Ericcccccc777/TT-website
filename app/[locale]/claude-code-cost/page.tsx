import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata } from "@/lib/seo";
import { ArticleDocView, type ArticleDoc } from "@/components/article-doc";
import { ArticleJsonLd, BreadcrumbJsonLd, FaqJsonLd } from "@/components/json-ld";

const PATH = "/claude-code-cost";

const EN: ArticleDoc = {
  "eyebrow": "GUIDE",
  "title": "How Much Does Claude Code Cost? Token Pricing, Explained",
  "intro": "If you use Claude Code every day, the token counters can look terrifying — millions, sometimes hundreds of millions of tokens in a week. But raw token counts are a poor guide to what you actually pay. Most of those tokens are cheap cache reads, your model choice matters more than volume, and whether you pay per token at all depends on which billing path you're on. This guide breaks down how Claude Code cost really works — the four token classes, per-model rates, subscription vs pay-as-you-go — and shows how to see your own real number, computed locally on your machine.",
  "updated": "Last updated 11 July 2026",
  "sections": [
    {
      "h2": "The short version"
    },
    {
      "list": [
        "Claude Code is billed two ways: included in a Claude Pro or Max subscription (a flat monthly fee), or pay-as-you-go via the Anthropic API (billed per token).",
        "Per-token cost depends on the model (Opus > Sonnet > Haiku) and the token class — output is the most expensive, cache reads the cheapest, at about a tenth of the input rate.",
        "Raw token counts look enormous because coding sessions reuse huge amounts of cached context — but those cache-read tokens are billed at roughly 10% of the input rate, so real cost is far smaller than the raw number suggests.",
        "The only way to know your number is to look at your own usage. Token Forest's dashboard estimates it locally from your logs, fully offline."
      ]
    },
    {
      "h2": "Two ways Claude Code is billed"
    },
    {
      "p": "Before you can answer \"is Claude Code expensive?\", you need to know which meter you're on. There are two, and they behave completely differently."
    },
    {
      "h3": "1. A Claude Pro or Max subscription (flat monthly fee)"
    },
    {
      "p": "Claude Pro and the Max tiers bundle Claude Code together with Claude on the web, desktop, and mobile. You pay a fixed monthly price and your Claude Code usage draws from the same shared allowance as your chats — there's no per-token bill. Usage is capped by rolling limits (a short rolling window plus a weekly ceiling) rather than a dollar amount, so cost is predictable, but heavy days can hit a wall until the window resets. As of 2026-07-11, Pro is around $20/month, and the Max tiers are around $100/month (roughly 5x Pro's capacity) and $200/month (roughly 20x). Check Anthropic's plan page for current limits."
    },
    {
      "h3": "2. Pay-as-you-go via the Anthropic API"
    },
    {
      "p": "If you authenticate Claude Code with an API key instead, every token is billed at standard API rates with no cap — heavy all-day runs never get throttled by a window, but the bill scales directly with what you use. One gotcha: if an ANTHROPIC_API_KEY is set in your environment, Claude Code uses it instead of your subscription, so you can rack up API charges without realising your Pro/Max plan was sitting right there."
    },
    {
      "callout": "Rule of thumb: if your usage is steady and moderate, a subscription is usually cheaper and more predictable. If it's bursty or very heavy, API billing removes the window but the meter never stops. Either way, watching your actual token mix — not the raw count — is what tells you whether you're overpaying."
    },
    {
      "h2": "The four token classes — and why raw counts look scary"
    },
    {
      "p": "Every Claude request splits its tokens into four classes, and they are not priced the same. Understanding the mix is the single biggest key to reading your cost."
    },
    {
      "list": [
        "Input — the tokens you send: your prompt, files, and conversation history. Priced at the model's base input rate.",
        "Output — the tokens Claude generates back. The most expensive class, typically about 5x the input rate.",
        "Cache write — the first time a big chunk of context (a system prompt, a large file) is stored so it can be reused. Priced slightly above input: about 1.25x for the short-lived cache, 2x for the long one.",
        "Cache read — reusing already-cached context on a later request. The cheapest class by far, at about 0.1x — one tenth of the input rate."
      ]
    },
    {
      "p": "Coding agents like Claude Code lean heavily on caching: the same project files and instructions get re-sent turn after turn, so a huge share of your raw token count is cache reads. That's why the headline number looks enormous. But because cache reads cost about a tenth of input, they translate into far less money than the raw count implies."
    },
    {
      "callout": "The counter-intuitive part: in Token Forest's own six-week sample, cache reads were about 57% of the real dollar cost while input and output together were only about 24% — the rest was cache writes. Cache reads are cheap per token, but there are so many of them that they still add up. Raw token totals overstate cost; the dollar-weighted mix is what matters."
    },
    {
      "h2": "How model choice drives cost"
    },
    {
      "p": "After the token mix, the model you run is the biggest lever. Claude's tiers trade capability for price: Opus is the most capable and most expensive, Sonnet sits in the middle, Haiku is the cheapest and fastest. Output tokens cost about 5x input across all of them, and cache reads are always about a tenth of input. Rates below are per million tokens (MTok), confirmed from Anthropic's pricing page on 2026-07-11 — they change, so treat them as a snapshot and check the source for current numbers."
    },
    {
      "table": {
        "head": [
          "Model (tier)",
          "Input /MTok",
          "Output /MTok",
          "Cache read /MTok"
        ],
        "rows": [
          [
            "Claude Opus 4.8 (most capable)",
            "$5",
            "$25",
            "$0.50"
          ],
          [
            "Claude Sonnet (mid-tier)",
            "$3",
            "$15",
            "$0.30"
          ],
          [
            "Claude Sonnet 5 (intro, thru 31 Aug 2026)",
            "$2",
            "$10",
            "$0.20"
          ],
          [
            "Claude Haiku 4.5 (fastest, cheapest)",
            "$1",
            "$5",
            "$0.10"
          ]
        ]
      }
    },
    {
      "p": "The practical takeaway: running Opus for everything costs about five times more per token than Haiku. Many workflows use a cheaper model for routine edits and reserve the top tier for hard reasoning. Whether that's worth it depends entirely on your work — which, again, you can only judge from your own numbers."
    },
    {
      "h2": "So — is Claude Code expensive?"
    },
    {
      "p": "Honestly: it depends, and the raw token counter is the worst way to guess. On a Pro or Max subscription, your Claude Code cost is simply the flat monthly fee, no matter how many tokens scroll past. On API billing, cost tracks your real token mix — and because cache reads dominate volume at a tenth of the price, most people's real spend is a lot lower than the eye-watering raw totals suggest. The only honest answer is your answer, from your own logs."
    },
    {
      "h2": "How to see your real cost — locally, offline"
    },
    {
      "p": "Token Forest reads the usage logs Claude Code (and OpenAI Codex) already write on your machine and turns them into a plain-English cost estimate. It uses only the token counts, model names, and timestamps — never your source code, prompts, or conversation content — and it works with the network fully disabled. Nothing is uploaded."
    },
    {
      "steps": [
        "Install Token Forest (free public beta) for Windows or macOS and let it read your local Claude Code and Codex logs.",
        "Open the Usage view for daily, weekly, and monthly charts, a per-model breakdown, a burn-rate figure, and a per-project split.",
        "Open the Chats view to see one line per conversation — its four token classes and an estimated cost — so you can spot which sessions actually cost money.",
        "Use the Growth view to watch your spend as a living pixel tree, with a \"this tree ≈ $X\" readout per stage."
      ]
    },
    {
      "callout": "The dashboard's cost figure is an estimate from a bundled price table — computed locally, and it may differ from your actual Anthropic or OpenAI invoice. Treat it as a fast, private read on where your tokens go, and reconcile against your official bill for exact amounts."
    },
    {
      "p": "Prefer the terminal? ccusage, an independent open-source CLI by ryoppippi, reads the same Claude Code logs and prints cost reports as text. Token Forest is a visual alternative, not a front-end for it — same idea, different surface. Use whichever fits your workflow."
    }
  ],
  "faq": [
    {
      "q": "How much does Claude Code cost?",
      "a": "It depends on your billing path. On a Claude Pro or Max subscription it's a flat monthly fee (roughly $20 for Pro, and about $100 and $200 for the Max tiers as of 2026-07-11) with usage limits instead of a per-token bill. On API pay-as-you-go, you're charged per token at each model's rate, so the total tracks how much you actually use. To see your own figure, check your usage in Token Forest's dashboard."
    },
    {
      "q": "Why are my Claude Code token counts so high?",
      "a": "Because coding sessions reuse a lot of cached context — the same files and instructions are re-sent every turn as cache reads. Cache reads can be the majority of your raw token count, but they're billed at about a tenth of the input rate, so they cost far less than the number implies. The raw total overstates your real spend."
    },
    {
      "q": "What's the cost per token for Claude Code?",
      "a": "There's no single number — it depends on the model and the token class. As a snapshot on 2026-07-11: output is the priciest (about $25/MTok on Opus, $5 on Haiku), input is roughly a fifth of output, and cache reads are the cheapest at about a tenth of input. Sonnet sits between Opus and Haiku. Check Anthropic's pricing page for current rates."
    },
    {
      "q": "Is Claude Code expensive?",
      "a": "For most steady users, no — especially on a subscription, where cost is a fixed monthly fee. On API billing it can add up with heavy Opus use, but cache reads keep real cost well below what raw token counts suggest. The way to know for sure is to look at your own usage, which Token Forest estimates locally."
    },
    {
      "q": "Does Token Forest see my real Anthropic bill?",
      "a": "No. Token Forest never connects to your Anthropic or OpenAI account. It estimates cost locally from the token counts in your own logs using a bundled price table, so its figure may differ from your official invoice. It's a private, offline read on where your tokens go — reconcile against your real bill for exact amounts."
    }
  ],
  "faqHeading": "Frequently asked questions",
  "cta": {
    "heading": "See what your tokens actually cost",
    "body": "Token Forest turns your local Claude Code and Codex logs into a private, offline cost estimate — no account, no upload, network-optional. Watch your usage grow into a pixel tree while the dashboard does the maths.",
    "primaryLabel": "Download Token Forest",
    "primaryHref": "/download",
    "secondaryLabel": "Explore the dashboard",
    "secondaryHref": "/dashboard"
  }
};

const ZH: ArticleDoc = {
  "eyebrow": "指南",
  "title": "Claude Code 到底多少钱?Token 计价一次讲清",
  "intro": "如果你每天都在用 Claude Code,那些 token 计数器看起来会很吓人——一周动辄几百万甚至上亿 token。但原始 token 数量并不能真实反映你实际付了多少钱。这些 token 里绝大部分是便宜的缓存读取,真正影响花费的是你选的模型,而你到底要不要按 token 付费,取决于你走的是哪条计费通道。本指南拆解 Claude Code 费用的真实构成——四类 token、各模型单价、订阅制 vs 按量付费——并告诉你如何在本地、离线地看到属于你自己的真实数字。",
  "updated": "最后更新于 2026 年 7 月 11 日",
  "sections": [
    {
      "h2": "先说结论"
    },
    {
      "list": [
        "Claude Code 有两种计费方式:包含在 Claude Pro 或 Max 订阅里(每月固定费用),或通过 Anthropic API 按 token 付费。",
        "每个 token 的单价取决于模型(Opus > Sonnet > Haiku)和 token 类别——输出最贵,缓存读取最便宜,约为输入价的十分之一。",
        "原始 token 数看起来惊人,是因为编程会话会反复复用大量缓存上下文——但这些缓存读取 token 只按输入价的约 10% 计费,所以真实花费远比原始数字看上去的小。",
        "唯一能知道你自己花了多少的方法,就是看你自己的用量。Token Forest 的仪表盘会在本地、完全离线地根据你的日志估算出来。"
      ]
    },
    {
      "h2": "Claude Code 的两种计费方式"
    },
    {
      "p": "在回答『Claude Code 贵不贵』之前,你得先搞清楚自己走的是哪个计费口径。一共有两个,而且行为完全不同。"
    },
    {
      "h3": "1. Claude Pro 或 Max 订阅(每月固定费用)"
    },
    {
      "p": "Claude Pro 和 Max 各档把 Claude Code 和网页版、桌面版、手机版的 Claude 打包在一起。你付一个固定的月费,Claude Code 的用量和你的聊天共用同一份额度——没有按 token 的账单。用量由滚动限额封顶(一个较短的滚动时间窗加上一个每周上限),而不是按金额,所以花费可预测,但用得猛的日子可能会撞到上限,得等窗口重置。截至 2026-07-11,Pro 约为每月 20 美元,Max 两档约为每月 100 美元(容量约为 Pro 的 5 倍)和 200 美元(约 20 倍)。当前限额请以 Anthropic 的套餐页面为准。"
    },
    {
      "h3": "2. 通过 Anthropic API 按量付费"
    },
    {
      "p": "如果你改用 API 密钥来登录 Claude Code,那么每个 token 都按标准 API 单价计费,没有上限——整天高强度跑也不会被时间窗限流,但账单会随用量直接增长。有个坑要注意:如果你的环境里设了 ANTHROPIC_API_KEY,Claude Code 会用它而不是你的订阅,于是你可能在没意识到 Pro/Max 就在旁边的情况下,产生了一笔 API 账单。"
    },
    {
      "callout": "经验法则:如果你的用量稳定且适中,订阅通常更便宜也更好预算;如果忽高忽低或非常重度,API 计费去掉了时间窗,但计价表永不停。无论哪种,真正告诉你有没有多花钱的,是看你实际的 token 构成,而不是那个原始总数。"
    },
    {
      "h2": "四类 token——以及为什么原始数字看着吓人"
    },
    {
      "p": "每次 Claude 请求都会把 token 分成四类,而它们的价格并不一样。看懂这个构成,是读懂你花费的最关键一步。"
    },
    {
      "list": [
        "输入(Input)——你发出去的 token:你的提示词、文件和对话历史。按模型的基础输入价计费。",
        "输出(Output)——Claude 生成回给你的 token。最贵的一类,通常约为输入价的 5 倍。",
        "缓存写入(Cache write)——第一次把一大块上下文(系统提示、大文件)存起来以便复用。价格略高于输入:短时缓存约 1.25 倍,长时缓存约 2 倍。",
        "缓存读取(Cache read)——在后续请求里复用已经缓存的上下文。远远是最便宜的一类,约为 0.1 倍——输入价的十分之一。"
      ]
    },
    {
      "p": "像 Claude Code 这样的编程 agent 极度依赖缓存:同样的项目文件和指令一轮一轮地被重新发送,所以你原始 token 数里有很大一部分是缓存读取。这就是为什么那个醒目的大数字看着吓人。但正因为缓存读取只花输入价的约十分之一,它换算成钱要比原始数字暗示的少得多。"
    },
    {
      "callout": "反直觉的地方在于:在 Token Forest 自己的六周样本里,缓存读取约占真实花费的 57%,而输入加输出加起来只占约 24%——其余是缓存写入。缓存读取单价虽便宜,但数量太大,累加起来依然可观。原始 token 总数会高估花费;真正重要的是按金额加权的构成。"
    },
    {
      "h2": "模型选择如何决定花费"
    },
    {
      "p": "在 token 构成之后,你跑哪个模型是第二大的杠杆。Claude 的各档在能力和价格之间做取舍:Opus 最强也最贵,Sonnet 居中,Haiku 最便宜也最快。所有模型的输出 token 约为输入的 5 倍,缓存读取则始终约为输入的十分之一。下表单价以每百万 token(MTok)计,数据于 2026-07-11 取自 Anthropic 定价页——价格会变,请当作某一时点的快照,当前数字以来源为准。"
    },
    {
      "table": {
        "head": [
          "模型(档位)",
          "输入 /MTok",
          "输出 /MTok",
          "缓存读取 /MTok"
        ],
        "rows": [
          [
            "Claude Opus 4.8(能力最强)",
            "$5",
            "$25",
            "$0.50"
          ],
          [
            "Claude Sonnet(中档)",
            "$3",
            "$15",
            "$0.30"
          ],
          [
            "Claude Sonnet 5(优惠价,至 2026-08-31)",
            "$2",
            "$10",
            "$0.20"
          ],
          [
            "Claude Haiku 4.5(最快最省)",
            "$1",
            "$5",
            "$0.10"
          ]
        ]
      }
    },
    {
      "p": "实用结论:什么都用 Opus,每 token 的成本大约是 Haiku 的五倍。很多工作流会用更便宜的模型处理日常改动,把顶配档留给难的推理。这样值不值,完全取决于你的具体工作——而这一点,还是只能从你自己的数字来判断。"
    },
    {
      "h2": "那么,Claude Code 到底贵不贵?"
    },
    {
      "p": "老实说:看情况,而且原始 token 计数器是最糟糕的判断依据。在 Pro 或 Max 订阅上,你的 Claude Code 花费就是那个固定月费,不管多少 token 从眼前刷过。在 API 计费上,花费跟着你真实的 token 构成走——而因为缓存读取以十分之一的价格占据了绝大多数用量,大多数人的真实支出会比那个吓人的原始总数低不少。唯一诚实的答案,是从你自己日志里得出的那个答案。"
    },
    {
      "h2": "如何看到你的真实花费——本地、离线"
    },
    {
      "p": "Token Forest 读取 Claude Code(以及 OpenAI Codex)已经写在你机器上的用量日志,把它变成一份大白话的花费估算。它只用 token 数量、模型名和时间戳——绝不读你的源代码、提示词或对话内容——而且在完全断网的情况下也能工作。什么都不会被上传。"
    },
    {
      "steps": [
        "为 Windows 或 macOS 安装 Token Forest(免费公测),让它读取你本地的 Claude Code 和 Codex 日志。",
        "打开『用量(Usage)』视图,查看日/周/月图表、按模型拆分、燃烧率数字以及按项目的拆分。",
        "打开『对话(Chats)』视图,每条对话一行——它的四类 token 和一个花费估算——这样你就能看出到底哪些会话真正花了钱。",
        "用『成长(Growth)』视图把你的花费看成一棵会长大的像素树,每个阶段都有一个『这棵树 ≈ $X』的读数。"
      ]
    },
    {
      "callout": "仪表盘里的花费数字是根据内置价格表得出的估算——它在本地计算,可能和你 Anthropic 或 OpenAI 的实际账单有出入。把它当作对『你的 token 都花在哪』的一次快速、私密的判读,精确金额请以官方账单核对。"
    },
    {
      "p": "更喜欢终端?ccusage 是 ryoppippi 开发的一个独立开源 CLI,读取同样的 Claude Code 日志,以文本形式打印花费报告。Token Forest 是一个可视化的替代品,而不是它的前端——同样的思路,不同的呈现。用哪个,看你的习惯。"
    }
  ],
  "faq": [
    {
      "q": "Claude Code 要花多少钱?",
      "a": "取决于你的计费通道。在 Claude Pro 或 Max 订阅上,是每月固定费用(截至 2026-07-11,Pro 约 20 美元,Max 两档约 100 和 200 美元),用限额而不是按 token 出账。在 API 按量付费上,按每个模型的单价逐 token 计费,总额跟着你的实际用量走。想看你自己的数字,用 Token Forest 的仪表盘查你的用量。"
    },
    {
      "q": "为什么我的 Claude Code token 数这么高?",
      "a": "因为编程会话会复用大量缓存上下文——同样的文件和指令每一轮都作为缓存读取被重新发送。缓存读取可能占你原始 token 数的大头,但它们只按输入价的约十分之一计费,所以花的钱远比数字暗示的少。原始总数会高估你的真实支出。"
    },
    {
      "q": "Claude Code 每个 token 多少钱?",
      "a": "没有单一数字——取决于模型和 token 类别。以 2026-07-11 的快照为例:输出最贵(Opus 约 25 美元/MTok,Haiku 约 5 美元),输入大约是输出的五分之一,缓存读取最便宜,约为输入的十分之一。Sonnet 介于 Opus 和 Haiku 之间。当前单价请查 Anthropic 定价页。"
    },
    {
      "q": "Claude Code 贵吗?",
      "a": "对大多数用量稳定的人来说,不贵——尤其在订阅上,花费就是固定月费。在 API 计费上,重度使用 Opus 会累积起来,但缓存读取让真实花费远低于原始 token 数所暗示的。要确定,就看你自己的用量,Token Forest 会在本地帮你估算。"
    },
    {
      "q": "Token Forest 能看到我在 Anthropic 的真实账单吗?",
      "a": "不能。Token Forest 从不连接你的 Anthropic 或 OpenAI 账户。它只根据你自己日志里的 token 数量、用内置价格表在本地估算花费,所以它的数字可能和你的官方账单有出入。它是对『你的 token 都花在哪』的一次私密、离线判读——精确金额请以真实账单核对。"
    }
  ],
  "faqHeading": "常见问题",
  "cta": {
    "heading": "看看你的 token 到底花了多少",
    "body": "Token Forest 把你本地的 Claude Code 和 Codex 日志变成一份私密、离线的花费估算——无需账号、不上传、网络可选。一边看你的用量长成一棵像素树,一边让仪表盘替你算账。",
    "primaryLabel": "下载 Token Forest",
    "primaryHref": "/download",
    "secondaryLabel": "了解仪表盘",
    "secondaryHref": "/dashboard"
  }
};

const JA: ArticleDoc = {
  "eyebrow": "ガイド",
  "title": "Claude Code の料金はいくら? トークン課金を徹底解説",
  "intro": "Claude Code を毎日使っていると、トークンカウンターの数字はぎょっとするほど大きく見えます——1 週間で数百万、ときには数億トークン。ですが、生のトークン数は実際の支払額をほとんど正しく表しません。その大半は安価なキャッシュ読み取りで、コストを本当に左右するのは選んだモデルであり、そもそもトークン単位で払うかどうかは、どの課金経路を使っているかで決まります。本ガイドでは Claude Code の料金の実態——4 種類のトークン、モデル別の単価、サブスクリプション対従量課金——を分解し、あなた自身の実際の数字を、ローカルかつオフラインで確認する方法を示します。",
  "updated": "最終更新: 2026年7月11日",
  "sections": [
    {
      "h2": "まず結論から"
    },
    {
      "list": [
        "Claude Code の課金は 2 通り:Claude Pro または Max のサブスクリプションに含まれる(月額定額)か、Anthropic API 経由でトークン従量課金か。",
        "トークン単価はモデル(Opus > Sonnet > Haiku)とトークンの種類で決まります——出力が最も高く、キャッシュ読み取りが最も安く、入力の約 10 分の 1 です。",
        "生のトークン数が膨大に見えるのは、コーディングのセッションが大量のキャッシュ済みコンテキストを繰り返し再利用するから——ただしそのキャッシュ読み取りは入力単価の約 10% で課金されるため、実コストは数字が示すよりずっと小さくなります。",
        "自分がいくら使ったかを知る唯一の方法は、自分の使用状況を見ること。Token Forest のダッシュボードは、あなたのログからローカルで、完全オフラインに見積もります。"
      ]
    },
    {
      "h2": "Claude Code の 2 つの課金方式"
    },
    {
      "p": "「Claude Code は高いのか」を答える前に、自分がどの課金メーターに乗っているかを知る必要があります。メーターは 2 つあり、挙動はまったく異なります。"
    },
    {
      "h3": "1. Claude Pro / Max のサブスクリプション(月額定額)"
    },
    {
      "p": "Claude Pro と Max の各プランは、Claude Code をウェブ版・デスクトップ版・モバイル版の Claude とまとめて提供します。定額の月額を払い、Claude Code の使用量はチャットと同じ共有枠から消費されます——トークンごとの請求はありません。使用量は金額ではなくローリング制限(短めのローリング時間枠と週次上限)で頭打ちになるため、コストは読みやすい一方、使い込んだ日は枠がリセットされるまで壁に当たることがあります。2026-07-11 時点で、Pro は月額およそ 20 ドル、Max は月額およそ 100 ドル(Pro の約 5 倍の容量)と 200 ドル(約 20 倍)です。最新の上限は Anthropic のプランページをご確認ください。"
    },
    {
      "h3": "2. Anthropic API 経由の従量課金"
    },
    {
      "p": "代わりに API キーで Claude Code を認証すると、すべてのトークンが標準 API 単価で課金され、上限はありません——一日中の重い実行でも時間枠でスロットルされませんが、請求は使った分だけ直接増えます。落とし穴が 1 つ:環境変数に ANTHROPIC_API_KEY が設定されていると、Claude Code はサブスクリプションではなくそのキーを使うため、すぐそこに Pro/Max があるのに気づかないまま API 課金がかさむことがあります。"
    },
    {
      "callout": "目安:使用量が安定して中程度ならサブスクリプションのほうが安く、予算も立てやすい。ムラがあったり非常に重い場合、API 課金は時間枠を外しますがメーターは止まりません。いずれにせよ、払いすぎかどうかを教えてくれるのは、生の総数ではなく実際のトークン構成です。"
    },
    {
      "h2": "4 種類のトークン——そしてなぜ生の数字は怖く見えるのか"
    },
    {
      "p": "Claude のリクエストは毎回トークンを 4 種類に分け、それぞれ価格が違います。この構成を理解することが、自分のコストを読むうえで最大の鍵です。"
    },
    {
      "list": [
        "入力(Input)——あなたが送るトークン:プロンプト、ファイル、会話履歴。モデルの基本入力単価で課金。",
        "出力(Output)——Claude が生成して返すトークン。最も高く、通常は入力の約 5 倍。",
        "キャッシュ書き込み(Cache write)——大きなコンテキスト(システムプロンプトや大きなファイル)を再利用のために初めて保存するとき。入力よりやや高い:短期キャッシュで約 1.25 倍、長期で約 2 倍。",
        "キャッシュ読み取り(Cache read)——後続のリクエストでキャッシュ済みコンテキストを再利用するとき。ずば抜けて最も安く、約 0.1 倍——入力の 10 分の 1。"
      ]
    },
    {
      "p": "Claude Code のようなコーディング agent はキャッシュに強く依存します:同じプロジェクトファイルや指示がターンごとに再送されるため、生のトークン数の大部分がキャッシュ読み取りです。だから見出しの数字は膨大に見えます。ですがキャッシュ読み取りは入力の約 10 分の 1 なので、金額に直すと数字が示すよりはるかに少なくなります。"
    },
    {
      "callout": "直感に反する点:Token Forest 自身の 6 週間のサンプルでは、キャッシュ読み取りが実コストの約 57% を占め、入力と出力を合わせても約 24% にとどまりました——残りはキャッシュ書き込みです。キャッシュ読み取りは単価こそ安いものの、量が多すぎて結局は積み上がります。生のトークン総数はコストを過大に見せます。重要なのは金額で重み付けした構成です。"
    },
    {
      "h2": "モデル選択がコストをどう左右するか"
    },
    {
      "p": "トークン構成の次に大きいレバーは、どのモデルを走らせるかです。Claude の各ティアは能力と価格を天秤にかけます:Opus は最も高性能で最も高価、Sonnet は中間、Haiku は最も安く最速。すべてのモデルで出力トークンは入力の約 5 倍、キャッシュ読み取りは常に入力の約 10 分の 1 です。下記の単価は 100 万トークン(MTok)あたりで、2026-07-11 に Anthropic の料金ページで確認したもの——価格は変わるので、ある時点のスナップショットとして扱い、最新の数字は出典でご確認ください。"
    },
    {
      "table": {
        "head": [
          "モデル(ティア)",
          "入力 /MTok",
          "出力 /MTok",
          "キャッシュ読み取り /MTok"
        ],
        "rows": [
          [
            "Claude Opus 4.8(最高性能)",
            "$5",
            "$25",
            "$0.50"
          ],
          [
            "Claude Sonnet(中間)",
            "$3",
            "$15",
            "$0.30"
          ],
          [
            "Claude Sonnet 5(導入価格、2026-08-31 まで)",
            "$2",
            "$10",
            "$0.20"
          ],
          [
            "Claude Haiku 4.5(最速・最安)",
            "$1",
            "$5",
            "$0.10"
          ]
        ]
      }
    },
    {
      "p": "実務上の要点:何でも Opus で走らせると、トークンあたりのコストは Haiku の約 5 倍です。多くのワークフローは日常的な編集に安いモデルを使い、難しい推論に最上位ティアを取っておきます。それが見合うかは、あなたの仕事次第——そしてそれも、結局はあなた自身の数字からしか判断できません。"
    },
    {
      "h2": "結局、Claude Code は高いのか?"
    },
    {
      "p": "正直に言えば:場合によります。そして生のトークンカウンターは最悪の判断材料です。Pro や Max のサブスクリプションなら、Claude Code のコストは、どれだけトークンが流れても、あの定額の月額そのものです。API 課金なら、コストは実際のトークン構成に連動します——そしてキャッシュ読み取りが 10 分の 1 の価格で大半を占めるため、多くの人の実支出は、あの目を疑う生の総数が示すよりずっと低くなります。唯一誠実な答えは、あなた自身のログから出たあなたの答えです。"
    },
    {
      "h2": "自分の実コストを見る方法——ローカル・オフライン"
    },
    {
      "p": "Token Forest は、Claude Code(および OpenAI Codex)がすでにあなたのマシンに書き出している使用ログを読み取り、それを平易な言葉のコスト見積もりに変えます。使うのはトークン数、モデル名、タイムスタンプだけ——ソースコードやプロンプト、会話の中身は一切読みません——そしてネットワークを完全に切っても動きます。何もアップロードされません。"
    },
    {
      "steps": [
        "Windows または macOS 向けに Token Forest(無料パブリックベータ)をインストールし、ローカルの Claude Code と Codex のログを読み込ませます。",
        "「使用状況(Usage)」ビューを開き、日次・週次・月次のグラフ、モデル別内訳、バーンレート、プロジェクト別の内訳を確認します。",
        "「チャット(Chats)」ビューを開くと、会話 1 件につき 1 行——その 4 種類のトークンと見積コスト——が表示され、どのセッションが本当にお金を使ったかがわかります。",
        "「成長(Growth)」ビューでは、支出を育っていくピクセルの木として眺め、各ステージに「この木 ≈ $X」の表示が付きます。"
      ]
    },
    {
      "callout": "ダッシュボードのコスト数値は、同梱の価格表に基づく見積もりです——ローカルで計算され、Anthropic や OpenAI の実際の請求とは異なる場合があります。「トークンがどこに消えているか」を素早く、プライベートに把握する手段として使い、正確な金額は公式の請求書と突き合わせてください。"
    },
    {
      "p": "ターミナル派ですか? ccusage は ryoppippi による独立したオープンソース CLI で、同じ Claude Code のログを読み、コストレポートをテキストで出力します。Token Forest はその前段(フロントエンド)ではなく、ビジュアルな代替です——同じ発想、別の見せ方。自分のワークフローに合うほうを使ってください。"
    }
  ],
  "faq": [
    {
      "q": "Claude Code はいくらかかりますか?",
      "a": "課金経路によります。Claude Pro / Max のサブスクリプションなら月額定額(2026-07-11 時点で Pro は約 20 ドル、Max の 2 ティアは約 100 ドルと 200 ドル)で、トークンごとの請求ではなく使用上限で管理されます。API 従量課金なら各モデルの単価でトークンごとに課金され、総額は実際の使用量に連動します。自分の数字は Token Forest のダッシュボードで確認できます。"
    },
    {
      "q": "なぜ私の Claude Code のトークン数はこんなに多いのですか?",
      "a": "コーディングのセッションが大量のキャッシュ済みコンテキストを再利用するからです——同じファイルや指示が毎ターン、キャッシュ読み取りとして再送されます。キャッシュ読み取りは生のトークン数の大部分を占めることがありますが、入力単価の約 10 分の 1 で課金されるため、数字が示すよりずっと安く済みます。生の総数は実支出を過大に見せます。"
    },
    {
      "q": "Claude Code のトークン単価はいくらですか?",
      "a": "単一の数字はありません——モデルとトークンの種類によります。2026-07-11 時点のスナップショットでは:出力が最も高く(Opus で約 25 ドル/MTok、Haiku で約 5 ドル)、入力は出力の約 5 分の 1、キャッシュ読み取りが最も安く入力の約 10 分の 1 です。Sonnet は Opus と Haiku の中間。最新単価は Anthropic の料金ページをご確認ください。"
    },
    {
      "q": "Claude Code は高いですか?",
      "a": "使用が安定している大半の人にとっては高くありません——特にサブスクリプションではコストは定額の月額です。API 課金では Opus を重く使うと積み上がりますが、キャッシュ読み取りのおかげで実コストは生のトークン数が示すよりずっと低く保たれます。確かめるにはあなた自身の使用状況を見ることで、Token Forest がローカルで見積もります。"
    },
    {
      "q": "Token Forest は私の Anthropic の実際の請求を見られますか?",
      "a": "いいえ。Token Forest はあなたの Anthropic や OpenAI のアカウントに一切接続しません。あなた自身のログのトークン数から、同梱の価格表を使ってローカルでコストを見積もるだけなので、その数字は公式の請求とは異なる場合があります。「トークンがどこに消えているか」をプライベートかつオフラインで把握する手段です——正確な金額は実際の請求書で突き合わせてください。"
    }
  ],
  "faqHeading": "よくある質問",
  "cta": {
    "heading": "あなたのトークンの実コストを見てみる",
    "body": "Token Forest は、ローカルの Claude Code と Codex のログを、プライベートでオフラインなコスト見積もりに変えます——アカウント不要、アップロードなし、ネットワークは任意。使用量がピクセルの木に育つのを眺めながら、計算はダッシュボードに任せましょう。",
    "primaryLabel": "Token Forest をダウンロード",
    "primaryHref": "/download",
    "secondaryLabel": "ダッシュボードを見る",
    "secondaryHref": "/dashboard"
  }
};

const KO: ArticleDoc = {
  "eyebrow": "가이드",
  "title": "Claude Code 비용은 얼마? 토큰 요금 완벽 정리",
  "intro": "Claude Code를 매일 쓰다 보면 토큰 카운터 숫자가 겁날 만큼 커 보입니다——일주일에 수백만, 때로는 수억 토큰. 하지만 원시 토큰 수는 실제로 얼마를 냈는지 거의 알려주지 못합니다. 그 대부분은 값싼 캐시 읽기이고, 비용을 실제로 좌우하는 것은 당신이 고른 모델이며, 애초에 토큰 단위로 내는지는 어떤 과금 경로를 쓰는지에 달려 있습니다. 이 가이드는 Claude Code 비용의 실제 구조——네 가지 토큰, 모델별 단가, 구독제 vs 종량제——를 풀어내고, 당신만의 실제 숫자를 로컬에서, 완전히 오프라인으로 확인하는 방법을 알려줍니다.",
  "updated": "마지막 업데이트: 2026년 7월 11일",
  "sections": [
    {
      "h2": "결론부터"
    },
    {
      "list": [
        "Claude Code 과금은 두 가지: Claude Pro나 Max 구독에 포함(월 정액)되거나, Anthropic API를 통해 토큰당 종량 과금.",
        "토큰당 단가는 모델(Opus > Sonnet > Haiku)과 토큰 종류에 따라 달라집니다——출력이 가장 비싸고, 캐시 읽기가 가장 싸며 입력의 약 10분의 1입니다.",
        "원시 토큰 수가 어마어마해 보이는 건 코딩 세션이 방대한 캐시 컨텍스트를 반복 재사용하기 때문——다만 그 캐시 읽기는 입력 단가의 약 10%로 과금되므로 실제 비용은 숫자가 암시하는 것보다 훨씬 작습니다.",
        "당신이 얼마를 썼는지 아는 유일한 방법은 당신 자신의 사용량을 보는 것. Token Forest 대시보드는 당신의 로그에서 로컬로, 완전히 오프라인으로 추정합니다."
      ]
    },
    {
      "h2": "Claude Code의 두 가지 과금 방식"
    },
    {
      "p": "'Claude Code가 비싼가'에 답하기 전에, 당신이 어느 계량기에 올라타 있는지부터 알아야 합니다. 계량기는 두 개이고, 작동 방식이 완전히 다릅니다."
    },
    {
      "h3": "1. Claude Pro 또는 Max 구독(월 정액)"
    },
    {
      "p": "Claude Pro와 Max 등급은 Claude Code를 웹·데스크톱·모바일 Claude와 하나로 묶어 제공합니다. 정해진 월 요금을 내면 Claude Code 사용량은 채팅과 같은 공유 한도에서 차감됩니다——토큰당 청구서는 없습니다. 사용량은 금액이 아니라 롤링 한도(짧은 롤링 시간 창에 주간 상한이 더해짐)로 제한되므로 비용은 예측 가능하지만, 많이 쓴 날엔 창이 초기화될 때까지 벽에 부딪힐 수 있습니다. 2026-07-11 기준 Pro는 월 약 20달러, Max는 월 약 100달러(Pro의 약 5배 용량)와 200달러(약 20배)입니다. 현재 한도는 Anthropic 요금제 페이지에서 확인하세요."
    },
    {
      "h3": "2. Anthropic API를 통한 종량 과금"
    },
    {
      "p": "대신 API 키로 Claude Code에 인증하면, 모든 토큰이 표준 API 단가로 과금되고 상한이 없습니다——하루 종일 무겁게 돌려도 시간 창에 막히지 않지만, 청구서는 사용량에 그대로 비례해 늘어납니다. 함정 하나: 환경에 ANTHROPIC_API_KEY가 설정돼 있으면 Claude Code는 구독이 아니라 그 키를 사용하므로, 바로 옆에 Pro/Max가 있는데도 모르는 사이에 API 요금이 쌓일 수 있습니다."
    },
    {
      "callout": "요령: 사용량이 꾸준하고 적당하면 대개 구독이 더 싸고 예산도 잡기 쉽습니다. 들쭉날쭉하거나 매우 무거우면 API 과금이 시간 창을 없애 주지만 계량기는 멈추지 않습니다. 어느 쪽이든, 과다 지불 여부를 알려주는 건 원시 총량이 아니라 실제 토큰 구성입니다."
    },
    {
      "h2": "네 가지 토큰——그리고 왜 원시 숫자는 무섭게 보이는가"
    },
    {
      "p": "Claude 요청은 매번 토큰을 네 종류로 나누며, 가격이 서로 다릅니다. 이 구성을 이해하는 것이 자기 비용을 읽는 가장 큰 열쇠입니다."
    },
    {
      "list": [
        "입력(Input)——당신이 보내는 토큰: 프롬프트, 파일, 대화 기록. 모델의 기본 입력 단가로 과금.",
        "출력(Output)——Claude가 생성해 돌려주는 토큰. 가장 비싼 종류로, 보통 입력의 약 5배.",
        "캐시 쓰기(Cache write)——큰 컨텍스트(시스템 프롬프트, 큰 파일)를 재사용하려고 처음 저장할 때. 입력보다 약간 비쌈: 단기 캐시 약 1.25배, 장기 약 2배.",
        "캐시 읽기(Cache read)——이후 요청에서 이미 캐시된 컨텍스트를 재사용할 때. 압도적으로 가장 싼 종류로 약 0.1배——입력의 10분의 1."
      ]
    },
    {
      "p": "Claude Code 같은 코딩 agent는 캐시에 크게 의존합니다: 같은 프로젝트 파일과 지시가 턴마다 다시 전송되므로, 원시 토큰 수의 큰 몫이 캐시 읽기입니다. 그래서 대표 숫자가 어마어마해 보입니다. 하지만 캐시 읽기는 입력의 약 10분의 1이라, 돈으로 환산하면 숫자가 암시하는 것보다 훨씬 적습니다."
    },
    {
      "callout": "직관에 어긋나는 지점: Token Forest 자체의 6주 샘플에서 캐시 읽기가 실제 비용의 약 57%를 차지했고, 입력과 출력을 합쳐도 약 24%에 그쳤습니다——나머지는 캐시 쓰기입니다. 캐시 읽기는 단가는 싸지만 양이 너무 많아 결국 쌓입니다. 원시 토큰 총량은 비용을 부풀려 보이게 합니다. 중요한 건 금액으로 가중한 구성입니다."
    },
    {
      "h2": "모델 선택이 비용을 좌우하는 방식"
    },
    {
      "p": "토큰 구성 다음으로 큰 지렛대는 어떤 모델을 돌리느냐입니다. Claude 등급은 성능과 가격을 맞바꿉니다: Opus는 가장 강력하고 가장 비싸며, Sonnet은 중간, Haiku는 가장 싸고 빠릅니다. 모든 모델에서 출력 토큰은 입력의 약 5배이고, 캐시 읽기는 항상 입력의 약 10분의 1입니다. 아래 단가는 100만 토큰(MTok)당이며 2026-07-11에 Anthropic 요금 페이지에서 확인한 것입니다——가격은 바뀌므로 특정 시점의 스냅샷으로 보고 최신 숫자는 출처에서 확인하세요."
    },
    {
      "table": {
        "head": [
          "모델(등급)",
          "입력 /MTok",
          "출력 /MTok",
          "캐시 읽기 /MTok"
        ],
        "rows": [
          [
            "Claude Opus 4.8(최고 성능)",
            "$5",
            "$25",
            "$0.50"
          ],
          [
            "Claude Sonnet(중간)",
            "$3",
            "$15",
            "$0.30"
          ],
          [
            "Claude Sonnet 5(도입가, 2026-08-31까지)",
            "$2",
            "$10",
            "$0.20"
          ],
          [
            "Claude Haiku 4.5(가장 빠르고 저렴)",
            "$1",
            "$5",
            "$0.10"
          ]
        ]
      }
    },
    {
      "p": "실전 결론: 뭐든 Opus로 돌리면 토큰당 비용이 Haiku의 약 5배입니다. 많은 워크플로가 일상적인 편집엔 더 싼 모델을 쓰고, 어려운 추론에만 최상위 등급을 남겨 둡니다. 그게 값어치가 있는지는 전적으로 당신의 작업에 달렸고——이 또한 결국 당신 자신의 숫자로만 판단할 수 있습니다."
    },
    {
      "h2": "그래서, Claude Code는 비쌀까?"
    },
    {
      "p": "솔직히: 상황에 따라 다르며, 원시 토큰 카운터는 최악의 판단 근거입니다. Pro나 Max 구독이라면 Claude Code 비용은 토큰이 아무리 흘러가도 그 정액 월 요금 그대로입니다. API 과금이라면 비용은 실제 토큰 구성을 따라가며——캐시 읽기가 10분의 1 가격으로 대부분을 차지하기 때문에, 대다수 사람의 실제 지출은 그 무시무시한 원시 총량이 암시하는 것보다 훨씬 낮습니다. 유일하게 정직한 답은 당신 자신의 로그에서 나온 당신의 답입니다."
    },
    {
      "h2": "실제 비용을 보는 법——로컬, 오프라인"
    },
    {
      "p": "Token Forest는 Claude Code(및 OpenAI Codex)가 이미 당신 컴퓨터에 기록해 둔 사용 로그를 읽어, 쉬운 말의 비용 추정치로 바꿉니다. 토큰 수, 모델 이름, 타임스탬프만 사용하며——소스 코드, 프롬프트, 대화 내용은 절대 읽지 않습니다——네트워크를 완전히 꺼도 작동합니다. 아무것도 업로드되지 않습니다."
    },
    {
      "steps": [
        "Windows 또는 macOS용 Token Forest(무료 퍼블릭 베타)를 설치하고 로컬 Claude Code와 Codex 로그를 읽게 하세요.",
        "'사용량(Usage)' 뷰를 열어 일·주·월 차트, 모델별 분해, 번 레이트 수치, 프로젝트별 분해를 확인하세요.",
        "'대화(Chats)' 뷰를 열면 대화 하나당 한 줄——그 네 가지 토큰과 추정 비용——이 나와, 어떤 세션이 실제로 돈을 썼는지 짚어낼 수 있습니다.",
        "'성장(Growth)' 뷰에서는 지출을 자라나는 픽셀 나무로 지켜보며, 단계마다 '이 나무 ≈ $X' 표시가 붙습니다."
      ]
    },
    {
      "callout": "대시보드의 비용 수치는 내장 가격표에 기반한 추정치입니다——로컬에서 계산되며 Anthropic이나 OpenAI의 실제 청구서와 다를 수 있습니다. '내 토큰이 어디로 가는가'를 빠르고 사적으로 파악하는 수단으로 쓰고, 정확한 금액은 공식 청구서와 대조하세요."
    },
    {
      "p": "터미널파인가요? ccusage는 ryoppippi가 만든 독립 오픈소스 CLI로, 같은 Claude Code 로그를 읽어 비용 리포트를 텍스트로 출력합니다. Token Forest는 그 프런트엔드가 아니라 시각적 대안입니다——같은 발상, 다른 표현. 당신 워크플로에 맞는 쪽을 쓰세요."
    }
  ],
  "faq": [
    {
      "q": "Claude Code는 얼마나 드나요?",
      "a": "과금 경로에 따라 다릅니다. Claude Pro나 Max 구독이면 월 정액(2026-07-11 기준 Pro 약 20달러, Max 두 등급 약 100달러와 200달러)이며 토큰당 청구가 아니라 사용 한도로 관리됩니다. API 종량제면 각 모델 단가로 토큰마다 과금되어 총액이 실제 사용량을 따라갑니다. 당신의 숫자는 Token Forest 대시보드에서 확인하세요."
    },
    {
      "q": "왜 제 Claude Code 토큰 수가 이렇게 많죠?",
      "a": "코딩 세션이 방대한 캐시 컨텍스트를 재사용하기 때문입니다——같은 파일과 지시가 매 턴 캐시 읽기로 다시 전송됩니다. 캐시 읽기는 원시 토큰 수의 큰 부분을 차지할 수 있지만 입력 단가의 약 10분의 1로 과금되어, 숫자가 암시하는 것보다 훨씬 적게 듭니다. 원시 총량은 실제 지출을 부풀립니다."
    },
    {
      "q": "Claude Code의 토큰당 비용은 얼마인가요?",
      "a": "단일 숫자는 없습니다——모델과 토큰 종류에 따라 다릅니다. 2026-07-11 스냅샷 기준: 출력이 가장 비싸고(Opus 약 25달러/MTok, Haiku 약 5달러), 입력은 출력의 약 5분의 1, 캐시 읽기가 가장 싸서 입력의 약 10분의 1입니다. Sonnet은 Opus와 Haiku 사이입니다. 최신 단가는 Anthropic 요금 페이지에서 확인하세요."
    },
    {
      "q": "Claude Code는 비싼가요?",
      "a": "사용이 꾸준한 대다수에겐 비싸지 않습니다——특히 구독에서는 비용이 정액 월 요금입니다. API 과금에서는 Opus를 무겁게 쓰면 쌓일 수 있지만, 캐시 읽기 덕분에 실제 비용은 원시 토큰 수가 암시하는 것보다 훨씬 낮게 유지됩니다. 확실히 알려면 당신 자신의 사용량을 봐야 하고, Token Forest가 로컬에서 추정해 줍니다."
    },
    {
      "q": "Token Forest가 제 Anthropic 실제 청구서를 볼 수 있나요?",
      "a": "아니요. Token Forest는 당신의 Anthropic이나 OpenAI 계정에 전혀 연결하지 않습니다. 당신 로그의 토큰 수에서 내장 가격표로 로컬 추정만 하므로, 그 숫자는 공식 청구서와 다를 수 있습니다. '내 토큰이 어디로 가는가'를 사적으로, 오프라인으로 파악하는 수단입니다——정확한 금액은 실제 청구서와 대조하세요."
    }
  ],
  "faqHeading": "자주 묻는 질문",
  "cta": {
    "heading": "내 토큰이 실제로 얼마인지 확인하세요",
    "body": "Token Forest는 로컬 Claude Code와 Codex 로그를 사적이고 오프라인인 비용 추정치로 바꿉니다——계정 불필요, 업로드 없음, 네트워크는 선택. 사용량이 픽셀 나무로 자라는 걸 지켜보는 동안 계산은 대시보드가 맡습니다.",
    "primaryLabel": "Token Forest 다운로드",
    "primaryHref": "/download",
    "secondaryLabel": "대시보드 살펴보기",
    "secondaryHref": "/dashboard"
  }
};

const BREADCRUMB: Record<Locale, string> = {
  "en": "Claude Code Cost",
  "zh": "Claude Code 费用",
  "ja": "Claude Code の料金",
  "ko": "Claude Code 비용"
};

const DOCS: Record<Locale, ArticleDoc> = { en: EN, zh: ZH, ja: JA, ko: KO };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localizedMetadata(PATH, locale as Locale);
}

export default async function ClaudeCodeCostPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tnav = await getTranslations("TopBar");

  const doc = DOCS[locale as Locale] ?? EN;
  const breadcrumbLabel = BREADCRUMB[locale as Locale] ?? BREADCRUMB.en;

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale as Locale}
        items={[
          { name: tnav("home"), path: "/" },
          { name: breadcrumbLabel, path: PATH },
        ]}
      />
      <ArticleJsonLd
        locale={locale as Locale}
        headline={doc.title}
        description={doc.intro}
        path={PATH}
        datePublished="2026-07-11"
        dateModified="2026-07-11"
      />
      <FaqJsonLd items={(doc.faq ?? []).map((f) => ({ question: f.q, answer: f.a }))} />
      <ArticleDocView doc={doc} />
    </>
  );
}
