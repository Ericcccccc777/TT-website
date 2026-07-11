import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata } from "@/lib/seo";
import { ArticleDocView, type ArticleDoc } from "@/components/article-doc";
import { ArticleJsonLd, BreadcrumbJsonLd, FaqJsonLd } from "@/components/json-ld";

const PATH = "/track-claude-code-usage";

const EN: ArticleDoc = {
  eyebrow: "GUIDE",
  title: "How to Track Your Claude Code and Codex Token Usage",
  intro:
    "A step-by-step guide to finding where Claude Code and OpenAI Codex quietly log every token you spend, reading those logs, and turning them into a clear picture of your usage and cost — all on your own machine, fully offline.",
  updated: "Last updated 11 July 2026",
  sections: [
    {
      callout:
        "Short version: both Claude Code and Codex keep a local log of every session. Claude Code stores them at ~/.claude/projects/**/*.jsonl; Codex at ~/.codex/sessions/**/rollout-*.jsonl. Those files hold token counts, model names, and timestamps — never your source code. You can read them by hand, with a CLI, or with a visual dashboard.",
    },
    { h2: "Where Claude Code and Codex store your usage logs" },
    {
      p: "Both tools write a local log file for every session, with no setup on your part. Here is where to look:",
    },
    {
      table: {
        head: ["Tool", "macOS / Linux", "Windows"],
        rows: [
          ["Claude Code", "~/.claude/projects/**/*.jsonl", "%USERPROFILE%\\.claude\\projects\\"],
          [
            "OpenAI Codex",
            "~/.codex/sessions/**/rollout-*.jsonl",
            "%USERPROFILE%\\.codex\\sessions\\",
          ],
        ],
      },
    },
    {
      p: "Claude Code writes one JSONL file per session, grouped into a subfolder per project (its name is derived from that project's path). Codex writes one rollout-*.jsonl per session inside dated subfolders.",
    },
    { h2: "What's inside the logs — and what isn't" },
    {
      p: "Each line is one event. Every assistant reply carries a usage block recording the tokens that round-trip spent. You can read:",
    },
    {
      list: [
        "Token counts for four classes: input, output, cache-read, and cache-write",
        "The model that answered (for example, a Claude or GPT model identifier)",
        "Timestamps, a session id, the project folder name, and usually the git branch",
        "An AI-generated session title and the message-type structure (used to tell real user turns from tool results)",
        "But not your source-code files",
      ],
    },
    {
      p: "The raw files are verbose — they also carry system prompts and message text. But to total your usage you only need the token and model fields, and a good tool touches only those. Token Forest, for instance, reads only the counts and metadata; it never copies your prompts, replies, or source code into its own data, and never uploads anything.",
    },
    { h2: "The four token classes, and why raw counts look huge" },
    {
      p: "Cache-read tokens usually dominate the raw counts, yet they are the cheapest class per token. So looking at a raw token total alone, it's easy to be alarmed by an enormous number.",
    },
    {
      callout:
        "In Token Forest's own six-week sample, cache reads were about 57% of real cost while input and output together were only about 24%. In other words, a huge raw-token number doesn't mean a huge bill. Judge spend by estimated cost, not by raw token totals.",
    },
    { h2: "Method 1: read the logs by hand" },
    {
      steps: [
        "Open Claude Code's log folder at ~/.claude/projects/. You'll see one subfolder per project; inside are the .jsonl session files.",
        "Open Codex's folder at ~/.codex/sessions/. Sessions are saved as rollout-*.jsonl inside dated subfolders.",
        "Open any file in a text editor. Every line is one JSON event; assistant replies include a usage object with the four token counts.",
        "To total them without reading every line, pipe a file through a tool like jq. Handy for a spot check — but tedious across hundreds of sessions.",
      ],
    },
    {
      code: "# Show the token usage from one Claude Code session\njq 'select(.message.usage) | .message.usage' \\\n  ~/.claude/projects/<project>/<session>.jsonl",
    },
    { h2: "Method 2: use a command-line tool" },
    {
      p: "If you'd rather not parse JSON yourself, a CLI can total it up. ccusage (open-source, by ryoppippi, on npm) reads the same ~/.claude logs — and now Codex logs too — and prints daily, monthly, and per-session cost tables in your terminal. Run it with npx ccusage. It's a well-loved, independent tool and a great fit if you live in the terminal.",
    },
    { h2: "Method 3 (the easy way): Token Forest's offline dashboard" },
    {
      p: "If you want that same data as charts you can read at a glance — without touching the command line — install Token Forest. It reads the very same local logs, computes everything on your device, and shows three reconciling views. Nothing is uploaded; it works with the network fully switched off.",
    },
    {
      steps: [
        "Download and install Token Forest (Windows 10/11 or macOS). It's a free public beta.",
        "On first launch it scans your local Claude Code and Codex logs — no account, no API key.",
        "Open the dashboard and read three views (below).",
      ],
    },
    {
      list: [
        "Growth — your usage drawn as a pixel tree that grows through stages, with days planted and 'this tree ≈ $X'.",
        "Usage — daily / weekly / monthly charts, a per-model breakdown for both Claude Code and Codex, a 26-week heatmap, burn rate, and a per-project breakdown.",
        "Chats — one line per conversation: title, project, prompt count, all four token classes, and an estimated cost.",
      ],
    },
    {
      p: "The cost figures here are an offline estimate from a bundled price table, so they may differ from your actual Anthropic or OpenAI bill — but they're computed the same way every time, which makes them ideal for spotting trends.",
    },
    { h2: "Which method should you use?" },
    {
      table: {
        head: ["Approach", "Best for", "Effort", "Cost view"],
        rows: [
          ["By hand (jq)", "one-off spot checks", "high", "you compute it"],
          ["CLI (e.g. ccusage)", "terminal fans, quick totals", "low", "tables in the terminal"],
          ["Token Forest", "a visual, ongoing picture", "lowest", "charts + offline estimate"],
        ],
      },
    },
    {
      callout:
        "Key takeaway: the logs are already on your machine — you need no API key and no internet connection to see your Claude Code and Codex usage. Read them by hand for a spot check, with a CLI like ccusage for quick totals, or with Token Forest for an at-a-glance dashboard. Whichever you pick, judge spend by estimated cost, not raw token counts.",
    },
  ],
  faqHeading: "Read more",
  faq: [
    {
      q: "Where does Claude Code store its usage logs?",
      a: "Under ~/.claude/projects/ (on Windows, %USERPROFILE%\\.claude\\projects\\), as one JSONL file per session, grouped into a folder per project. Codex uses ~/.codex/sessions/ with files named rollout-*.jsonl.",
    },
    {
      q: "How can I see my Claude Code costs?",
      a: "The logs record token counts, not dollars. To get a cost figure you multiply those counts by model prices. A CLI like ccusage or Token Forest's dashboard does this for you — but note that any offline number is an estimate and may differ from your real bill.",
    },
    {
      q: "Do these tools read my code or my prompts?",
      a: "The log files themselves contain message text, but usage tracking only needs the token and model fields. Token Forest reads only counts and metadata; it never copies your prompts or source code into its data, and never uploads anything.",
    },
    {
      q: "How do I monitor Codex usage the same way?",
      a: "Codex writes rollout-*.jsonl files under ~/.codex/sessions/. Read them by hand, or use a tool that supports both — ccusage and Token Forest each read Claude Code and Codex logs together.",
    },
    {
      q: "Is Token Forest just a front-end for ccusage?",
      a: "No. Token Forest is an independent app that reads the same local logs; it shares no code with ccusage. ccusage is a great terminal CLI; Token Forest is a visual, offline dashboard (and a pixel-tree desktop pet). Pick whichever fits how you work.",
    },
  ],
  cta: {
    heading: "See your usage as a living tree",
    body: "Install the free public beta and let Token Forest turn your local Claude Code and Codex logs into a dashboard — and a pixel tree — entirely on your machine.",
    primaryLabel: "Download Token Forest",
    primaryHref: "/download",
    secondaryLabel: "Explore the dashboard",
    secondaryHref: "/dashboard",
  },
};

const ZH: ArticleDoc = {
  eyebrow: "指南",
  title: "如何追踪 Claude Code 与 Codex 的 Token 用量",
  intro:
    "一份手把手教程：找到 Claude Code 和 OpenAI Codex 在本地悄悄记录的每一笔 token 消耗，读懂这些日志，并把它们变成一张清晰的用量与成本图 —— 全程都在你自己的电脑上、完全离线完成。",
  updated: "最后更新于 2026 年 7 月 11 日",
  sections: [
    {
      callout:
        "简短版：Claude Code 和 Codex 都会在本地记录每一次会话。Claude Code 存在 ~/.claude/projects/**/*.jsonl，Codex 存在 ~/.codex/sessions/**/rollout-*.jsonl。里面只有 token 数量、模型名和时间戳 —— 不包含你的源代码。你可以手动查看、用命令行工具，或用一个可视化面板来读它们。",
    },
    { h2: "Claude Code 与 Codex 把用量日志存在哪里" },
    { p: "这两个工具都会为每一次会话写一个本地日志文件，你无需做任何设置。位置如下：" },
    {
      table: {
        head: ["工具", "macOS / Linux", "Windows"],
        rows: [
          ["Claude Code", "~/.claude/projects/**/*.jsonl", "%USERPROFILE%\\.claude\\projects\\"],
          [
            "OpenAI Codex",
            "~/.codex/sessions/**/rollout-*.jsonl",
            "%USERPROFILE%\\.codex\\sessions\\",
          ],
        ],
      },
    },
    {
      p: "Claude Code 每次会话写一个 JSONL 文件，按项目分文件夹存放（文件夹名根据该项目路径生成）。Codex 则在按日期分组的子文件夹里，为每次会话写一个 rollout-*.jsonl 文件。",
    },
    { h2: "日志里有什么 —— 又没有什么" },
    {
      p: "每一行是一个事件。助手的每次回复都带有一个 usage（用量）块，记录了这次往返消耗的 token。你能读到：",
    },
    {
      list: [
        "四类 token 的数量：输入、输出、缓存读取、缓存写入",
        "回答所用的模型（例如某个 Claude 或 GPT 模型标识）",
        "时间戳、会话 id、项目文件夹名，通常还有 git 分支名",
        "AI 生成的会话标题，以及消息类型结构（用来区分真正的用户发言和工具返回）",
        "但不包含你的源代码文件",
      ],
    },
    {
      p: "这些原始文件其实很啰嗦 —— 里面也夹带了系统提示和消息文本。但要统计用量，你只需要 token 和模型这几个字段，好的工具也只读这些。以 Token Forest 为例，它只读取数量和元数据，绝不把你的提示词、回复或源代码复制进自己的数据文件，也绝不上传。",
    },
    { h2: "四类 token，以及为什么原始数字看起来吓人" },
    {
      p: "缓存读取（cache-read）的 token 通常在原始数量里占绝对大头，但它恰恰是每个 token 最便宜的一类。所以只看原始 token 总数，很容易被一个巨大的数字吓到。",
    },
    {
      callout:
        "在 Token Forest 自己为期六周的样本里，缓存读取约占真实成本的 57%，而输入和输出加起来只占约 24%。换句话说：原始 token 数很大，不代表账单就很贵。判断花销要看预估成本，而不是原始 token 总数。",
    },
    { h2: "方法一：手动查看日志" },
    {
      steps: [
        "打开 Claude Code 的日志文件夹 ~/.claude/projects/。里面每个项目一个子文件夹，子文件夹里是各次会话的 .jsonl 文件。",
        "打开 Codex 的文件夹 ~/.codex/sessions/。会话以 rollout-*.jsonl 的形式，存放在按日期分的子文件夹里。",
        "用文本编辑器打开任意一个文件。每一行是一个 JSON 事件；助手的回复里带有一个 usage 对象，包含四类 token 数量。",
        "如果不想逐行读，可以把文件喂给 jq 之类的工具做汇总。临时抽查很方便 —— 但面对成百上千次会话就会很繁琐。",
      ],
    },
    {
      code: "# 查看某次 Claude Code 会话的 token 用量\njq 'select(.message.usage) | .message.usage' \\\n  ~/.claude/projects/<项目>/<会话>.jsonl",
    },
    { h2: "方法二：用命令行工具" },
    {
      p: "如果不想自己解析 JSON，命令行工具可以帮你汇总。ccusage（开源，作者 ryoppippi，发布在 npm 上）读取的正是同一批 ~/.claude 日志 —— 现在也支持 Codex 日志 —— 并在终端里打印按天、按月、按会话的成本表格。运行 npx ccusage 即可。它是一个广受好评的独立工具，很适合常年待在终端里的人。",
    },
    { h2: "方法三（最省事）：Token Forest 的离线面板" },
    {
      p: "如果你想把同一批数据变成一眼就能看懂的图表，又不想碰命令行，那就装一个 Token Forest。它读取的是同样的本地日志，全部在你的设备上计算，并给出三个互相印证的视图。什么都不会上传；就算把网络完全关掉也能用。",
    },
    {
      steps: [
        "下载并安装 Token Forest（Windows 10/11 或 macOS）。免费公测版。",
        "首次启动时，它会扫描你本地的 Claude Code 和 Codex 日志 —— 不需要账号，也不需要 API key。",
        "打开面板，查看三个视图（见下）。",
      ],
    },
    {
      list: [
        "生长（Growth）：把你的用量画成一棵按阶段生长的像素树，显示种植天数，以及「这棵树 ≈ $X」。",
        "用量（Usage）：按天 / 周 / 月的图表，Claude Code 与 Codex 各自的分模型明细，一张 26 周热力图，燃烧速率，以及分项目明细。",
        "对话（Chats）：每次对话一行 —— 标题、项目、提示条数、四类 token、以及预估成本。",
      ],
    },
    {
      p: "这里的成本数字是依据内置价格表算出的离线预估，可能和你在 Anthropic 或 OpenAI 的实际账单有出入 —— 但它每次都用同样的方法计算，因此特别适合观察趋势。",
    },
    { h2: "该用哪种方法？" },
    {
      table: {
        head: ["方式", "适合", "省力程度", "成本视图"],
        rows: [
          ["手动（jq）", "偶尔抽查", "费力", "自己算"],
          ["命令行（如 ccusage）", "终端党、快速汇总", "省力", "终端表格"],
          ["Token Forest", "持续、可视化的全貌", "最省力", "图表 + 离线预估"],
        ],
      },
    },
    {
      callout:
        "关键结论：日志本来就在你的电脑上 —— 想看 Claude Code 和 Codex 的用量，既不需要 API key，也不需要联网。抽查用手动，快速汇总用 ccusage 这类命令行，想要一眼看懂的面板就用 Token Forest。无论哪种，都请以预估成本、而非原始 token 数来判断花销。",
    },
  ],
  faqHeading: "延伸阅读",
  faq: [
    {
      q: "Claude Code 的用量日志存在哪里？",
      a: "存在 ~/.claude/projects/ 下（Windows 为 %USERPROFILE%\\.claude\\projects\\），每次会话一个 JSONL 文件，按项目分文件夹。Codex 则用 ~/.codex/sessions/，文件名形如 rollout-*.jsonl。",
    },
    {
      q: "怎么查看 Claude Code 的花费？",
      a: "日志里记录的是 token 数量，不是金额。要得到花费，需要用模型价格去乘。像 ccusage 这样的命令行工具，或 Token Forest 的面板，都能替你算好；不过任何离线数字都只是预估，可能和真实账单有出入。",
    },
    {
      q: "这些工具会读我的代码或提示词吗？",
      a: "日志文件本身确实包含消息文本，但统计用量只需要 token 和模型字段。Token Forest 只读取数量和元数据，绝不把你的提示词或源代码复制进它的数据，也绝不上传任何东西。",
    },
    {
      q: "怎么用同样的方式监控 Codex 用量？",
      a: "Codex 会在 ~/.codex/sessions/ 下写 rollout-*.jsonl 文件。你可以手动查看，也可以用同时支持两者的工具 —— ccusage 和 Token Forest 都能一起读取 Claude Code 和 Codex 的日志。",
    },
    {
      q: "Token Forest 是 ccusage 的套壳吗？",
      a: "不是。Token Forest 是一个独立的应用，读取的是同样的本地日志，但和 ccusage 不共享任何代码。ccusage 是很棒的终端 CLI；Token Forest 是可视化的离线面板（同时也是一只像素树桌宠）。按你的习惯挑一个就好。",
    },
  ],
  cta: {
    heading: "把用量看成一棵会长大的树",
    body: "安装免费公测版，让 Token Forest 把你本地的 Claude Code 和 Codex 日志变成一张面板 —— 也变成一棵像素树，全程都在你的电脑上完成。",
    primaryLabel: "下载 Token Forest",
    primaryHref: "/download",
    secondaryLabel: "了解面板",
    secondaryHref: "/dashboard",
  },
};

const JA: ArticleDoc = {
  eyebrow: "ガイド",
  title: "Claude Code と Codex のトークン使用量を追跡する方法",
  intro:
    "Claude Code と OpenAI Codex がローカルにこっそり記録している「使ったトークン」を見つけ、そのログを読み解き、使用量とコストが一目でわかる形に変えるまでを、手順を追って解説します。すべてお使いのパソコンの中で、完全オフラインで完結します。",
  updated: "最終更新 2026年7月11日",
  sections: [
    {
      callout:
        "要点だけ先に：Claude Code も Codex も、セッションごとにローカルへログを残します。Claude Code は ~/.claude/projects/**/*.jsonl、Codex は ~/.codex/sessions/**/rollout-*.jsonl です。中身はトークン数・モデル名・タイムスタンプだけで、あなたのソースコードは含まれません。手動で開く、CLI で集計する、ダッシュボードで見る —— どの方法でも読めます。",
    },
    { h2: "Claude Code と Codex はログをどこに保存するか" },
    {
      p: "どちらのツールも、特別な設定なしにセッションごとのログファイルを自動で書き出します。場所は次のとおりです。",
    },
    {
      table: {
        head: ["ツール", "macOS / Linux", "Windows"],
        rows: [
          ["Claude Code", "~/.claude/projects/**/*.jsonl", "%USERPROFILE%\\.claude\\projects\\"],
          [
            "OpenAI Codex",
            "~/.codex/sessions/**/rollout-*.jsonl",
            "%USERPROFILE%\\.codex\\sessions\\",
          ],
        ],
      },
    },
    {
      p: "Claude Code はセッションごとに 1 つの JSONL ファイルを、プロジェクト単位のフォルダに分けて保存します（フォルダ名はプロジェクトのパスから生成されます）。Codex は日付ごとのサブフォルダの中に、セッションごとの rollout-*.jsonl を書き出します。",
    },
    { h2: "ログに入っているもの・入っていないもの" },
    {
      p: "各行が 1 つのイベントです。アシスタントの応答には毎回 usage（使用量）ブロックが付いており、そのやり取りで消費したトークンが記録されています。読み取れるのは次の情報です。",
    },
    {
      list: [
        "4 種類のトークン数：入力・出力・キャッシュ読み取り・キャッシュ書き込み",
        "回答したモデル（例：Claude や GPT のモデル識別子）",
        "タイムスタンプ、セッション ID、プロジェクトのフォルダ名、多くの場合は git のブランチ名",
        "AI が付けたセッションタイトルと、メッセージ種別の構造（本当のユーザー発言とツールの結果を見分けるためのもの）",
        "ただし、あなたのソースコードは含まれません",
      ],
    },
    {
      p: "生のファイルはかなり冗長で、システムプロンプトやメッセージ本文も混ざっています。しかし使用量を集計するだけなら、必要なのはトークンとモデルのフィールドだけで、まともなツールもそこしか見ません。たとえば Token Forest は数値とメタデータだけを読み、あなたのプロンプト・返答・ソースコードを自分のデータにコピーすることも、アップロードすることも一切ありません。",
    },
    { h2: "4 種類のトークンと、生の数字が大きく見える理由" },
    {
      p: "キャッシュ読み取り（cache-read）のトークンは、生の数のうえでは圧倒的多数を占めがちですが、実は 1 トークンあたりが最も安い種類です。そのため、生のトークン総数だけを見ると、その巨大な数字に驚いてしまいがちです。",
    },
    {
      callout:
        "Token Forest 自身の 6 週間のサンプルでは、キャッシュ読み取りが実コストの約 57%、入力と出力を合わせても約 24% でした。つまり、生のトークン数が大きくても請求が高いとは限りません。支出は生のトークン数ではなく、推定コストで判断しましょう。",
    },
    { h2: "方法 1：ログを手動で読む" },
    {
      steps: [
        "Claude Code のログフォルダ ~/.claude/projects/ を開きます。プロジェクトごとにサブフォルダがあり、その中に各セッションの .jsonl ファイルが入っています。",
        "Codex のフォルダ ~/.codex/sessions/ を開きます。セッションは日付ごとのサブフォルダに rollout-*.jsonl として保存されています。",
        "任意のファイルをテキストエディタで開きます。各行が 1 つの JSON イベントで、アシスタントの応答には 4 種類のトークン数を含む usage オブジェクトがあります。",
        "1 行ずつ読まずに集計したいときは、jq のようなツールにファイルを渡します。ちょっとした確認には便利ですが、何百ものセッションを相手にすると骨が折れます。",
      ],
    },
    {
      code: "# あるセッションのトークン使用量を表示する\njq 'select(.message.usage) | .message.usage' \\\n  ~/.claude/projects/<プロジェクト>/<セッション>.jsonl",
    },
    { h2: "方法 2：コマンドラインツールを使う" },
    {
      p: "自分で JSON を解析したくなければ、CLI が集計してくれます。ccusage（オープンソース、作者 ryoppippi、npm で公開）は、同じ ~/.claude のログ（いまは Codex のログにも対応）を読み、日次・月次・セッション別のコスト表をターミナルに表示します。npx ccusage で実行できます。評価の高い独立系ツールで、ターミナル中心で作業する人にぴったりです。",
    },
    { h2: "方法 3（いちばん簡単）：Token Forest のオフライン・ダッシュボード" },
    {
      p: "同じデータを、コマンドラインを触らずに一目でわかるグラフにしたいなら、Token Forest を入れましょう。まったく同じローカルログを読み、すべてを端末上で計算し、互いに裏付け合う 3 つのビューを表示します。何もアップロードされず、ネットワークを完全に切っていても動作します。",
    },
    {
      steps: [
        "Token Forest（Windows 10/11 または macOS）をダウンロードしてインストールします。無料の公開ベータです。",
        "初回起動時に、ローカルの Claude Code と Codex のログをスキャンします。アカウントも API キーも不要です。",
        "ダッシュボードを開き、3 つのビュー（下記）を確認します。",
      ],
    },
    {
      list: [
        "Growth（生長）：使用量を段階的に育つピクセルの木として表示し、植えてからの日数と「この木 ≈ $X」を示します。",
        "Usage（使用量）：日 / 週 / 月のグラフ、Claude Code と Codex それぞれのモデル別内訳、26 週間のヒートマップ、バーンレート、プロジェクト別の内訳。",
        "Chats（会話）：会話ごとに 1 行 —— タイトル、プロジェクト、プロンプト数、4 種類のトークン、推定コスト。",
      ],
    },
    {
      p: "ここでのコストは、内蔵の価格表に基づくオフラインの推定値です。実際の Anthropic や OpenAI の請求額とは差が出ることがありますが、毎回同じ方法で計算されるため、傾向をつかむにはとても向いています。",
    },
    { h2: "どの方法を選べばいい？" },
    {
      table: {
        head: ["方法", "向いている用途", "手間", "コスト表示"],
        rows: [
          ["手動（jq）", "たまの確認", "多い", "自分で計算"],
          ["CLI（例：ccusage）", "ターミナル派・素早い集計", "少ない", "ターミナルの表"],
          ["Token Forest", "継続的に使う見やすい全体像", "最も少ない", "グラフ＋オフライン推定"],
        ],
      },
    },
    {
      callout:
        "ポイント：ログはすでにあなたのパソコンの中にあります —— Claude Code と Codex の使用量を見るのに、API キーもインターネットも必要ありません。確認には手動、素早い集計には ccusage のような CLI、一目でわかるダッシュボードには Token Forest。どれを選ぶにせよ、支出は生のトークン数ではなく推定コストで判断しましょう。",
    },
  ],
  faqHeading: "もっと詳しく",
  faq: [
    {
      q: "Claude Code の使用ログはどこに保存されますか？",
      a: "~/.claude/projects/（Windows は %USERPROFILE%\\.claude\\projects\\）に、セッションごとに 1 つの JSONL ファイルとして、プロジェクト別フォルダに保存されます。Codex は ~/.codex/sessions/ を使い、ファイル名は rollout-*.jsonl です。",
    },
    {
      q: "Claude Code のコストを確認するには？",
      a: "ログに記録されているのはトークン数で、金額ではありません。コストを出すにはモデルの単価を掛けます。ccusage のような CLI や Token Forest のダッシュボードが自動で計算してくれますが、オフラインの数値はあくまで推定で、実際の請求とは差が出ることがあります。",
    },
    {
      q: "これらのツールは私のコードやプロンプトを読みますか？",
      a: "ログファイル自体にはメッセージ本文が含まれますが、使用量の集計に必要なのはトークンとモデルのフィールドだけです。Token Forest は数値とメタデータしか読まず、あなたのプロンプトやソースコードを自分のデータにコピーすることも、アップロードすることもありません。",
    },
    {
      q: "Codex の使用量も同じように監視できますか？",
      a: "Codex は ~/.codex/sessions/ に rollout-*.jsonl を書き出します。手動で開いてもよいですし、両方に対応したツールを使う手もあります —— ccusage も Token Forest も、Claude Code と Codex のログをまとめて読み込めます。",
    },
    {
      q: "Token Forest は ccusage のフロントエンドですか？",
      a: "いいえ。Token Forest は同じローカルログを読む独立したアプリで、ccusage とコードは共有していません。ccusage は優れたターミナル CLI、Token Forest は可視化されたオフライン・ダッシュボード（そしてピクセルの木のデスクトップペット）です。作業スタイルに合う方を選んでください。",
    },
  ],
  cta: {
    heading: "使用量を、育つ木として見る",
    body: "無料の公開ベータをインストールすれば、Token Forest がローカルの Claude Code と Codex のログをダッシュボードに —— そしてピクセルの木に —— 変えます。すべてあなたのパソコンの中で。",
    primaryLabel: "Token Forest をダウンロード",
    primaryHref: "/download",
    secondaryLabel: "ダッシュボードを見る",
    secondaryHref: "/dashboard",
  },
};

const KO: ArticleDoc = {
  eyebrow: "가이드",
  title: "Claude Code와 Codex 토큰 사용량 추적하는 방법",
  intro:
    "Claude Code와 OpenAI Codex가 로컬에 조용히 기록해 두는 '내가 쓴 토큰'을 찾아내고, 그 로그를 읽어 사용량과 비용을 한눈에 파악하는 방법을 단계별로 안내합니다. 모든 과정은 여러분의 컴퓨터 안에서, 완전히 오프라인으로 이뤄집니다.",
  updated: "마지막 업데이트 2026년 7월 11일",
  sections: [
    {
      callout:
        "핵심 요약: Claude Code와 Codex 모두 세션마다 로컬에 로그를 남깁니다. Claude Code는 ~/.claude/projects/**/*.jsonl, Codex는 ~/.codex/sessions/**/rollout-*.jsonl에 저장됩니다. 안에는 토큰 수, 모델 이름, 타임스탬프만 있고 여러분의 소스 코드는 들어 있지 않습니다. 직접 열어 보거나, CLI로 집계하거나, 대시보드로 볼 수 있습니다.",
    },
    { h2: "Claude Code와 Codex는 사용 로그를 어디에 저장할까" },
    {
      p: "두 도구 모두 별도 설정 없이 세션마다 로컬 로그 파일을 자동으로 남깁니다. 위치는 다음과 같습니다.",
    },
    {
      table: {
        head: ["도구", "macOS / Linux", "Windows"],
        rows: [
          ["Claude Code", "~/.claude/projects/**/*.jsonl", "%USERPROFILE%\\.claude\\projects\\"],
          [
            "OpenAI Codex",
            "~/.codex/sessions/**/rollout-*.jsonl",
            "%USERPROFILE%\\.codex\\sessions\\",
          ],
        ],
      },
    },
    {
      p: "Claude Code는 세션마다 JSONL 파일 하나를, 프로젝트별 폴더로 나눠 저장합니다(폴더 이름은 프로젝트 경로에서 생성됩니다). Codex는 날짜별 하위 폴더 안에 세션마다 rollout-*.jsonl 파일을 남깁니다.",
    },
    { h2: "로그에 있는 것과 없는 것" },
    {
      p: "각 줄이 하나의 이벤트입니다. 어시스턴트의 응답에는 매번 usage(사용량) 블록이 붙어, 해당 주고받기에서 소비한 토큰이 기록됩니다. 읽어 낼 수 있는 정보는 다음과 같습니다.",
    },
    {
      list: [
        "네 가지 토큰 수: 입력, 출력, 캐시 읽기, 캐시 쓰기",
        "답변한 모델(예: Claude 또는 GPT 모델 식별자)",
        "타임스탬프, 세션 ID, 프로젝트 폴더 이름, 대개는 git 브랜치 이름",
        "AI가 붙인 세션 제목과 메시지 유형 구조(실제 사용자 발화와 도구 결과를 구분하는 용도)",
        "다만 여러분의 소스 코드 파일은 포함되지 않습니다",
      ],
    },
    {
      p: "원본 파일은 꽤 장황해서 시스템 프롬프트와 메시지 본문도 섞여 있습니다. 하지만 사용량을 집계하는 데에는 토큰과 모델 필드만 있으면 되고, 제대로 만든 도구도 거기만 봅니다. 예컨대 Token Forest는 수치와 메타데이터만 읽으며, 여러분의 프롬프트·답변·소스 코드를 자체 데이터에 복사하거나 업로드하는 일이 전혀 없습니다.",
    },
    { h2: "네 가지 토큰, 그리고 원본 숫자가 커 보이는 이유" },
    {
      p: "캐시 읽기(cache-read) 토큰은 원본 개수에서는 대개 압도적인 비중을 차지하지만, 사실 토큰당 단가가 가장 싼 종류입니다. 그래서 원본 토큰 총합만 보면 그 큰 숫자에 놀라기 쉽습니다.",
    },
    {
      callout:
        "Token Forest가 자체적으로 수집한 6주 표본에서는 캐시 읽기가 실제 비용의 약 57%, 입력과 출력을 합쳐도 약 24%였습니다. 즉 원본 토큰 수가 크다고 해서 청구액이 큰 것은 아닙니다. 지출은 원본 토큰 수가 아니라 추정 비용으로 판단하세요.",
    },
    { h2: "방법 1: 로그를 직접 읽기" },
    {
      steps: [
        "Claude Code 로그 폴더 ~/.claude/projects/ 를 엽니다. 프로젝트마다 하위 폴더가 있고, 그 안에 세션별 .jsonl 파일이 들어 있습니다.",
        "Codex 폴더 ~/.codex/sessions/ 를 엽니다. 세션은 날짜별 하위 폴더에 rollout-*.jsonl 형태로 저장됩니다.",
        "아무 파일이나 텍스트 편집기로 엽니다. 각 줄은 하나의 JSON 이벤트이고, 어시스턴트 응답에는 네 가지 토큰 수가 담긴 usage 객체가 있습니다.",
        "한 줄씩 읽지 않고 합계를 내려면 jq 같은 도구에 파일을 넘기면 됩니다. 간단히 확인할 때는 편리하지만, 수백 개의 세션을 상대하면 번거롭습니다.",
      ],
    },
    {
      code: "# 한 세션의 토큰 사용량 보기\njq 'select(.message.usage) | .message.usage' \\\n  ~/.claude/projects/<프로젝트>/<세션>.jsonl",
    },
    { h2: "방법 2: 명령줄 도구 사용하기" },
    {
      p: "직접 JSON을 파싱하기 싫다면 CLI가 대신 집계해 줍니다. ccusage(오픈 소스, 제작자 ryoppippi, npm 배포)는 동일한 ~/.claude 로그(이제 Codex 로그도)를 읽어, 일별·월별·세션별 비용 표를 터미널에 출력합니다. npx ccusage로 실행하면 됩니다. 평판 좋은 독립 도구로, 터미널 중심으로 작업하는 사람에게 잘 맞습니다.",
    },
    { h2: "방법 3(가장 간편): Token Forest의 오프라인 대시보드" },
    {
      p: "같은 데이터를 명령줄 없이 한눈에 보이는 그래프로 보고 싶다면 Token Forest를 설치하세요. 똑같은 로컬 로그를 읽어 모든 계산을 기기에서 수행하고, 서로를 뒷받침하는 세 가지 뷰를 보여 줍니다. 아무것도 업로드하지 않으며, 네트워크를 완전히 꺼도 동작합니다.",
    },
    {
      steps: [
        "Token Forest(Windows 10/11 또는 macOS)를 내려받아 설치합니다. 무료 공개 베타입니다.",
        "처음 실행하면 로컬의 Claude Code와 Codex 로그를 스캔합니다. 계정도 API 키도 필요 없습니다.",
        "대시보드를 열고 세 가지 뷰(아래)를 확인합니다.",
      ],
    },
    {
      list: [
        "Growth(성장): 사용량을 단계별로 자라는 픽셀 나무로 보여 주고, 심은 날수와 '이 나무 ≈ $X'를 표시합니다.",
        "Usage(사용량): 일 / 주 / 월 그래프, Claude Code와 Codex 각각의 모델별 분석, 26주 히트맵, 소모 속도, 프로젝트별 분석.",
        "Chats(대화): 대화마다 한 줄 —— 제목, 프로젝트, 프롬프트 수, 네 가지 토큰, 추정 비용.",
      ],
    },
    {
      p: "여기 나오는 비용은 내장 가격표를 바탕으로 한 오프라인 추정치입니다. 실제 Anthropic이나 OpenAI 청구서와는 차이가 날 수 있지만, 매번 같은 방식으로 계산되므로 추세를 파악하는 데는 아주 좋습니다.",
    },
    { h2: "어떤 방법을 골라야 할까?" },
    {
      table: {
        head: ["방식", "적합한 용도", "수고", "비용 표시"],
        rows: [
          ["직접(jq)", "가끔 확인", "많음", "직접 계산"],
          ["CLI(예: ccusage)", "터미널 애호가·빠른 합계", "적음", "터미널 표"],
          ["Token Forest", "지속적이고 보기 좋은 전체 그림", "가장 적음", "그래프 + 오프라인 추정"],
        ],
      },
    },
    {
      callout:
        "핵심: 로그는 이미 여러분의 컴퓨터 안에 있습니다 —— Claude Code와 Codex 사용량을 보는 데 API 키도, 인터넷도 필요 없습니다. 확인은 직접, 빠른 합계는 ccusage 같은 CLI, 한눈에 보는 대시보드는 Token Forest로. 무엇을 고르든 지출은 원본 토큰 수가 아니라 추정 비용으로 판단하세요.",
    },
  ],
  faqHeading: "더 알아보기",
  faq: [
    {
      q: "Claude Code의 사용 로그는 어디에 저장되나요?",
      a: "~/.claude/projects/(Windows는 %USERPROFILE%\\.claude\\projects\\) 아래에, 세션마다 하나의 JSONL 파일로 프로젝트별 폴더에 저장됩니다. Codex는 ~/.codex/sessions/를 사용하며 파일 이름은 rollout-*.jsonl 형태입니다.",
    },
    {
      q: "Claude Code 비용은 어떻게 확인하나요?",
      a: "로그에 기록되는 것은 금액이 아니라 토큰 수입니다. 비용을 구하려면 모델 단가를 곱해야 합니다. ccusage 같은 CLI나 Token Forest 대시보드가 대신 계산해 주지만, 오프라인 수치는 어디까지나 추정이라 실제 청구서와 차이가 날 수 있습니다.",
    },
    {
      q: "이 도구들이 제 코드나 프롬프트를 읽나요?",
      a: "로그 파일 자체에는 메시지 본문이 들어 있지만, 사용량 집계에 필요한 것은 토큰과 모델 필드뿐입니다. Token Forest는 수치와 메타데이터만 읽으며, 여러분의 프롬프트나 소스 코드를 자체 데이터에 복사하거나 업로드하지 않습니다.",
    },
    {
      q: "Codex 사용량도 같은 방식으로 볼 수 있나요?",
      a: "Codex는 ~/.codex/sessions/에 rollout-*.jsonl 파일을 남깁니다. 직접 열어 봐도 되고, 둘 다 지원하는 도구를 써도 됩니다 —— ccusage와 Token Forest 모두 Claude Code와 Codex 로그를 함께 읽습니다.",
    },
    {
      q: "Token Forest는 ccusage의 프런트엔드인가요?",
      a: "아닙니다. Token Forest는 같은 로컬 로그를 읽는 독립 앱으로, ccusage와 코드를 공유하지 않습니다. ccusage는 훌륭한 터미널 CLI이고, Token Forest는 시각적인 오프라인 대시보드(그리고 픽셀 나무 데스크톱 펫)입니다. 작업 방식에 맞는 쪽을 고르세요.",
    },
  ],
  cta: {
    heading: "사용량을 자라나는 나무로 보기",
    body: "무료 공개 베타를 설치하면 Token Forest가 로컬의 Claude Code와 Codex 로그를 대시보드로 —— 그리고 픽셀 나무로 —— 바꿔 줍니다. 모두 여러분의 컴퓨터 안에서.",
    primaryLabel: "Token Forest 내려받기",
    primaryHref: "/download",
    secondaryLabel: "대시보드 살펴보기",
    secondaryHref: "/dashboard",
  },
};

const BREADCRUMB: Record<Locale, string> = {
  en: "Track usage",
  zh: "追踪用量",
  ja: "使用量の追跡",
  ko: "사용량 추적",
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

export default async function TrackClaudeCodeUsagePage({
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
