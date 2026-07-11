import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata } from "@/lib/seo";
import { ArticleDocView, type ArticleDoc } from "@/components/article-doc";
import { ArticleJsonLd, BreadcrumbJsonLd, FaqJsonLd } from "@/components/json-ld";

const PATH = "/ccusage-alternative";

const EN: ArticleDoc = {
  eyebrow: "GUIDE",
  title: "ccusage Alternative: A Visual, Always-On Desktop GUI",
  intro:
    "If you've used ccusage — the popular terminal tool for reading your Claude Code token usage — and wished for something you could see at a glance, Token Forest is the visual, always-on alternative. It reads the same local logs, but instead of printing a report on demand it grows a living pixel tree on your desktop and keeps a full offline dashboard of your usage and estimated cost. Here's an honest comparison so you can pick the right one — or run both.",
  updated: "Last updated July 11, 2026",
  sections: [
    { h2: "The short version" },
    {
      p: "ccusage is a fast, open-source command-line tool that turns your local Claude Code (and Codex) logs into daily, monthly, per-session, and 5-hour billing-block cost reports right in your terminal. Token Forest is an independent desktop app that reads those same logs and turns them into a cozy pixel pet plus a three-view dashboard. Neither uploads anything; both estimate cost locally.",
    },
    {
      callout:
        "Key takeaway: Token Forest is a friendly visual alternative to ccusage — not a front-end for it. It shares no code with ccusage and works entirely on its own. If you love the terminal, keep using ccusage; if you want an always-on, at-a-glance view, add Token Forest.",
    },
    { h2: "What ccusage does well" },
    {
      p: 'ccusage (npm package "ccusage", by ryoppippi, MIT-licensed) is a genuinely great tool, and we recommend it for terminal-first workflows.',
    },
    {
      list: [
        "Instant reports in any terminal — run it with npx, no install required.",
        "Daily, weekly, monthly, per-session, and 5-hour billing-block breakdowns of tokens and estimated cost.",
        "It focuses on terminal reports, plus an experimental (Beta) status-line display for Claude Code.",
        "Scriptable and CI-friendly — JSON output, date filters, per-model breakdowns.",
        "It reads many coding agents (15+ including Claude Code — Codex, Gemini CLI, Copilot CLI, and more), not just one.",
      ],
    },
    { h2: "What Token Forest adds" },
    {
      p: "Token Forest is a cozy pixel-art desktop pet for Windows 10/11 and macOS. It's free (public beta), local-first, and works fully offline.",
    },
    {
      list: [
        "An always-on companion: your token usage grows a living pixel tree through 8 stages while you work — no command to run.",
        "A full offline dashboard with three reconciling views — Growth (per-tree stage, days planted, “this tree ≈ $X”), Usage (daily/weekly/monthly charts, a per-model breakdown for Claude Code and Codex, a 26-week heatmap, burn rate, and per-project totals), and Chats (one line per conversation with its four token classes and estimated cost).",
        "Gentle, gamified motivation instead of raw numbers — watch effort turn into something that grows.",
        "An optional global leaderboard that is off by default; you opt in only if you want to compare.",
      ],
    },
    { h2: "ccusage vs Token Forest at a glance" },
    {
      table: {
        head: ["Feature", "ccusage (CLI)", "Token Forest (app)"],
        rows: [
          ["Interface", "Terminal command line", "Desktop pet + dashboard"],
          ["Runs on", "Any terminal (npm/npx)", "Windows 10/11, macOS"],
          [
            "Reads",
            "Local logs (Claude Code, Codex, 15+ agents)",
            "Local logs (Claude Code + Codex)",
          ],
          [
            "Output",
            "Daily / weekly / monthly / session / 5-hour block reports",
            "Growth, Usage & Chats views + live tree",
          ],
          [
            "Ambient / live",
            "Status line for Claude Code (Beta)",
            "Always-on pet, grows as you work",
          ],
          ["Motivation", "Numbers", "Gamified pixel tree, 8 stages"],
          ["Leaderboard", "—", "Opt-in, off by default"],
          [
            "Cost figures",
            "Estimated locally from pricing data",
            "Estimated locally from a bundled price table",
          ],
          ["Price", "Free, open source (MIT)", "Free (public beta)"],
          ["Best for", "Terminal users, scripting, CI", "People who want a visual, always-on view"],
        ],
      },
    },
    { h2: "Both read the same logs — and never your code" },
    {
      p: "Both tools read only the local usage logs on your machine — for Claude Code at ~/.claude and for Codex at ~/.codex. Token Forest uses only token counts plus a little structural metadata (model name, timestamp, session title, project-folder name, git branch, session id, and message-type structure). It never reads your source code, your prompts, or the content of your conversations, sends no telemetry, and runs with the network fully disabled.",
    },
    { h2: "Why the token numbers look huge" },
    {
      p: "Both tools track four token classes: input, output, cache-read, and cache-write. Cache-read tokens dominate the raw counts but cost very little each — in Token Forest's own six-week sample, cache reads were roughly 57% of real cost while input and output together were only about 24%. That's why a raw token total can look enormous while the real cost stays modest.",
    },
    {
      p: "One honest caveat for both tools: the dollar figures are estimates computed locally from a price table, and they can differ from your actual Anthropic or OpenAI invoice. Treat them as a close, private approximation — and use Token Forest's dashboard to watch your own real numbers over time.",
    },
    { h2: "Which one should you pick?" },
    {
      list: [
        "Pick ccusage if you live in the terminal, want scriptable output for CI, or just need a quick number now and then.",
        "Pick Token Forest if you want a visual, always-on view, a clickable dashboard, and a bit of gentle motivation.",
        "Not sure? They don't conflict — install both and use whichever fits the moment.",
      ],
    },
    { h2: "Can I run both?" },
    {
      p: "Yes. They read the same read-only logs and never modify them, so ccusage in your terminal and Token Forest on your desktop coexist happily. Many people keep ccusage for quick CI checks and Token Forest for the daily at-a-glance picture.",
    },
  ],
  faqHeading: "Frequently asked questions",
  faq: [
    {
      q: "Is Token Forest a GUI or front-end for ccusage?",
      a: "No. Token Forest is an independent app that shares no code with ccusage. It reads the same local logs directly and computes everything on its own. We think ccusage is excellent — Token Forest is simply a visual alternative for people who'd rather see their usage than print it.",
    },
    {
      q: "Is there a ccusage desktop app or GUI?",
      a: "ccusage itself is a terminal CLI, not a desktop app. If you want a graphical, always-on view of the same Claude Code and Codex usage, Token Forest is a free desktop alternative for Windows and macOS with a full offline dashboard.",
    },
    {
      q: "ccusage vs Token Forest — which is more accurate?",
      a: "Both read the same local logs and both estimate cost from a price table, so their token counts line up and their dollar figures are close approximations rather than exact invoices. For your real bill, always check your Anthropic or OpenAI account; for a private day-to-day estimate, either tool works.",
    },
    {
      q: "Can I use ccusage and Token Forest at the same time?",
      a: "Yes. Both only read your logs and never change them, so they run side by side without interfering. Keep ccusage for the terminal and CI; add Token Forest for a visual, ambient view.",
    },
    {
      q: "Does Token Forest read my code or prompts like some tools might?",
      a: "No. It reads only token counts and a little structural metadata from your local logs — never your source code, prompts, or conversation content. It sends no telemetry and works with the network fully turned off.",
    },
  ],
  cta: {
    heading: "Meet your terminal tool's visual companion",
    body: "Token Forest is a free, offline desktop pet and usage dashboard that reads the same logs as ccusage — and grows a pixel tree while you work.",
    primaryLabel: "Download Token Forest",
    primaryHref: "/download",
    secondaryLabel: "Explore the dashboard",
    secondaryHref: "/dashboard",
  },
};

const ZH: ArticleDoc = {
  eyebrow: "指南",
  title: "ccusage 替代方案：一个可视化、常驻桌面的 GUI",
  intro:
    "如果你用过 ccusage —— 那个在终端里查看 Claude Code token 用量的热门工具 —— 又希望有个能一眼看到的界面，那么 Token Forest 就是它的可视化、常驻桌面的替代方案。它读取同样的本地日志，但不是按需在终端里打印报表，而是在你的桌面上养一棵会生长的像素树，并附带一个完整的离线仪表盘，记录你的用量和估算花费。下面是一份诚实的对比，帮你选出更合适的那个 —— 或者两个一起用。",
  updated: "最后更新于 2026 年 7 月 11 日",
  sections: [
    { h2: "一句话总结" },
    {
      p: "ccusage 是一个快速、开源的命令行工具，把你本地的 Claude Code（以及 Codex）日志变成终端里的每日、每月、按会话和 5 小时计费窗口的花费报表。Token Forest 则是一个独立的桌面应用，读取同样的日志，把它们变成一只温馨的像素宠物，外加一个三视图仪表盘。两者都不上传任何东西，都在本地估算花费。",
    },
    {
      callout:
        "关键结论：Token Forest 是 ccusage 的一个可视化替代方案 —— 而不是它的前端。它与 ccusage 不共享任何代码，完全独立运行。如果你喜欢终端，请继续用 ccusage；如果你想要一个常驻、一眼可见的视图，就加上 Token Forest。",
    },
    { h2: "ccusage 的过人之处" },
    {
      p: "ccusage（npm 包名 ccusage，作者 ryoppippi，MIT 许可）是一个真正优秀的工具，对于以终端为主的工作流，我们推荐它。",
    },
    {
      list: [
        "在任意终端里即时出报表 —— 用 npx 运行，无需安装。",
        "按天、按周、按月、按会话、按 5 小时计费窗口拆分 token 与估算花费。",
        "它专注于终端报表，另外还有一个实验性（测试版）的 Claude Code 状态栏显示。",
        "可脚本化、对 CI 友好 —— 支持 JSON 输出、日期过滤、按模型拆分。",
        "它能读取多种编码代理（15+ 种，含 Claude Code —— Codex、Gemini CLI、Copilot CLI 等），不止一种。",
      ],
    },
    { h2: "Token Forest 额外带来的" },
    {
      p: "Token Forest 是一只面向 Windows 10/11 和 macOS 的温馨像素风桌面宠物。它免费（公开测试版）、本地优先、可完全离线运行。",
    },
    {
      list: [
        "一个常驻的小伙伴：你工作时，token 用量会让一棵像素树经历 8 个阶段生长 —— 不用敲任何命令。",
        "一个完整的离线仪表盘，含三个互相印证的视图 —— 成长（每棵树的阶段、种植天数、“这棵树 ≈ $X”）、用量（每日/每周/每月图表、Claude Code 与 Codex 的按模型拆分、26 周热力图、燃烧率、按项目汇总）、以及对话（每次会话一行，含四类 token 与估算花费）。",
        "用温和的游戏化激励取代冷冰冰的数字 —— 看着付出的努力长成会生长的东西。",
        "一个可选的全球排行榜，默认关闭；只有你想比较时才自行开启。",
      ],
    },
    { h2: "ccusage 与 Token Forest 一览" },
    {
      table: {
        head: ["功能", "ccusage（CLI）", "Token Forest（应用）"],
        rows: [
          ["界面", "终端命令行", "桌面宠物 + 仪表盘"],
          ["运行环境", "任意终端（npm/npx）", "Windows 10/11、macOS"],
          [
            "读取内容",
            "本地日志（Claude Code、Codex 等十多种代理）",
            "本地日志（Claude Code + Codex）",
          ],
          ["输出", "每日/每周/每月/会话/5 小时窗口报表", "成长、用量、对话三视图 + 实时树"],
          ["常驻/实时", "Claude Code 状态栏（测试版）", "常驻宠物，随工作生长"],
          ["激励方式", "数字", "游戏化像素树，8 个阶段"],
          ["排行榜", "—", "可选，默认关闭"],
          ["花费数字", "按价目表本地估算", "按内置价目表本地估算"],
          ["价格", "免费、开源（MIT）", "免费（公开测试版）"],
          ["最适合", "终端用户、脚本化、CI", "想要可视化、常驻视图的人"],
        ],
      },
    },
    { h2: "两者读同样的日志 —— 而且从不碰你的代码" },
    {
      p: "两个工具都只读取你本机上的本地用量日志 —— Claude Code 在 ~/.claude，Codex 在 ~/.codex。Token Forest 只使用 token 计数，外加少量结构性元数据（模型名、时间戳、会话标题、项目文件夹名、git 分支、会话 id，以及消息类型结构）。它从不读取你的源代码、你的提示词或对话内容，不发送任何遥测，并且可以在完全断网的情况下运行。",
    },
    { h2: "为什么 token 数字看起来那么大" },
    {
      p: "两个工具都跟踪四类 token：输入、输出、缓存读取和缓存写入。缓存读取在原始计数里占大头，但每个都很便宜 —— 在 Token Forest 自己的六周样本里，缓存读取约占真实花费的 57%，而输入和输出加起来只有约 24%。这就是为什么原始 token 总数看着吓人，真实花费却依然不高。",
    },
    {
      p: "对两个工具都要诚实说一句：这些美元数字都是在本地根据价目表估算出来的，可能与你真实的 Anthropic 或 OpenAI 账单有出入。把它们当作一个接近的、私密的近似值 —— 想看自己随时间变化的真实数字，就用 Token Forest 的仪表盘。",
    },
    { h2: "你该选哪个？" },
    {
      list: [
        "如果你常驻终端、想要能进 CI 的可脚本化输出，或只是偶尔想快速看个数字 —— 选 ccusage。",
        "如果你想要一个可视化、常驻的视图、一个可点击的仪表盘，还有一点温和的激励 —— 选 Token Forest。",
        "拿不定主意？它们并不冲突 —— 两个都装，哪个当下顺手就用哪个。",
      ],
    },
    { h2: "两个能一起用吗？" },
    {
      p: "可以。它们读的是同一份只读日志，都不会修改它，所以终端里的 ccusage 和桌面上的 Token Forest 可以愉快共存。很多人用 ccusage 做 CI 里的快速检查，用 Token Forest 看每天一眼可见的全貌。",
    },
  ],
  faqHeading: "常见问题",
  faq: [
    {
      q: "Token Forest 是 ccusage 的图形界面或前端吗？",
      a: "不是。Token Forest 是一个独立的应用，与 ccusage 不共享任何代码。它直接读取同样的本地日志，一切都自己计算。我们觉得 ccusage 很棒 —— Token Forest 只是给那些更愿意“看”用量而非“打印”用量的人的一个可视化替代方案。",
    },
    {
      q: "有没有 ccusage 的桌面应用或图形界面？",
      a: "ccusage 本身是终端 CLI，不是桌面应用。如果你想要一个图形化、常驻的界面来查看同样的 Claude Code 和 Codex 用量，Token Forest 是一个面向 Windows 和 macOS 的免费桌面替代方案，带完整的离线仪表盘。",
    },
    {
      q: "ccusage 与 Token Forest，哪个更准？",
      a: "两者读同样的本地日志，也都用价目表估算花费，所以它们的 token 计数是一致的，美元数字则是接近的近似值而非精确账单。要看真实账单，请始终以你的 Anthropic 或 OpenAI 账户为准；想要私密的日常估算，两个工具都可以。",
    },
    {
      q: "我能同时用 ccusage 和 Token Forest 吗？",
      a: "可以。两者都只读日志、从不改动，因此可以并行运行、互不干扰。终端和 CI 用 ccusage，再加上 Token Forest 看可视化的常驻视图。",
    },
    {
      q: "Token Forest 会不会像某些工具那样读我的代码或提示词？",
      a: "不会。它只从本地日志里读取 token 计数和少量结构性元数据 —— 绝不读取你的源代码、提示词或对话内容。它不发送任何遥测，完全断网也能工作。",
    },
  ],
  cta: {
    heading: "给你的终端工具配个可视化搭档",
    body: "Token Forest 是一个免费、离线的桌面宠物兼用量仪表盘，读取与 ccusage 相同的日志 —— 还会在你工作时长出一棵像素树。",
    primaryLabel: "下载 Token Forest",
    primaryHref: "/download",
    secondaryLabel: "看看仪表盘",
    secondaryHref: "/dashboard",
  },
};

const JA: ArticleDoc = {
  eyebrow: "ガイド",
  title: "ccusage の代替：常時そばにいるビジュアルな GUI",
  intro:
    "ターミナルで Claude Code の token 使用量を確認する人気ツール ccusage を使っていて、「ひと目で見られる画面がほしい」と思ったことはありませんか。Token Forest はその、常時デスクトップに居るビジュアルな代替です。同じローカルログを読み取りますが、必要に応じてレポートを表示する代わりに、デスクトップで育つピクセルの木を育て、使用量と概算コストを記録する完全オフラインのダッシュボードを備えています。どちらが自分に合うか（あるいは両方使うか）を選べるよう、正直な比較をまとめました。",
  updated: "最終更新 2026年7月11日",
  sections: [
    { h2: "ひと言でいうと" },
    {
      p: "ccusage は高速でオープンソースのコマンドラインツールで、ローカルの Claude Code（および Codex）ログを、ターミナル上の日次・月次・セッション別・5 時間の課金ブロック別のコストレポートに変えます。Token Forest は同じログを読み取り、それを心地よいピクセルのペットと 3 つのビューを持つダッシュボードに変える独立したデスクトップアプリです。どちらも何もアップロードせず、コストはローカルで見積もります。",
    },
    {
      callout:
        "要点：Token Forest は ccusage のビジュアルな代替であり、そのフロントエンドではありません。ccusage とコードを一切共有せず、完全に独立して動作します。ターミナルが好きなら ccusage を使い続けてください。常時ひと目で見られるビューがほしいなら Token Forest を加えてください。",
    },
    { h2: "ccusage の優れている点" },
    {
      p: "ccusage（npm パッケージ名 ccusage、作者 ryoppippi、MIT ライセンス）は本当に優れたツールで、ターミナル中心のワークフローにはおすすめです。",
    },
    {
      list: [
        "どのターミナルでも即座にレポート —— npx で実行、インストール不要。",
        "日次・週次・月次・セッション別・5 時間の課金ブロック別に、token と概算コストを内訳表示。",
        "ターミナルレポートに加えて、実験的（ベータ）な Claude Code のステータスライン表示。",
        "スクリプト化でき CI に優しい —— JSON 出力、日付フィルタ、モデル別内訳に対応。",
        "多くのコーディングエージェント（Claude Code を含む 15 種以上 —— Codex、Gemini CLI、Copilot CLI など）を読み取ります。",
      ],
    },
    { h2: "Token Forest が加えるもの" },
    {
      p: "Token Forest は Windows 10/11 と macOS 向けの、心地よいピクセルアートのデスクトップペットです。無料（パブリックベータ）で、ローカルファースト、完全オフラインで動きます。",
    },
    {
      list: [
        "常にそばにいる相棒：作業するあいだ、token 使用量が 8 段階でピクセルの木を育てます —— コマンド不要。",
        "3 つの相互に裏づけ合うビューを持つ完全オフラインのダッシュボード —— 成長（木ごとの段階、植えてからの日数、「この木 ≈ $X」）、使用量（日次/週次/月次のグラフ、Claude Code と Codex のモデル別内訳、26 週間のヒートマップ、バーンレート、プロジェクト別合計）、チャット（会話ごとに 1 行、4 種類の token と概算コスト）。",
        "生の数字ではなく、やさしいゲーミフィケーションの動機づけ —— 努力が育つものに変わっていくのを眺められます。",
        "任意参加のグローバルリーダーボード。既定ではオフで、比べたいときだけ自分で参加します。",
      ],
    },
    { h2: "ccusage と Token Forest の早見表" },
    {
      table: {
        head: ["機能", "ccusage（CLI）", "Token Forest（アプリ）"],
        rows: [
          ["インターフェース", "ターミナル CLI", "デスクトップペット + ダッシュボード"],
          ["動作環境", "任意のターミナル（npm/npx）", "Windows 10/11、macOS"],
          [
            "読み取る対象",
            "ローカルログ（Claude Code・Codex ほか十数種）",
            "ローカルログ（Claude Code + Codex）",
          ],
          [
            "出力",
            "日次/週次/月次/セッション/5 時間ブロックのレポート",
            "成長・使用量・チャットの 3 ビュー + ライブの木",
          ],
          [
            "常駐/ライブ",
            "Claude Code のステータスライン（ベータ）",
            "常駐ペット、作業に応じて成長",
          ],
          ["動機づけ", "数字", "ゲーミフィケーションのピクセルの木、8 段階"],
          ["リーダーボード", "—", "任意参加、既定でオフ"],
          ["コスト表示", "価格表からローカルで概算", "内蔵の価格表からローカルで概算"],
          ["価格", "無料・オープンソース（MIT）", "無料（パブリックベータ）"],
          [
            "向いている人",
            "ターミナル利用者、スクリプト、CI",
            "ビジュアルで常時のビューがほしい人",
          ],
        ],
      },
    },
    { h2: "同じログを読み、コードには一切触れません" },
    {
      p: "どちらのツールもあなたの端末上のローカル使用ログだけを読み取ります —— Claude Code は ~/.claude、Codex は ~/.codex。Token Forest は token 数と、わずかな構造メタデータ（モデル名、タイムスタンプ、セッションのタイトル、プロジェクトフォルダ名、git ブランチ、セッション id、メッセージ種別の構造）だけを使います。あなたのソースコードやプロンプト、会話の内容は決して読みません。テレメトリは送らず、ネットワークを完全に切っても動作します。",
    },
    { h2: "token の数字が巨大に見える理由" },
    {
      p: "どちらのツールも 4 種類の token を追跡します：入力、出力、キャッシュ読み取り、キャッシュ書き込み。キャッシュ読み取りは生の数では大半を占めますが、1 つあたりは非常に安価です —— Token Forest 自身の 6 週間のサンプルでは、キャッシュ読み取りが実コストの約 57% を占め、入力と出力を合わせても約 24% でした。だからこそ生の token 合計は途方もなく見えても、実コストは控えめなままなのです。",
    },
    {
      p: "両ツールに共通する正直な注意点：これらのドル金額はローカルの価格表から見積もった概算であり、実際の Anthropic や OpenAI の請求額とは異なることがあります。近い、あなただけの概算値として扱い、自分の実数の推移は Token Forest のダッシュボードで確認してください。",
    },
    { h2: "どちらを選ぶべき？" },
    {
      list: [
        "ターミナルに常駐し、CI 向けのスクリプト可能な出力がほしい、あるいはたまに素早く数字を見たいだけなら —— ccusage。",
        "ビジュアルで常時見られるビュー、クリックできるダッシュボード、そして少しの動機づけがほしいなら —— Token Forest。",
        "迷ったら？両者は競合しません —— 両方入れて、その時々で合う方を使いましょう。",
      ],
    },
    { h2: "両方いっしょに使える？" },
    {
      p: "使えます。どちらも同じ読み取り専用ログを読み、書き換えないので、ターミナルの ccusage とデスクトップの Token Forest は仲良く共存します。CI の素早い確認には ccusage、毎日のひと目の全体像には Token Forest、という使い分けをする人も多いです。",
    },
  ],
  faqHeading: "よくある質問",
  faq: [
    {
      q: "Token Forest は ccusage の GUI やフロントエンドですか？",
      a: "いいえ。Token Forest は ccusage とコードを一切共有しない独立したアプリです。同じローカルログを直接読み取り、すべて自前で計算します。ccusage は素晴らしいツールだと思っています —— Token Forest は、使用量を「表示」するより「眺めたい」人のためのビジュアルな代替にすぎません。",
    },
    {
      q: "ccusage のデスクトップアプリや GUI はありますか？",
      a: "ccusage 自体はターミナルの CLI で、デスクトップアプリではありません。同じ Claude Code と Codex の使用量をグラフィカルに常時見たいなら、Token Forest が Windows と macOS 向けの無料の代替で、完全オフラインのダッシュボードを備えています。",
    },
    {
      q: "ccusage と Token Forest、どちらが正確ですか？",
      a: "どちらも同じローカルログを読み、価格表からコストを見積もるため、token 数は一致し、ドル金額は正確な請求書ではなく近い概算になります。実際の請求は必ず Anthropic か OpenAI のアカウントで確認してください。日々のプライベートな概算にはどちらのツールでも十分です。",
    },
    {
      q: "ccusage と Token Forest を同時に使えますか？",
      a: "はい。どちらもログを読むだけで書き換えないので、干渉せず並行して動きます。ターミナルと CI には ccusage を、ビジュアルで常時のビューには Token Forest を加えてください。",
    },
    {
      q: "Token Forest は一部のツールのように私のコードやプロンプトを読みますか？",
      a: "いいえ。読み取るのはローカルログの token 数とわずかな構造メタデータだけで、ソースコードやプロンプト、会話の内容は決して読みません。テレメトリも送らず、ネットワークを完全に切っても動作します。",
    },
  ],
  cta: {
    heading: "ターミナルツールに、ビジュアルな相棒を",
    body: "Token Forest は ccusage と同じログを読む、無料・オフラインのデスクトップペット兼使用量ダッシュボード —— 作業するあいだにピクセルの木が育ちます。",
    primaryLabel: "Token Forest をダウンロード",
    primaryHref: "/download",
    secondaryLabel: "ダッシュボードを見る",
    secondaryHref: "/dashboard",
  },
};

const KO: ArticleDoc = {
  eyebrow: "가이드",
  title: "ccusage 대안: 항상 켜져 있는 시각적 데스크톱 GUI",
  intro:
    "터미널에서 Claude Code 토큰 사용량을 확인하는 인기 도구 ccusage를 써 봤고, 한눈에 볼 수 있는 화면이 있으면 좋겠다고 생각했다면 —— Token Forest가 바로 그 시각적이고 항상 켜져 있는 대안입니다. 같은 로컬 로그를 읽지만, 필요할 때마다 리포트를 출력하는 대신 데스크톱에서 자라는 픽셀 나무를 키우고, 사용량과 예상 비용을 기록하는 완전 오프라인 대시보드를 함께 제공합니다. 어느 쪽이 맞는지 —— 혹은 둘 다 쓸지 —— 고를 수 있도록 솔직한 비교를 정리했습니다.",
  updated: "마지막 업데이트 2026년 7월 11일",
  sections: [
    { h2: "한 줄 요약" },
    {
      p: "ccusage는 빠르고 오픈소스인 명령줄 도구로, 로컬의 Claude Code(및 Codex) 로그를 터미널에서 일간·월간·세션별·5시간 청구 구간별 비용 리포트로 바꿔 줍니다. Token Forest는 같은 로그를 읽어 아늑한 픽셀 펫과 세 가지 뷰의 대시보드로 바꾸는 독립 데스크톱 앱입니다. 둘 다 아무것도 업로드하지 않으며, 비용은 로컬에서 추정합니다.",
    },
    {
      callout:
        "핵심: Token Forest는 ccusage의 시각적 대안이지 프런트엔드가 아닙니다. ccusage와 코드를 전혀 공유하지 않고 완전히 독립적으로 동작합니다. 터미널이 좋다면 ccusage를 계속 쓰세요. 항상 켜져 있고 한눈에 보이는 화면을 원한다면 Token Forest를 더하세요.",
    },
    { h2: "ccusage가 잘하는 것" },
    {
      p: "ccusage(npm 패키지명 ccusage, 제작자 ryoppippi, MIT 라이선스)는 정말 훌륭한 도구이며, 터미널 중심 워크플로에는 이 도구를 추천합니다.",
    },
    {
      list: [
        "어떤 터미널에서든 즉시 리포트 —— npx로 실행, 설치 불필요.",
        "일간·주간·월간·세션별·5시간 청구 구간별로 토큰과 예상 비용을 분해.",
        "터미널 리포트에 더해, 실험적(베타) Claude Code 상태 표시줄 기능을 제공합니다.",
        "스크립트화가 쉽고 CI 친화적 —— JSON 출력, 날짜 필터, 모델별 분해 지원.",
        "여러 코딩 에이전트(Claude Code 포함 15종 이상 —— Codex, Gemini CLI, Copilot CLI 등)를 읽습니다.",
      ],
    },
    { h2: "Token Forest가 더해 주는 것" },
    {
      p: "Token Forest는 Windows 10/11과 macOS를 위한 아늑한 픽셀 아트 데스크톱 펫입니다. 무료(공개 베타)이며 로컬 우선, 완전 오프라인으로 동작합니다.",
    },
    {
      list: [
        "항상 곁에 있는 동반자: 작업하는 동안 토큰 사용량이 픽셀 나무를 8단계에 걸쳐 키웁니다 —— 명령어가 필요 없습니다.",
        "서로를 뒷받침하는 세 가지 뷰의 완전 오프라인 대시보드 —— 성장(나무별 단계, 심은 날수, ‘이 나무 ≈ $X’), 사용량(일간/주간/월간 차트, Claude Code와 Codex의 모델별 분해, 26주 히트맵, 소진 속도, 프로젝트별 합계), 대화(대화당 한 줄, 네 가지 토큰과 예상 비용).",
        "차가운 숫자 대신 부드러운 게이미피케이션 동기 부여 —— 들인 노력이 자라나는 무언가로 바뀌는 걸 지켜봅니다.",
        "선택형 글로벌 리더보드. 기본은 꺼져 있고, 비교하고 싶을 때만 직접 참여합니다.",
      ],
    },
    { h2: "ccusage와 Token Forest 한눈에 보기" },
    {
      table: {
        head: ["기능", "ccusage(CLI)", "Token Forest(앱)"],
        rows: [
          ["인터페이스", "터미널 CLI", "데스크톱 펫 + 대시보드"],
          ["실행 환경", "모든 터미널(npm/npx)", "Windows 10/11, macOS"],
          [
            "읽는 대상",
            "로컬 로그(Claude Code·Codex 등 십수 종)",
            "로컬 로그(Claude Code + Codex)",
          ],
          [
            "출력",
            "일간/주간/월간/세션/5시간 구간 리포트",
            "성장·사용량·대화 3개 뷰 + 실시간 나무",
          ],
          ["상주/실시간", "Claude Code 상태 표시줄(베타)", "상주 펫, 작업에 따라 성장"],
          ["동기 부여", "숫자", "게이미피케이션 픽셀 나무, 8단계"],
          ["리더보드", "—", "선택형, 기본 꺼짐"],
          ["비용 표시", "가격표로 로컬 추정", "내장 가격표로 로컬 추정"],
          ["가격", "무료·오픈소스(MIT)", "무료(공개 베타)"],
          ["적합한 사용자", "터미널 사용자, 스크립트, CI", "시각적·상시 화면을 원하는 사람"],
        ],
      },
    },
    { h2: "같은 로그를 읽고, 코드는 절대 건드리지 않습니다" },
    {
      p: "두 도구 모두 당신의 기기에 있는 로컬 사용 로그만 읽습니다 —— Claude Code는 ~/.claude, Codex는 ~/.codex. Token Forest는 토큰 수와 약간의 구조적 메타데이터(모델 이름, 타임스탬프, 세션 제목, 프로젝트 폴더 이름, git 브랜치, 세션 id, 메시지 유형 구조)만 사용합니다. 당신의 소스 코드나 프롬프트, 대화 내용은 절대 읽지 않으며, 텔레메트리를 보내지 않고, 네트워크를 완전히 끈 상태에서도 동작합니다.",
    },
    { h2: "토큰 숫자가 커 보이는 이유" },
    {
      p: "두 도구 모두 네 가지 토큰을 추적합니다: 입력, 출력, 캐시 읽기, 캐시 쓰기. 캐시 읽기는 원시 수치에서 대부분을 차지하지만 개당 비용은 매우 낮습니다 —— Token Forest 자체 6주 표본에서는 캐시 읽기가 실제 비용의 약 57%였고, 입력과 출력을 합쳐도 약 24%에 불과했습니다. 그래서 원시 토큰 합계는 엄청나 보여도 실제 비용은 크지 않게 유지됩니다.",
    },
    {
      p: "두 도구 모두에 대한 솔직한 유의점: 이 달러 금액은 로컬 가격표로 계산한 추정치이며, 실제 Anthropic이나 OpenAI 청구서와 다를 수 있습니다. 가깝고 사적인 근사치로 여기고, 자신의 실제 수치 추이는 Token Forest 대시보드에서 확인하세요.",
    },
    { h2: "어느 쪽을 골라야 할까?" },
    {
      list: [
        "터미널에 상주하고, CI용 스크립트 가능한 출력이 필요하거나, 가끔 빠르게 숫자만 보고 싶다면 —— ccusage.",
        "시각적이고 항상 켜진 화면, 클릭할 수 있는 대시보드, 약간의 부드러운 동기 부여를 원한다면 —— Token Forest.",
        "고르기 어렵다면? 둘은 충돌하지 않습니다 —— 둘 다 설치하고 그때그때 맞는 걸 쓰세요.",
      ],
    },
    { h2: "둘 다 같이 써도 될까?" },
    {
      p: "네. 둘 다 같은 읽기 전용 로그를 읽고 수정하지 않으므로, 터미널의 ccusage와 데스크톱의 Token Forest가 사이좋게 공존합니다. 많은 사람이 CI의 빠른 확인에는 ccusage를, 매일 한눈에 보는 전체 그림에는 Token Forest를 씁니다.",
    },
  ],
  faqHeading: "자주 묻는 질문",
  faq: [
    {
      q: "Token Forest는 ccusage의 GUI나 프런트엔드인가요?",
      a: "아니요. Token Forest는 ccusage와 코드를 전혀 공유하지 않는 독립 앱입니다. 같은 로컬 로그를 직접 읽고 모든 것을 자체적으로 계산합니다. ccusage는 훌륭한 도구라고 생각합니다 —— Token Forest는 사용량을 ‘출력’하기보다 ‘보고 싶은’ 사람을 위한 시각적 대안일 뿐입니다.",
    },
    {
      q: "ccusage의 데스크톱 앱이나 GUI가 있나요?",
      a: "ccusage 자체는 터미널 CLI이고 데스크톱 앱이 아닙니다. 같은 Claude Code와 Codex 사용량을 그래픽으로 항상 보고 싶다면, Token Forest가 Windows와 macOS용 무료 대안이며 완전 오프라인 대시보드를 제공합니다.",
    },
    {
      q: "ccusage와 Token Forest 중 어느 쪽이 더 정확한가요?",
      a: "둘 다 같은 로컬 로그를 읽고 가격표로 비용을 추정하므로, 토큰 수는 일치하고 달러 금액은 정확한 청구서가 아니라 가까운 근사치입니다. 실제 청구액은 항상 Anthropic이나 OpenAI 계정에서 확인하세요. 일상적인 사적 추정에는 어느 도구든 충분합니다.",
    },
    {
      q: "ccusage와 Token Forest를 동시에 쓸 수 있나요?",
      a: "네. 둘 다 로그를 읽기만 하고 바꾸지 않으므로 서로 간섭 없이 나란히 실행됩니다. 터미널과 CI에는 ccusage를, 시각적이고 상시적인 화면에는 Token Forest를 더하세요.",
    },
    {
      q: "Token Forest가 일부 도구처럼 제 코드나 프롬프트를 읽나요?",
      a: "아니요. 로컬 로그에서 토큰 수와 약간의 구조적 메타데이터만 읽으며, 소스 코드나 프롬프트, 대화 내용은 절대 읽지 않습니다. 텔레메트리도 보내지 않고, 네트워크를 완전히 꺼도 동작합니다.",
    },
  ],
  cta: {
    heading: "터미널 도구에 시각적 동반자를",
    body: "Token Forest는 ccusage와 같은 로그를 읽는 무료·오프라인 데스크톱 펫이자 사용량 대시보드입니다 —— 작업하는 동안 픽셀 나무가 자랍니다.",
    primaryLabel: "Token Forest 내려받기",
    primaryHref: "/download",
    secondaryLabel: "대시보드 둘러보기",
    secondaryHref: "/dashboard",
  },
};

const BREADCRUMB: Record<Locale, string> = {
  en: "ccusage alternative",
  zh: "ccusage 替代方案",
  ja: "ccusage の代替",
  ko: "ccusage 대안",
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

export default async function CcusageAlternativePage({
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
