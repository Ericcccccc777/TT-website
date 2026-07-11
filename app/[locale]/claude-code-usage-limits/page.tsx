import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata } from "@/lib/seo";
import { ArticleDocView, type ArticleDoc } from "@/components/article-doc";
import { ArticleJsonLd, BreadcrumbJsonLd, FaqJsonLd } from "@/components/json-ld";

const PATH = "/claude-code-usage-limits";

// Self-contained guide page: four co-located ArticleDoc objects (EN/ZH/JA/KO),
// resolved by locale with an English fallback. Volatile figures (plan prices,
// usage multipliers, limit windows) are dated to mid-2026 and framed
// qualitatively — Anthropic tunes these often — with Settings > Usage flagged
// as the only authoritative quota meter.

const EN: ArticleDoc = {
  eyebrow: "GUIDE",
  title: "Claude Code Usage Limits: Pro vs Max, and How to Stay Ahead of Them",
  intro:
    "Claude Code doesn't charge you per prompt — it meters you. Your plan (Pro, Max 5x, or Max 20x) sets how much coding you can do inside two overlapping windows: a rolling 5-hour session and a longer weekly cap. Anthropic tunes these limits often, so the durable skill isn't memorising a number — it's understanding how the windows work and watching your own burn rate so a 'you've hit your limit' message never catches you mid-task.",
  updated:
    "Last updated July 11, 2026 · Limits change often — always check Anthropic's current numbers.",
  sections: [
    { h2: "How Claude Code limits actually work" },
    {
      p: "Claude Code doesn't bill per prompt — it meters your usage. Two independent counters run at the same time, and you're throttled the moment you hit either one: a rolling 5-hour session window and a set of weekly limits. Understanding both is the whole game.",
    },
    { h2: "The 5-hour session window" },
    {
      p: "This is the short window. It's a rolling 5 hours that starts with your first prompt, not a fixed clock. Send your first message at 10am and that window resets at 3pm — however many messages you sent in between. It's the limit most people bump into during an intense afternoon of coding.",
    },
    { h2: "The weekly windows" },
    {
      p: "Anthropic added weekly limits in 2025 (announced in late July, effective the end of August) to sit on top of the 5-hour window. There are actually two of them: one overall weekly cap that counts usage across all models, plus a tighter weekly cap for the most capable Opus-class models, which primarily affects the Max plans (they carry the most Opus access). The two can reset on different schedules.",
    },
    { h2: "Pro vs Max 5x vs Max 20x" },
    {
      p: "Your plan is really a capacity multiplier. The paid tiers scale the same two windows up — Max plans simply give you a lot more room in each, plus the separate Opus-class weekly cap. The figures below reflect Anthropic's plans as of mid-2026 and change often, so treat them as the shape, not the letter of the law — check Anthropic's official pricing page for the current numbers.",
    },
    {
      table: {
        head: ["Plan (mid-2026)", "Relative throughput", "Weekly caps", "Best for"],
        rows: [
          [
            "Pro (~$20/mo)",
            "Baseline Claude Code access",
            "One overall weekly cap",
            "Individual devs, lighter daily use",
          ],
          [
            "Max 5x (~$100/mo)",
            "Roughly 5x Pro's usage",
            "Overall + Opus-class weekly cap",
            "Heavy solo developers",
          ],
          [
            "Max 20x (~$200/mo)",
            "Roughly 20x Pro's usage",
            "Larger overall + Opus-class weekly cap",
            "All-day, multi-agent workflows",
          ],
        ],
      },
    },
    { h2: "What actually counts against your limit" },
    {
      p: "It's not a simple prompt count. Two people who send the same number of messages can burn wildly different amounts, because usage depends on:",
    },
    {
      list: [
        "Which model you run — Opus-class models consume far faster than Sonnet",
        "How long your conversation and context have grown",
        "The thinking / effort level you've selected",
        "Tool calls, file reads, and how much the agent explores",
        "Large pasted files or whole codebases",
        "How many agents you run in parallel",
      ],
    },
    { h2: "What happens when you hit a limit" },
    {
      steps: [
        "Claude Code stops and tells you which limit you've reached and when it resets.",
        "The session limit clears 5 hours after that window's first prompt — often a short wait.",
        "A weekly limit clears on its 7-day cycle; the overall and Opus-class caps can reset separately.",
        "Open Settings > Usage in Claude for the authoritative countdown — that's the only meter tied to your real quota.",
        "While you wait, you can switch to a lighter model (if only the Opus-class weekly cap is exhausted), upgrade your plan, or move to pay-as-you-go API / Console billing, which is separate from subscription limits.",
      ],
    },
    {
      callout:
        "Key takeaway: Anthropic's limits move — they added weekly caps in 2025 and permanently doubled the 5-hour window in May 2026. Don't memorise a number. Learn the two-window model, check Settings > Usage for the official meter, and watch your own burn rate so a limit never surprises you mid-task.",
    },
    { h2: "Stay ahead of the limit: watch your burn rate" },
    {
      p: "The habit that keeps limits from ever being a surprise is simple: know your own burn rate. If you can see a heavy week building — or notice which model is eating your quota — you can pace the work instead of slamming into a wall at 4pm on a Thursday.",
    },
    {
      list: [
        "Know your heaviest hours and days so you don't schedule a big run right before a reset",
        "Spot a ramp-up early, while there's still time to slow down or switch models",
        "Split Opus-class vs Sonnet usage so you know which weekly cap you're pushing",
        "Spread heavy agent runs across the week instead of one marathon session",
      ],
    },
    { h2: "How Token Forest shows your usage" },
    {
      p: "Token Forest is a free desktop pet with an offline dashboard. It reads only your local Claude Code and Codex logs — token counts, model names and timestamps, never your source code or prompts — and works fully offline with no account. It won't replace Anthropic's official meter, but it gives you the part Anthropic doesn't: the trend and the pattern.",
    },
    {
      list: [
        "Burn rate — how fast you're spending across the day and week",
        "Per-model breakdown — Opus vs Sonnet vs Codex, so you can see which cap you're pushing",
        "A 26-week heatmap — your heavy days at a glance, so you can pace the week",
        "Per-project and daily / weekly / monthly charts — where the usage is actually going",
      ],
    },
    {
      p: "One honest caveat: for the exact 'how close am I right now,' Anthropic's Settings > Usage is authoritative — it's the only place tied to your real quota. Token Forest complements it with a private, local view of your trend so you can plan ahead. Its dollar figures are an offline estimate from a bundled price table, so they may differ from your real Anthropic or OpenAI bill.",
    },
  ],
  faqHeading: "Common questions",
  faq: [
    {
      q: "How do I know if I'm hitting my Claude Code limit?",
      a: "Claude Code shows a message telling you which limit you reached and when it resets, and Settings > Usage in Claude gives the authoritative countdown. To see it coming, watch your burn rate — Token Forest's dashboard reads your local logs and shows a heavy week building before you actually hit the wall.",
    },
    {
      q: "When does my Claude Code limit reset?",
      a: "The 5-hour session window resets 5 hours after that window's first prompt — it's rolling, not a fixed clock. Weekly limits reset on a 7-day cycle, and the overall and Opus-class caps can reset on different schedules. The exact times are shown in Settings > Usage.",
    },
    {
      q: "What's the difference between Pro and Max usage limits?",
      a: "Max 5x gives roughly 5x and Max 20x roughly 20x more usage than Pro, and there's a separate, tighter weekly cap for the most capable Opus-class models — most relevant to Max subscribers, who have the most Opus access. Anthropic adjusts these numbers periodically, so check the current limits on your account.",
    },
    {
      q: "Does hitting my weekly limit stop me completely?",
      a: "It stops the usage that's capped. If only the Opus-class weekly cap is exhausted you can often keep working on a lighter model like Sonnet. If the overall weekly cap is hit, you wait for the reset, upgrade your plan, or switch to pay-as-you-go API / Console billing, which is metered separately from your subscription.",
    },
    {
      q: "Can Token Forest tell me exactly how much of my limit is left?",
      a: "No — Anthropic's Settings > Usage is the only authoritative meter for your remaining quota. Token Forest reads your local token logs to show burn rate, a per-model split, and a heatmap: the trend picture that helps you plan and pace, alongside Anthropic's official number.",
    },
  ],
  cta: {
    heading: "See your own burn rate",
    body: "Token Forest turns your local Claude Code and Codex logs into a private usage dashboard — burn rate, per-model split, and a 26-week heatmap — so a limit never catches you mid-task. Free, offline, no account.",
    primaryLabel: "Explore the dashboard",
    primaryHref: "/dashboard",
    secondaryLabel: "Download Token Forest",
    secondaryHref: "/download",
  },
};

const ZH: ArticleDoc = {
  eyebrow: "指南",
  title: "Claude Code 使用上限：Pro 与 Max 的区别，以及如何抢在限额前面",
  intro:
    "Claude Code 不是按条数收费，而是按用量计额。你的订阅套餐（Pro、Max 5x 或 Max 20x）决定了你能在两个重叠的时间窗里写多少代码：一个是滚动的 5 小时会话窗口，一个是更长的每周上限。Anthropic 会经常调整这些额度，所以真正有用的不是背下某个数字，而是弄懂这两个窗口怎么运作，并盯住自己的消耗速度——这样「你已达到使用上限」的提示就不会在你写到一半时突然冒出来。",
  updated: "最后更新于 2026 年 7 月 11 日 · 额度经常变动，请以 Anthropic 当前的官方数字为准。",
  sections: [
    { h2: "Claude Code 的额度到底怎么算" },
    {
      p: "Claude Code 不是按条数收费，而是按用量计额。两个独立的计量器同时在跑，任意一个用满你就会被限流：一个是滚动的 5 小时会话窗口，一个是每周上限。把这两个窗口弄明白，基本就通关了。",
    },
    { h2: "5 小时会话窗口" },
    {
      p: "这是那个「短」窗口。它是从你发出第一条消息开始的滚动 5 小时，而不是按固定钟点。上午 10 点发第一条，窗口就在下午 3 点重置——中间发了多少条都一样。大多数人在一个高强度的下午撞到的，就是这个上限。",
    },
    { h2: "每周窗口" },
    {
      p: "Anthropic 在 2025 年新增了每周上限（7 月底宣布，8 月底生效），叠加在 5 小时窗口之上。其实有两个：一个是覆盖所有模型用量的总周额度，外加一个针对最强 Opus 类模型的更紧的周额度——它主要影响 Max 套餐（Max 拥有最多的 Opus 访问权限）。两者可能按不同的时间分别重置。",
    },
    { h2: "Pro、Max 5x、Max 20x 有什么区别" },
    {
      p: "套餐本质上就是容量倍率。付费档把同样这两个窗口整体放大——Max 套餐在每个窗口里给你多得多的余量，再加上单独的 Opus 类周额度。下面的价格和倍数反映的是 2026 年年中前后 Anthropic 的套餐、而且经常变动，请把它当作「形状」而不是死规矩，并以 Anthropic 官方定价页面上的当前数字为准。",
    },
    {
      table: {
        head: ["套餐（2026 年中）", "相对吞吐", "每周额度", "适合谁"],
        rows: [
          [
            "Pro（约 $20/月）",
            "Claude Code 基础额度",
            "一个总的周额度",
            "个人开发者、日常轻度使用",
          ],
          [
            "Max 5x（约 $100/月）",
            "大约为 Pro 用量的 5 倍",
            "总额度 + Opus 类周额度",
            "重度个人开发者",
          ],
          [
            "Max 20x（约 $200/月）",
            "大约为 Pro 用量的 20 倍",
            "更大的总额度 + Opus 类周额度",
            "全天候、多智能体工作流",
          ],
        ],
      },
    },
    { h2: "哪些东西在消耗你的额度" },
    {
      p: "它不是简单的「条数」。两个人发同样数量的消息，消耗可能天差地别，因为用量取决于：",
    },
    {
      list: [
        "用哪个模型——Opus 类比 Sonnet 烧得快得多",
        "对话和上下文长到什么程度",
        "你选的思考/努力级别",
        "工具调用、读文件，以及智能体探索的程度",
        "粘贴的大文件或整个代码库",
        "你并行跑了多少个智能体",
      ],
    },
    { h2: "达到上限时会发生什么" },
    {
      steps: [
        "Claude Code 停止响应，并告诉你撞到的是哪个上限、何时重置。",
        "会话上限在该窗口第一条消息之后 5 小时清零——通常等一会儿就好。",
        "每周上限按 7 天周期清零；总额度和 Opus 类额度可能分别重置。",
        "在 Claude 里打开 设置 > 用量 查看权威倒计时——那是唯一跟你真实额度挂钩的计量器。",
        "等待期间，你可以切到更轻的模型（如果只是 Opus 类周额度用满）、升级套餐，或改用按量计费的 API / Console（与订阅额度分开计）。",
      ],
    },
    {
      callout:
        "关键要点：Anthropic 的额度一直在变——2025 年加了周上限，2026 年 5 月又把 5 小时窗口永久翻倍。别去背数字。搞懂「两个窗口」模型，用 设置 > 用量 看官方计量，再盯住自己的消耗速度，上限就不会在你写到一半时突袭你。",
    },
    { h2: "抢在上限前面：盯住你的消耗速度" },
    {
      p: "让上限永远不再是「惊吓」的习惯很简单：了解你自己的消耗速度。如果你能看到一周的用量正在堆高——或者发现是哪个模型在吃你的额度——你就能提前调整节奏，而不是在周四下午 4 点一头撞墙。",
    },
    {
      list: [
        "知道自己用量最重的时段和日子，别把大任务安排在临近重置的时候",
        "及早发现用量在爬升，趁还有时间放慢或换模型",
        "把 Opus 类和 Sonnet 的用量分开看，清楚自己在逼近哪个周额度",
        "把重活分散到一周里，而不是一次马拉松式跑满",
      ],
    },
    { h2: "Token Forest 如何呈现你的用量" },
    {
      p: "Token Forest 是一只免费的桌面宠物，带一个离线仪表盘。它只读取你本地的 Claude Code 和 Codex 日志——token 数量、模型名称、时间戳，绝不读你的源代码或提示词——完全离线、无需账号。它不会取代 Anthropic 的官方计量，但能给你 Anthropic 不提供的那部分：趋势和规律。",
    },
    {
      list: [
        "消耗速度——你在一天、一周里花得有多快",
        "按模型拆分——Opus、Sonnet、Codex 一目了然，知道自己在逼近哪个额度",
        "26 周热力图——一眼看清用量重的日子，好安排一周节奏",
        "按项目，以及按天/周/月的图表——看清用量究竟花在哪",
      ],
    },
    {
      p: "一个诚实的提醒：要精确知道「我现在还剩多少」，Anthropic 的 设置 > 用量 才是权威——那是唯一跟你真实额度挂钩的地方。Token Forest 用一个私密、本地的趋势视图作为补充，帮你提前规划；它给出的金额是基于内置价目表的离线估算，可能和你在 Anthropic 或 OpenAI 的真实账单有出入。",
    },
  ],
  faqHeading: "常见问题",
  faq: [
    {
      q: "我怎么知道自己是不是快到 Claude Code 上限了？",
      a: "Claude Code 会弹出提示，告诉你撞到的是哪个上限、何时重置；Claude 里的 设置 > 用量 会给出权威倒计时。想提前预判，就盯住消耗速度——Token Forest 的仪表盘读取你本地的日志，能在你真正撞墙之前就显示出一周用量正在堆高。",
    },
    {
      q: "我的 Claude Code 上限什么时候重置？",
      a: "5 小时会话窗口在该窗口第一条消息之后 5 小时重置——是滚动的，不是固定钟点。每周上限按 7 天周期重置，而且总额度和 Opus 类额度可能按不同时间分别重置。具体时间见 设置 > 用量。",
    },
    {
      q: "Pro 和 Max 的使用上限有什么区别？",
      a: "Max 5x 的用量大约是 Pro 的 5 倍，Max 20x 约为 20 倍；此外还有一个针对最强 Opus 类模型、单独且更紧的周额度——它对 Max 订阅者最为相关，因为他们拥有最多的 Opus 使用额度。Anthropic 会不定期调整这些数字，请以你账号上的当前额度为准。",
    },
    {
      q: "撞到每周上限会不会把我完全卡死？",
      a: "它只卡住用满的那部分。如果只是 Opus 类周额度用完，你通常还能用 Sonnet 这类更轻的模型继续。如果是总的周额度用满，就得等重置、升级套餐，或改用按量计费的 API / Console——那是与订阅分开计量的。",
    },
    {
      q: "Token Forest 能精确告诉我额度还剩多少吗？",
      a: "不能——只有 Anthropic 的 设置 > 用量 才是你剩余额度的权威计量。Token Forest 读取你本地的 token 日志，呈现消耗速度、按模型拆分和热力图：这是帮你规划和把控节奏的趋势画面，和 Anthropic 的官方数字互为补充。",
    },
  ],
  cta: {
    heading: "看清你自己的消耗速度",
    body: "Token Forest 把你本地的 Claude Code 与 Codex 日志变成一个私密的用量仪表盘——消耗速度、按模型拆分、26 周热力图——让上限不再在你写到一半时突袭。免费、离线、无需账号。",
    primaryLabel: "看看仪表盘",
    primaryHref: "/dashboard",
    secondaryLabel: "下载 Token Forest",
    secondaryHref: "/download",
  },
};

const JA: ArticleDoc = {
  eyebrow: "ガイド",
  title: "Claude Code の使用上限：Pro と Max の違いと、上限に先手を打つ方法",
  intro:
    "Claude Code はプロンプト単位の課金ではなく、使用量で計測されます。あなたのプラン（Pro / Max 5x / Max 20x）が、2 つの重なり合うウィンドウ——ローリング式の 5 時間セッションと、より長い週次上限——の中でどれだけコーディングできるかを決めます。Anthropic はこの上限を頻繁に調整するため、大切なのは数字を暗記することではなく、2 つのウィンドウの仕組みを理解し、自分の消費ペースを見張ること。そうすれば「上限に達しました」の表示が作業の途中で突然現れることはなくなります。",
  updated:
    "最終更新: 2026年7月11日 · 上限は頻繁に変わります。必ず Anthropic の最新の数値を確認してください。",
  sections: [
    { h2: "Claude Code の上限の仕組み" },
    {
      p: "Claude Code はプロンプト単位の課金ではなく、使用量で計測します。2 つの独立したカウンターが同時に動き、どちらか一方に達した瞬間に制限がかかります——ローリング式の 5 時間セッションウィンドウと、複数の週次上限です。この両方を理解すれば、ほぼ攻略完了です。",
    },
    { h2: "5 時間セッションウィンドウ" },
    {
      p: "こちらは「短い」ウィンドウ。固定の時計ではなく、最初のプロンプトから始まるローリングの 5 時間です。午前 10 時に最初のメッセージを送れば、そのウィンドウは午後 3 時にリセット——間に何通送っても同じ。集中してコーディングした午後に多くの人がぶつかるのが、この上限です。",
    },
    { h2: "週次ウィンドウ" },
    {
      p: "Anthropic は 2025 年（7 月下旬に発表、8 月下旬に発効）に、5 時間ウィンドウの上に重なる週次上限を追加しました。実は 2 種類あります——全モデルの使用量を合算する総枠の週次上限と、最も高性能な Opus クラスのモデル向けの、より厳しい週次枠です。後者は主に Max プランに影響します（Max は最も多く Opus を使えるため）。両者は別々のスケジュールでリセットされることがあります。",
    },
    { h2: "Pro・Max 5x・Max 20x の違い" },
    {
      p: "プランは実質的に容量の倍率です。有料ティアは同じ 2 つのウィンドウをまるごと拡大します——Max プランは各ウィンドウに大きな余裕を与え、さらに Opus クラス専用の週次枠が付きます。以下の価格と倍率は 2026 年半ば時点の Anthropic のプランを反映しており、頻繁に変わるため、「形」として捉え、最新の数値は Anthropic の公式料金ページで確認してください。",
    },
    {
      table: {
        head: ["プラン（2026 年半ば）", "相対スループット", "週次上限", "向いている人"],
        rows: [
          [
            "Pro（月 約$20）",
            "Claude Code の基本枠",
            "総枠の週次上限 1 つ",
            "個人開発者・軽めの日常利用",
          ],
          [
            "Max 5x（月 約$100）",
            "Pro の約 5 倍の使用量",
            "総枠 + Opus クラス週次枠",
            "ヘビーな個人開発者",
          ],
          [
            "Max 20x（月 約$200）",
            "Pro の約 20 倍の使用量",
            "より大きな総枠 + Opus クラス週次枠",
            "終日・マルチエージェント運用",
          ],
        ],
      },
    },
    { h2: "何が上限を消費するのか" },
    {
      p: "単純なプロンプト数ではありません。同じ通数を送った 2 人でも消費量は大きく異なります。使用量は次の要素で決まるからです：",
    },
    {
      list: [
        "どのモデルを使うか——Opus クラスは Sonnet よりはるかに速く消費",
        "会話とコンテキストがどれだけ長くなっているか",
        "選んだ思考／努力レベル",
        "ツール呼び出し、ファイル読み込み、エージェントの探索量",
        "貼り付けた大きなファイルやコードベース",
        "並列で動かすエージェントの数",
      ],
    },
    { h2: "上限に達したら何が起きる" },
    {
      steps: [
        "Claude Code が停止し、どの上限に達したか・いつリセットされるかを表示します。",
        "セッション上限は、そのウィンドウの最初のプロンプトから 5 時間後に解除されます——たいてい短い待ち時間です。",
        "週次上限は 7 日周期で解除され、総枠と Opus クラス枠は別々にリセットされることがあります。",
        "Claude の 設定 > 使用状況 で正式なカウントダウンを確認してください——実際の残量に連動する唯一のメーターです。",
        "待つ間は、（Opus クラス週次枠だけが尽きた場合は）軽いモデルに切り替える、プランをアップグレードする、あるいはサブスクとは別計算の従量課金 API／Console に移る、という選択肢があります。",
      ],
    },
    {
      callout:
        "要点：Anthropic の上限は動き続けています——2025 年に週次上限を追加し、2026 年 5 月には 5 時間ウィンドウを恒久的に倍増。数字を暗記しないこと。「2 つのウィンドウ」モデルを理解し、設定 > 使用状況 で公式メーターを見て、自分の消費ペースを見張れば、作業の途中で上限に不意打ちされません。",
    },
    { h2: "上限の先手を打つ：消費ペースを見張る" },
    {
      p: "上限を「不意打ち」にしない習慣はシンプルです——自分の消費ペースを知ること。重い一週間が積み上がっているのが見えたり、どのモデルが枠を食っているか分かれば、木曜の午後 4 時に壁に激突する代わりに、ペース配分できます。",
    },
    {
      list: [
        "消費が重い時間帯と曜日を把握し、リセット直前に大きな実行を入れない",
        "増加を早めに察知し、まだ余裕があるうちに減速・モデル変更する",
        "Opus クラスと Sonnet の使用を分けて見て、どの週次枠に迫っているか把握する",
        "重いエージェント実行を一週間に分散させ、一度のマラソンにしない",
      ],
    },
    { h2: "Token Forest で使用量を見える化する" },
    {
      p: "Token Forest はオフラインのダッシュボードを備えた無料のデスクトップペットです。読み取るのはローカルの Claude Code と Codex のログだけ——トークン数、モデル名、タイムスタンプで、ソースコードやプロンプトは決して読みません——完全にオフラインで、アカウント不要です。Anthropic の公式メーターを置き換えるものではありませんが、Anthropic が提供しない部分——傾向とパターン——を見せてくれます。",
    },
    {
      list: [
        "消費ペース——一日、一週間でどれだけ速く使っているか",
        "モデル別内訳——Opus・Sonnet・Codex を並べて、どの枠に迫っているか分かる",
        "26 週間のヒートマップ——重い日を一目で把握し、一週間のペースを配分",
        "プロジェクト別、および日／週／月のグラフ——使用量が実際どこに向かっているか",
      ],
    },
    {
      p: "正直な注意点：「今どれだけ残っているか」を正確に知るには、Anthropic の 設定 > 使用状況 が権威です——実際の残量に連動する唯一の場所です。Token Forest は、プライベートでローカルな傾向ビューでそれを補い、先読みを助けます。表示される金額は内蔵の価格表に基づくオフラインの推定値で、Anthropic や OpenAI の実際の請求額とは異なる場合があります。",
    },
  ],
  faqHeading: "よくある質問",
  faq: [
    {
      q: "自分が Claude Code の上限に近づいているか、どう分かりますか？",
      a: "Claude Code が、達した上限とリセット時刻を表示します。Claude の 設定 > 使用状況 が正式なカウントダウンを示します。前もって察知したいなら消費ペースを見張りましょう——Token Forest のダッシュボードはローカルのログを読み、実際に壁にぶつかる前に重い一週間の積み上がりを見せてくれます。",
    },
    {
      q: "Claude Code の上限はいつリセットされますか？",
      a: "5 時間セッションウィンドウは、そのウィンドウの最初のプロンプトから 5 時間後にリセットされます——固定の時計ではなくローリングです。週次上限は 7 日周期でリセットされ、総枠と Opus クラス枠は別々のスケジュールになることがあります。正確な時刻は 設定 > 使用状況 で確認できます。",
    },
    {
      q: "Pro と Max の使用上限はどう違いますか？",
      a: "Max 5x は Pro の約 5 倍、Max 20x は約 20 倍の使用量で、さらに最も高性能な Opus クラス向けに別枠のより厳しい週次上限があります——これは最も Opus を多く使える Max 契約者に最も関係します。Anthropic はこれらの数値を随時調整するため、アカウント上の現在の上限を確認してください。",
    },
    {
      q: "週次上限に達したら完全に止まりますか？",
      a: "止まるのは上限に達した分だけです。Opus クラスの週次枠だけが尽きた場合は、Sonnet のような軽いモデルで作業を続けられることが多いです。総枠の週次上限に達した場合は、リセットを待つ、プランをアップグレードする、またはサブスクとは別計算の従量課金 API／Console に切り替えます。",
    },
    {
      q: "Token Forest は残りの上限を正確に教えてくれますか？",
      a: "いいえ——残量の権威あるメーターは Anthropic の 設定 > 使用状況 だけです。Token Forest はローカルのトークンログを読み、消費ペース、モデル別内訳、ヒートマップを表示します。これは Anthropic の公式な数値と並べて、計画とペース配分に役立つ傾向の全体像です。",
    },
  ],
  cta: {
    heading: "自分の消費ペースを見える化",
    body: "Token Forest はローカルの Claude Code と Codex のログを、プライベートな使用量ダッシュボードに変えます——消費ペース、モデル別内訳、26 週間のヒートマップ。上限に不意打ちされません。無料・オフライン・アカウント不要。",
    primaryLabel: "ダッシュボードを見る",
    primaryHref: "/dashboard",
    secondaryLabel: "Token Forest をダウンロード",
    secondaryHref: "/download",
  },
};

const KO: ArticleDoc = {
  eyebrow: "가이드",
  title: "Claude Code 사용 한도: Pro와 Max의 차이, 그리고 한도보다 앞서가는 법",
  intro:
    "Claude Code는 프롬프트 개수로 과금하지 않고 사용량으로 측정합니다. 요금제(Pro, Max 5x, Max 20x)에 따라 두 개의 겹치는 창—롤링 방식의 5시간 세션과 더 긴 주간 한도—안에서 얼마나 코딩할 수 있는지가 정해집니다. Anthropic은 이 한도를 자주 조정하므로, 중요한 것은 숫자를 외우는 게 아니라 두 창이 어떻게 작동하는지 이해하고 자신의 소모 속도를 지켜보는 것입니다. 그래야 '한도에 도달했습니다' 메시지가 작업 도중에 갑자기 뜨는 일이 없습니다.",
  updated:
    "마지막 업데이트: 2026년 7월 11일 · 한도는 자주 바뀌니 항상 Anthropic의 최신 수치를 확인하세요.",
  sections: [
    { h2: "Claude Code 한도가 작동하는 방식" },
    {
      p: "Claude Code는 프롬프트마다 과금하지 않고 사용량을 측정합니다. 두 개의 독립된 카운터가 동시에 돌아가며, 둘 중 하나에 도달하는 순간 제한이 걸립니다 — 롤링 방식의 5시간 세션 창과 여러 주간 한도입니다. 이 둘을 이해하면 사실상 끝입니다.",
    },
    { h2: "5시간 세션 창" },
    {
      p: "이것이 '짧은' 창입니다. 고정된 시계가 아니라 첫 프롬프트에서 시작하는 롤링 5시간입니다. 오전 10시에 첫 메시지를 보내면 그 창은 오후 3시에 초기화됩니다 — 그 사이에 몇 개를 보냈든 상관없습니다. 집중해서 코딩한 오후에 대부분의 사람이 부딪히는 것이 이 한도입니다.",
    },
    { h2: "주간 창" },
    {
      p: "Anthropic은 2025년(7월 말 발표, 8월 말 시행)에 5시간 창 위에 겹쳐지는 주간 한도를 추가했습니다. 사실 두 가지가 있습니다 — 모든 모델의 사용량을 합산하는 전체 주간 한도와, 가장 성능이 높은 Opus 계열 모델을 대상으로 하는 더 빡빡한 주간 한도입니다. 후자는 주로 Max 요금제에 영향을 줍니다(Max가 Opus를 가장 많이 쓸 수 있기 때문). 둘은 서로 다른 일정으로 초기화될 수 있습니다.",
    },
    { h2: "Pro와 Max 5x, Max 20x의 차이" },
    {
      p: "요금제는 사실상 용량 배율입니다. 유료 등급은 같은 두 창을 통째로 키웁니다 — Max 요금제는 각 창에 훨씬 큰 여유를 주고, 여기에 별도의 Opus 계열 주간 한도가 붙습니다. 아래 가격과 배수는 2026년 중반 기준 Anthropic의 요금제를 반영하며 자주 바뀌니, '형태'로 받아들이고 현재 수치는 Anthropic 공식 요금 페이지에서 확인하세요.",
    },
    {
      table: {
        head: ["요금제(2026년 중반)", "상대 처리량", "주간 한도", "적합한 사용자"],
        rows: [
          [
            "Pro(약 $20/월)",
            "Claude Code 기본 한도",
            "전체 주간 한도 1개",
            "개인 개발자, 가벼운 일상 사용",
          ],
          [
            "Max 5x(약 $100/월)",
            "Pro의 약 5배 사용량",
            "전체 한도 + Opus 계열 주간 한도",
            "헤비 개인 개발자",
          ],
          [
            "Max 20x(약 $200/월)",
            "Pro의 약 20배 사용량",
            "더 큰 전체 한도 + Opus 계열 주간 한도",
            "종일·멀티 에이전트 워크플로",
          ],
        ],
      },
    },
    { h2: "무엇이 한도를 소모하는가" },
    {
      p: "단순한 프롬프트 개수가 아닙니다. 같은 개수의 메시지를 보낸 두 사람도 소모량이 크게 다를 수 있습니다. 사용량은 다음에 따라 정해지기 때문입니다:",
    },
    {
      list: [
        "어떤 모델을 쓰는가 — Opus 계열은 Sonnet보다 훨씬 빠르게 소모",
        "대화와 컨텍스트가 얼마나 길어졌는가",
        "선택한 사고/노력 레벨",
        "도구 호출, 파일 읽기, 에이전트의 탐색량",
        "붙여넣은 큰 파일이나 코드베이스",
        "동시에 실행하는 에이전트 수",
      ],
    },
    { h2: "한도에 도달하면 어떻게 되나" },
    {
      steps: [
        "Claude Code가 멈추고, 어떤 한도에 도달했는지와 언제 초기화되는지 알려줍니다.",
        "세션 한도는 해당 창의 첫 프롬프트로부터 5시간 뒤에 풀립니다 — 대개 짧은 대기입니다.",
        "주간 한도는 7일 주기로 풀리며, 전체 한도와 Opus 계열 한도는 따로 초기화될 수 있습니다.",
        "Claude의 설정 > 사용량에서 공식 카운트다운을 확인하세요 — 실제 잔여량에 연동된 유일한 계기입니다.",
        "기다리는 동안, (Opus 계열 주간 한도만 소진됐다면) 가벼운 모델로 전환하거나, 요금제를 업그레이드하거나, 구독과 별도로 측정되는 종량제 API / Console로 옮길 수 있습니다.",
      ],
    },
    {
      callout:
        "핵심 요점: Anthropic의 한도는 계속 바뀝니다 — 2025년에 주간 한도를 추가했고, 2026년 5월에는 5시간 창을 영구적으로 두 배로 늘렸습니다. 숫자를 외우지 마세요. '두 개의 창' 모델을 이해하고, 설정 > 사용량에서 공식 계기를 확인하며, 자신의 소모 속도를 지켜보면 작업 도중 한도에 기습당하지 않습니다.",
    },
    { h2: "한도보다 앞서가기: 소모 속도를 지켜보라" },
    {
      p: "한도가 결코 기습이 되지 않게 하는 습관은 단순합니다 — 자신의 소모 속도를 아는 것. 무거운 한 주가 쌓이는 게 보이거나, 어떤 모델이 한도를 잡아먹는지 알면, 목요일 오후 4시에 벽에 부딪히는 대신 페이스를 조절할 수 있습니다.",
    },
    {
      list: [
        "소모가 가장 많은 시간대와 요일을 파악해, 초기화 직전에 큰 작업을 넣지 않기",
        "증가를 일찍 알아채, 여유가 있을 때 속도를 줄이거나 모델을 바꾸기",
        "Opus 계열과 Sonnet 사용을 나눠 보며, 어느 주간 한도에 다가가는지 파악하기",
        "무거운 에이전트 실행을 한 주에 분산해, 한 번의 마라톤으로 몰지 않기",
      ],
    },
    { h2: "Token Forest가 사용량을 보여주는 방식" },
    {
      p: "Token Forest는 오프라인 대시보드가 딸린 무료 데스크톱 펫입니다. 읽는 것은 로컬의 Claude Code와 Codex 로그뿐 — 토큰 수, 모델 이름, 타임스탬프이며 소스 코드나 프롬프트는 절대 읽지 않습니다 — 완전히 오프라인, 계정 불필요. Anthropic의 공식 계기를 대체하지는 않지만, Anthropic이 주지 않는 부분 — 추세와 패턴 — 을 보여줍니다.",
    },
    {
      list: [
        "소모 속도 — 하루, 한 주 동안 얼마나 빠르게 쓰고 있는지",
        "모델별 분석 — Opus·Sonnet·Codex를 나란히 보고 어느 한도에 다가가는지 확인",
        "26주 히트맵 — 무거운 날을 한눈에 파악해 한 주 페이스를 조절",
        "프로젝트별, 그리고 일/주/월 차트 — 사용량이 실제로 어디로 가는지",
      ],
    },
    {
      p: "솔직한 유의점: '지금 얼마나 남았는지'를 정확히 알려면 Anthropic의 설정 > 사용량이 권위 있는 기준입니다 — 실제 잔여량에 연동된 유일한 곳입니다. Token Forest는 개인용 로컬 추세 뷰로 이를 보완해 미리 계획하도록 돕습니다. 표시되는 금액은 내장 가격표에 기반한 오프라인 추정치라, Anthropic이나 OpenAI의 실제 청구서와 다를 수 있습니다.",
    },
  ],
  faqHeading: "자주 묻는 질문",
  faq: [
    {
      q: "내가 Claude Code 한도에 다가가고 있는지 어떻게 알 수 있나요?",
      a: "Claude Code가 도달한 한도와 초기화 시각을 알려주고, Claude의 설정 > 사용량이 공식 카운트다운을 보여줍니다. 미리 감지하려면 소모 속도를 지켜보세요 — Token Forest 대시보드는 로컬 로그를 읽어, 실제로 벽에 부딪히기 전에 무거운 한 주가 쌓이는 것을 보여줍니다.",
    },
    {
      q: "Claude Code 한도는 언제 초기화되나요?",
      a: "5시간 세션 창은 해당 창의 첫 프롬프트로부터 5시간 뒤에 초기화됩니다 — 고정된 시계가 아니라 롤링입니다. 주간 한도는 7일 주기로 초기화되며, 전체 한도와 Opus 계열 한도는 서로 다른 일정일 수 있습니다. 정확한 시각은 설정 > 사용량에서 확인하세요.",
    },
    {
      q: "Pro와 Max의 사용 한도는 어떻게 다른가요?",
      a: "Max 5x는 Pro의 약 5배, Max 20x는 약 20배 사용량이며, 여기에 가장 성능이 높은 Opus 계열용 별도의 더 빡빡한 주간 한도가 있습니다 — 이는 Opus를 가장 많이 쓸 수 있는 Max 구독자에게 가장 관련이 큽니다. Anthropic이 수시로 이 수치를 조정하므로 계정의 현재 한도를 확인하세요.",
    },
    {
      q: "주간 한도에 도달하면 완전히 멈추나요?",
      a: "막히는 것은 한도에 도달한 부분뿐입니다. Opus 계열 주간 한도만 소진됐다면 대개 Sonnet 같은 가벼운 모델로 계속 작업할 수 있습니다. 전체 주간 한도에 도달했다면 초기화를 기다리거나, 요금제를 업그레이드하거나, 구독과 별도로 측정되는 종량제 API / Console로 전환합니다.",
    },
    {
      q: "Token Forest가 남은 한도를 정확히 알려줄 수 있나요?",
      a: "아니요 — 잔여 한도의 권위 있는 계기는 Anthropic의 설정 > 사용량뿐입니다. Token Forest는 로컬 토큰 로그를 읽어 소모 속도, 모델별 분석, 히트맵을 보여줍니다. 이는 Anthropic의 공식 수치와 함께 계획하고 페이스를 조절하는 데 도움이 되는 추세 그림입니다.",
    },
  ],
  cta: {
    heading: "내 소모 속도를 직접 확인하세요",
    body: "Token Forest는 로컬의 Claude Code와 Codex 로그를 개인용 사용량 대시보드로 바꿔 줍니다 — 소모 속도, 모델별 분석, 26주 히트맵. 한도가 작업 도중 갑자기 찾아오지 않습니다. 무료, 오프라인, 계정 불필요.",
    primaryLabel: "대시보드 둘러보기",
    primaryHref: "/dashboard",
    secondaryLabel: "Token Forest 다운로드",
    secondaryHref: "/download",
  },
};

const BREADCRUMB_LABEL: Record<Locale, string> = {
  en: "Usage limits",
  zh: "使用上限",
  ja: "使用上限",
  ko: "사용 한도",
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

export default async function ClaudeCodeUsageLimitsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tnav = await getTranslations("TopBar");
  const doc = DOCS[locale as Locale] ?? EN;
  const breadcrumbLabel = BREADCRUMB_LABEL[locale as Locale] ?? BREADCRUMB_LABEL.en;

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
