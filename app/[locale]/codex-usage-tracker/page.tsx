import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata } from "@/lib/seo";
import { ArticleDocView, type ArticleDoc } from "@/components/article-doc";
import { ArticleJsonLd, BreadcrumbJsonLd, FaqJsonLd } from "@/components/json-ld";

const PATH = "/codex-usage-tracker";

const EN: ArticleDoc = {
  eyebrow: "GUIDE",
  title: "Track Your OpenAI Codex Usage and Cost (Codex CLI)",
  intro:
    "The OpenAI Codex CLI logs every token it spends on your own machine. This guide shows where those logs live, what they record, why the numbers look so big, and three ways to turn them into a clear picture of your usage and cost — all offline, without touching your code.",
  updated: "Last updated 15 July 2026",
  sections: [
    {
      callout:
        "Short version: the Codex CLI keeps a local log of every session at ~/.codex/sessions/**/rollout-*.jsonl. Each turn records how many input, output, cached, and reasoning tokens it used, plus the model and a timestamp — never your source code. You can read those logs by hand, with a script, or with a visual desktop dashboard.",
    },
    { h2: 'Which "Codex" this is' },
    {
      p: "There are two things called Codex, and the confusion matters for what you are tracking. The original Codex was an OpenAI API model from 2021, now deprecated. Today's Codex is the Codex CLI — OpenAI's terminal coding agent, powered by the current GPT models. This guide is about the CLI: the tool you install and run in your terminal, which writes a usage log for every session. If you are watching your spend on the coding agent, that log is the source of truth.",
    },
    { h2: "Where the Codex CLI stores your usage logs" },
    {
      p: "Codex writes one log file per session automatically — you don't have to enable anything:",
    },
    {
      table: {
        head: ["Platform", "Location"],
        rows: [
          ["macOS / Linux", "~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl"],
          ["Windows", "%USERPROFILE%\\.codex\\sessions\\YYYY\\MM\\DD\\"],
        ],
      },
    },
    {
      p: "Sessions are grouped into dated folders, one rollout-*.jsonl file per session. For comparison, Claude Code keeps the same kind of log at ~/.claude/projects/**/*.jsonl — which is why a single tool can total both.",
    },
    { h2: "What the logs record — and what they don't" },
    {
      p: "Each line is one event. The events that matter for usage are the periodic token-count events, which carry the running token totals for the turn. From them you can read:",
    },
    {
      list: [
        "Token counts, split into input, output, cached input, and reasoning tokens",
        "The GPT model that answered the turn",
        "Timestamps and a session id",
        "But not your source-code files, and not the meaning of your prompts",
      ],
    },
    {
      p: "The raw files do contain message text, because they are a full session transcript. But to total your spend you only need the token and model fields — and a good tracker reads only those. Token Forest, for example, takes just the counts, the model name, and the timestamp; it never copies your prompts or code into its own data, and never uploads anything.",
    },
    { h2: "Why Codex token counts look huge" },
    {
      p: "Two classes inflate the raw number without inflating the bill by the same amount. Cached input tokens are context the model re-reads across a session; they are billed far below full input rate. Reasoning tokens are the model's internal thinking. Both can dwarf the visible input and output, so a raw total is easy to be alarmed by.",
    },
    {
      callout:
        "Judge your spend by estimated cost, not by the raw token total. A number in the billions is normal and does not mean a bill in the same order of magnitude — most of it is cached context re-read at a fraction of the price.",
    },
    { h2: "Three ways to see your Codex cost" },
    { h3: "1. Read the logs by hand" },
    {
      steps: [
        "Open ~/.codex/sessions/ and pick a dated folder, then a rollout-*.jsonl file.",
        "Open it in a text editor. Every line is one JSON event; look for the token-count events that hold the running totals.",
        "Multiply the token counts by your model's per-token rates to estimate the cost. Tedious, but it works with zero extra tools.",
      ],
    },
    { h3: "2. Use a command-line tool" },
    {
      p: "A CLI can parse the logs and print a total. This is fast and scriptable, but it lives in the terminal, shows a snapshot rather than something always-on, and you still map tokens to prices yourself unless the tool bundles a price table.",
    },
    { h3: "3. Use an offline desktop dashboard" },
    {
      p: "Token Forest reads the same Codex logs (and Claude Code's) and turns them into an always-on picture: growth over time, per-model usage, a multi-week heatmap, and an offline cost estimate with a bundled, updatable price table. It runs on Windows and macOS, works fully offline, and reads only the token counts and metadata described above — never your code.",
    },
    { h2: "Track Codex and Claude Code side by side" },
    {
      p: "If you use both agents, you don't want two separate tallies. Token Forest counts Codex and Claude Code together into one total, and colours the live token bubbles by source — Claude Code in orange, Codex in blue-purple — so you can see at a glance where the spend is going. It is an independent tool, not a front-end for any single CLI, and it shares no code with them.",
    },
  ],
  faqHeading: "Frequently asked questions",
  faq: [
    {
      q: "Is the Codex CLI the same as the old OpenAI Codex model?",
      a: "No. The 2021 Codex API model is deprecated. Today's Codex is the Codex CLI, OpenAI's terminal coding agent running on current GPT models. This guide, and Token Forest, are about the CLI's usage.",
    },
    {
      q: "Where does the Codex CLI store its usage logs?",
      a: "At ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl (on Windows, under %USERPROFILE%\\.codex\\sessions\\). One file per session, grouped into dated folders.",
    },
    {
      q: "How much does the Codex CLI cost?",
      a: "It depends on the model and how many tokens each turn spends. The logs record the token counts; multiply them by the model's rates for an estimate. Note that cached and reasoning tokens inflate the raw count well beyond the actual bill, so judge cost by the estimate, not the raw total.",
    },
    {
      q: "Does a usage tracker read my code when it tracks Codex?",
      a: "It doesn't have to. The token totals live in metadata fields, so a tracker only needs those. Token Forest reads only the counts, the model name, and the timestamp; it never copies your prompts or code, and never uploads anything.",
    },
    {
      q: "Can I track Codex and Claude Code in one place?",
      a: "Yes. Token Forest reads both logs and combines them into a single running total and dashboard, with the live token bubbles colour-coded by source so you can tell the two apart.",
    },
  ],
  cta: {
    heading: "See your Codex usage grow into a tree",
    body: "Token Forest turns the Codex and Claude Code tokens you spend into a living pixel tree, with an offline cost dashboard behind it. Free, local-first, Windows and macOS.",
    primaryLabel: "Download Token Forest",
    primaryHref: "/download",
    secondaryLabel: "See the dashboard",
    secondaryHref: "/dashboard",
  },
};

const ZH: ArticleDoc = {
  eyebrow: "指南",
  title: "追踪你的 OpenAI Codex 用量与花费（Codex CLI）",
  intro:
    "OpenAI Codex CLI 会把每一次消耗的 token 记录在你自己的机器上。本文讲清这些日志在哪、记了什么、为什么数字看着吓人，以及把它们变成清晰用量与花费的三种方法——全程离线，绝不碰你的代码。",
  updated: "最后更新 2026 年 7 月 15 日",
  sections: [
    {
      callout:
        "一句话总结：Codex CLI 会把每个会话的日志存在 ~/.codex/sessions/**/rollout-*.jsonl。每一轮都记录用了多少输入、输出、缓存和推理 token，以及模型和时间——从不记录你的源代码。你可以手动看、写脚本看，或用一个可视化的桌面面板看。",
    },
    { h2: "这里说的是哪个 Codex" },
    {
      p: "叫 Codex 的东西有两个，分清楚很重要。最早的 Codex 是 2021 年 OpenAI 的一个 API 模型，现已弃用。今天的 Codex 指的是 Codex CLI——OpenAI 的终端编码代理，跑在当前的 GPT 模型上。本文讲的是这个 CLI：你在终端里安装、运行的那个工具，它会给每个会话写一份用量日志。如果你在盯编码代理的开销，这份日志就是唯一准确的来源。",
    },
    { h2: "Codex CLI 把用量日志存在哪里" },
    {
      p: "Codex 会自动给每个会话写一份日志文件，你不需要开启任何东西：",
    },
    {
      table: {
        head: ["平台", "位置"],
        rows: [
          ["macOS / Linux", "~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl"],
          ["Windows", "%USERPROFILE%\\.codex\\sessions\\YYYY\\MM\\DD\\"],
        ],
      },
    },
    {
      p: "会话按日期分文件夹存放，每个会话一个 rollout-*.jsonl。作为对比，Claude Code 把同类日志存在 ~/.claude/projects/**/*.jsonl——正因如此，一个工具才能把两者一起统计。",
    },
    { h2: "日志记了什么——又没记什么" },
    {
      p: "每一行是一个事件。对统计用量有意义的是周期性的 token-count 事件，它带着这一轮累计的 token 数。从中你能读到：",
    },
    {
      list: [
        "token 计数，分为输入、输出、缓存输入、推理四类",
        "回答这一轮的 GPT 模型",
        "时间戳和会话 id",
        "但不包含你的源代码文件，也不理解你 prompt 的含义",
      ],
    },
    {
      p: "原始文件里确实含有消息正文，因为它是一份完整的会话记录。但要统计开销，你只需要 token 和模型这两类字段——好的统计工具只读这些。比如 Token Forest 只取计数、模型名和时间戳；它从不把你的 prompt 或代码复制进自己的数据，也从不上传任何东西。",
    },
    { h2: "为什么 Codex 的 token 数看着那么大" },
    {
      p: "有两类 token 会把原始数字撑大，却不会按同等比例撑大账单。缓存输入 token 是模型在一个会话里反复重读的上下文，计费远低于完整输入价。推理 token 是模型的内部思考。两者都可能远超看得见的输入和输出，所以只看原始总数很容易被吓到。",
    },
    {
      callout:
        "用估算的花费来判断开销，别看原始 token 总数。数字到十亿级是正常的，并不意味着账单也是同一个量级——大部分是以极低价格重读的缓存上下文。",
    },
    { h2: "看清 Codex 花费的三种方法" },
    { h3: "1. 手动看日志" },
    {
      steps: [
        "打开 ~/.codex/sessions/，选一个按日期命名的文件夹，再选一个 rollout-*.jsonl 文件。",
        "用文本编辑器打开。每一行是一个 JSON 事件；找带累计总数的 token-count 事件。",
        "把 token 数乘以你所用模型的单价来估算花费。麻烦，但零额外工具也能做。",
      ],
    },
    { h3: "2. 用命令行工具" },
    {
      p: "命令行工具能解析日志并打印总数。这很快、也方便写脚本，但它只活在终端里，给你的是一次快照而非常驻显示，而且除非工具内置价目表，token 到价格的换算还得你自己做。",
    },
    { h3: "3. 用离线桌面面板" },
    {
      p: "Token Forest 读取同样的 Codex 日志（以及 Claude Code 的），把它们变成一幅常驻的画面：随时间的成长、按模型的用量、跨多周的热力图，以及带内置可更新价目表的离线花费估算。它跑在 Windows 和 macOS 上，完全离线，只读上面说的 token 计数和元数据——绝不读你的代码。",
    },
    { h2: "把 Codex 和 Claude Code 并排追踪" },
    {
      p: "如果你两个代理都用，你不会想要两份各算各的账。Token Forest 把 Codex 和 Claude Code 合并进同一个总数，并按来源给实时 token 气泡上色——Claude Code 暖橙、Codex 蓝紫——一眼就能看出开销花在了哪。它是独立工具，不是任何单一 CLI 的前端，也不与它们共享代码。",
    },
  ],
  faqHeading: "常见问题",
  faq: [
    {
      q: "Codex CLI 和以前那个 OpenAI Codex 模型是一回事吗？",
      a: "不是。2021 年的 Codex API 模型已弃用。今天的 Codex 指的是 Codex CLI，OpenAI 的终端编码代理，跑在当前的 GPT 模型上。本文和 Token Forest 讲的都是这个 CLI 的用量。",
    },
    {
      q: "Codex CLI 的用量日志存在哪里？",
      a: "在 ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl（Windows 上在 %USERPROFILE%\\.codex\\sessions\\ 下）。每个会话一个文件，按日期分文件夹。",
    },
    {
      q: "Codex CLI 要花多少钱？",
      a: "取决于模型，以及每一轮消耗多少 token。日志记录了 token 数；乘以模型单价即可估算。注意缓存和推理 token 会把原始数字撑得远高于实际账单，所以按估算花费判断，别看原始总数。",
    },
    {
      q: "统计工具在追踪 Codex 时会读我的代码吗？",
      a: "不必读。token 总数就在元数据字段里，工具只需要这些。Token Forest 只读计数、模型名和时间戳；它从不复制你的 prompt 或代码，也从不上传任何东西。",
    },
    {
      q: "我能在一个地方同时追踪 Codex 和 Claude Code 吗？",
      a: "能。Token Forest 读取两者的日志，合并成一个总数和一个面板，并把实时 token 气泡按来源上色，让你分得清两者。",
    },
  ],
  cta: {
    heading: "看着你的 Codex 用量长成一棵树",
    body: "Token Forest 把你花掉的 Codex 和 Claude Code token 变成一棵会生长的像素树，背后是一个离线花费面板。免费、本地优先、支持 Windows 与 macOS。",
    primaryLabel: "下载 Token Forest",
    primaryHref: "/download",
    secondaryLabel: "看看数据面板",
    secondaryHref: "/dashboard",
  },
};

const JA: ArticleDoc = {
  eyebrow: "ガイド",
  title: "OpenAI Codex の使用量とコストを追跡する（Codex CLI）",
  intro:
    "OpenAI Codex CLI は、消費したトークンをすべてあなたのマシン上に記録します。本ガイドでは、そのログの場所、記録される内容、数字が大きく見える理由、そして使用量とコストを明確に把握する 3 つの方法を説明します——すべてオフラインで、コードには一切触れません。",
  updated: "最終更新 2026 年 7 月 15 日",
  sections: [
    {
      callout:
        "手短に言うと：Codex CLI はセッションごとのログを ~/.codex/sessions/**/rollout-*.jsonl に保存します。各ターンで使った入力・出力・キャッシュ・推論トークン数、モデル、タイムスタンプを記録します——ソースコードは決して記録しません。手動でも、スクリプトでも、ビジュアルなデスクトップダッシュボードでも読めます。",
    },
    { h2: "どちらの「Codex」か" },
    {
      p: "Codex と呼ばれるものは 2 つあり、追跡対象を明確にするうえでこの区別は重要です。元の Codex は 2021 年の OpenAI の API モデルで、現在は非推奨です。今日の Codex は Codex CLI——OpenAI のターミナル型コーディングエージェントで、現行の GPT モデルで動作します。本ガイドが扱うのはこの CLI です。ターミナルにインストールして実行するツールで、セッションごとに使用ログを書き出します。コーディングエージェントの支出を見張るなら、そのログが唯一の正確な情報源です。",
    },
    { h2: "Codex CLI が使用ログを保存する場所" },
    {
      p: "Codex はセッションごとに自動でログファイルを書き出します。有効化の操作は不要です：",
    },
    {
      table: {
        head: ["プラットフォーム", "場所"],
        rows: [
          ["macOS / Linux", "~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl"],
          ["Windows", "%USERPROFILE%\\.codex\\sessions\\YYYY\\MM\\DD\\"],
        ],
      },
    },
    {
      p: "セッションは日付フォルダにまとめられ、1 セッションにつき rollout-*.jsonl が 1 つです。比較として、Claude Code は同種のログを ~/.claude/projects/**/*.jsonl に保存します——だからこそ 1 つのツールで両方を合算できます。",
    },
    { h2: "ログが記録するもの——しないもの" },
    {
      p: "各行が 1 つのイベントです。使用量にとって重要なのは、そのターンの累計トークン数を持つ定期的な token-count イベントです。そこから次を読み取れます：",
    },
    {
      list: [
        "トークン数（入力・出力・キャッシュ入力・推論の 4 分類）",
        "そのターンに応答した GPT モデル",
        "タイムスタンプとセッション id",
        "ただしソースコードファイルは含まず、プロンプトの意味も読み取りません",
      ],
    },
    {
      p: "生ファイルにはメッセージ本文が含まれます。完全なセッション記録だからです。しかし支出を合算するには、トークンとモデルのフィールドだけで十分で、優れたトラッカーはそこだけを読みます。たとえば Token Forest は数値・モデル名・タイムスタンプだけを取り、プロンプトやコードを自身のデータにコピーすることも、アップロードすることもありません。",
    },
    { h2: "Codex のトークン数が大きく見える理由" },
    {
      p: "2 つの分類が、請求額を同じ割合で押し上げずに生の数字だけを膨らませます。キャッシュ入力トークンはセッション内で再読される文脈で、完全な入力料金よりはるかに安く課金されます。推論トークンはモデルの内部思考です。どちらも見える入力・出力を大きく上回りうるため、生の合計だけを見ると驚きがちです。",
    },
    {
      callout:
        "支出は生のトークン合計ではなく、推定コストで判断してください。数十億という数字は正常であり、請求が同じ桁だという意味ではありません——その大半はごくわずかな価格で再読されるキャッシュ文脈です。",
    },
    { h2: "Codex のコストを把握する 3 つの方法" },
    { h3: "1. ログを手動で読む" },
    {
      steps: [
        "~/.codex/sessions/ を開き、日付フォルダを選び、rollout-*.jsonl ファイルを選びます。",
        "テキストエディタで開きます。各行が 1 つの JSON イベントです。累計を持つ token-count イベントを探します。",
        "トークン数にモデルの単価を掛けてコストを推定します。手間はかかりますが、追加ツールなしでできます。",
      ],
    },
    { h3: "2. コマンドラインツールを使う" },
    {
      p: "CLI はログを解析して合計を表示できます。高速でスクリプト化もできますが、ターミナルの中に留まり、常時表示ではなくスナップショットを示し、価格表を内蔵していない限りトークンから価格への換算は自分で行う必要があります。",
    },
    { h3: "3. オフラインのデスクトップダッシュボードを使う" },
    {
      p: "Token Forest は同じ Codex ログ（および Claude Code のログ）を読み、常時表示の全体像に変えます：時間ごとの成長、モデル別の使用量、複数週のヒートマップ、そして内蔵の更新可能な価格表によるオフラインのコスト推定です。Windows と macOS で動作し、完全にオフラインで、上記のトークン数とメタデータだけを読みます——コードは決して読みません。",
    },
    { h2: "Codex と Claude Code を並べて追跡する" },
    {
      p: "両方のエージェントを使うなら、別々の集計は避けたいはずです。Token Forest は Codex と Claude Code を 1 つの合計にまとめ、リアルタイムのトークンバブルをソース別に色分けします——Claude Code はオレンジ、Codex は青紫——支出の行き先が一目でわかります。特定の CLI のフロントエンドではなく独立したツールであり、それらとコードを共有しません。",
    },
  ],
  faqHeading: "よくある質問",
  faq: [
    {
      q: "Codex CLI は以前の OpenAI Codex モデルと同じですか？",
      a: "いいえ。2021 年の Codex API モデルは非推奨です。今日の Codex は Codex CLI で、現行の GPT モデルで動く OpenAI のターミナル型コーディングエージェントです。本ガイドと Token Forest はこの CLI の使用量を扱います。",
    },
    {
      q: "Codex CLI は使用ログをどこに保存しますか？",
      a: "~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl（Windows では %USERPROFILE%\\.codex\\sessions\\ 以下）です。1 セッションにつき 1 ファイルで、日付フォルダにまとめられます。",
    },
    {
      q: "Codex CLI はいくらかかりますか？",
      a: "モデルと、各ターンで消費するトークン数によります。ログにトークン数が記録されているので、モデルの単価を掛ければ推定できます。キャッシュと推論のトークンは生の数字を実際の請求よりはるかに大きくするため、生の合計ではなく推定で判断してください。",
    },
    {
      q: "使用量トラッカーは Codex を追跡するときにコードを読みますか？",
      a: "読む必要はありません。トークン合計はメタデータフィールドにあるので、トラッカーはそこだけで済みます。Token Forest は数値・モデル名・タイムスタンプだけを読み、プロンプトやコードをコピーすることも、アップロードすることもありません。",
    },
    {
      q: "Codex と Claude Code を 1 か所で追跡できますか？",
      a: "はい。Token Forest は両方のログを読み、1 つの合計とダッシュボードにまとめ、リアルタイムのトークンバブルをソース別に色分けするので両者を見分けられます。",
    },
  ],
  cta: {
    heading: "Codex の使用量が木に育つのを見よう",
    body: "Token Forest は、あなたが消費した Codex と Claude Code のトークンを生きたピクセルの木に変え、その裏にオフラインのコストダッシュボードを備えます。無料、ローカルファースト、Windows と macOS 対応。",
    primaryLabel: "Token Forest をダウンロード",
    primaryHref: "/download",
    secondaryLabel: "ダッシュボードを見る",
    secondaryHref: "/dashboard",
  },
};

const KO: ArticleDoc = {
  eyebrow: "가이드",
  title: "OpenAI Codex 사용량과 비용 추적하기 (Codex CLI)",
  intro:
    "OpenAI Codex CLI는 소비한 모든 토큰을 여러분의 기기에 기록합니다. 이 가이드는 그 로그가 어디에 있는지, 무엇을 기록하는지, 숫자가 왜 그렇게 커 보이는지, 그리고 사용량과 비용을 명확히 파악하는 세 가지 방법을 설명합니다——모두 오프라인으로, 코드는 전혀 건드리지 않습니다.",
  updated: "마지막 업데이트 2026년 7월 15일",
  sections: [
    {
      callout:
        "요약: Codex CLI는 모든 세션 로그를 ~/.codex/sessions/**/rollout-*.jsonl에 저장합니다. 각 턴마다 사용한 입력·출력·캐시·추론 토큰 수와 모델, 타임스탬프를 기록합니다——소스 코드는 절대 기록하지 않습니다. 수동으로도, 스크립트로도, 시각적 데스크톱 대시보드로도 읽을 수 있습니다.",
    },
    { h2: "어느 쪽 'Codex'인가" },
    {
      p: "Codex라 불리는 것은 두 가지이고, 무엇을 추적하는지에 이 구분이 중요합니다. 원래의 Codex는 2021년 OpenAI의 API 모델로 지금은 지원 중단되었습니다. 오늘날의 Codex는 Codex CLI——현행 GPT 모델로 동작하는 OpenAI의 터미널 코딩 에이전트입니다. 이 가이드는 그 CLI에 관한 것입니다. 터미널에 설치해 실행하는 도구로, 세션마다 사용 로그를 씁니다. 코딩 에이전트의 지출을 지켜본다면 그 로그가 유일하게 정확한 출처입니다.",
    },
    { h2: "Codex CLI가 사용 로그를 저장하는 위치" },
    {
      p: "Codex는 세션마다 로그 파일을 자동으로 씁니다. 활성화할 것은 없습니다:",
    },
    {
      table: {
        head: ["플랫폼", "위치"],
        rows: [
          ["macOS / Linux", "~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl"],
          ["Windows", "%USERPROFILE%\\.codex\\sessions\\YYYY\\MM\\DD\\"],
        ],
      },
    },
    {
      p: "세션은 날짜 폴더로 묶이며, 세션당 rollout-*.jsonl 파일 하나입니다. 비교하자면 Claude Code는 같은 종류의 로그를 ~/.claude/projects/**/*.jsonl에 저장합니다——그래서 한 도구로 둘을 합산할 수 있습니다.",
    },
    { h2: "로그가 기록하는 것——과 하지 않는 것" },
    {
      p: "각 줄은 하나의 이벤트입니다. 사용량에 중요한 것은 해당 턴의 누적 토큰 수를 담은 주기적인 token-count 이벤트입니다. 여기서 다음을 읽을 수 있습니다:",
    },
    {
      list: [
        "토큰 수 (입력·출력·캐시 입력·추론의 네 종류)",
        "그 턴에 응답한 GPT 모델",
        "타임스탬프와 세션 id",
        "그러나 소스 코드 파일은 포함하지 않고, 프롬프트의 의미도 읽지 않습니다",
      ],
    },
    {
      p: "원본 파일에는 메시지 본문이 들어 있습니다. 완전한 세션 기록이기 때문입니다. 하지만 지출을 합산하려면 토큰과 모델 필드만 있으면 되고, 좋은 추적 도구는 그것만 읽습니다. 예를 들어 Token Forest는 수치·모델 이름·타임스탬프만 가져가며, 프롬프트나 코드를 자기 데이터에 복사하지 않고 아무것도 업로드하지 않습니다.",
    },
    { h2: "Codex 토큰 수가 커 보이는 이유" },
    {
      p: "두 종류가 청구액을 같은 비율로 키우지 않으면서 원시 숫자만 부풀립니다. 캐시 입력 토큰은 세션 내에서 다시 읽히는 문맥으로, 완전한 입력 요금보다 훨씬 낮게 청구됩니다. 추론 토큰은 모델의 내부 사고입니다. 둘 다 보이는 입력·출력을 크게 웃돌 수 있어, 원시 합계만 보면 놀라기 쉽습니다.",
    },
    {
      callout:
        "지출은 원시 토큰 합계가 아니라 추정 비용으로 판단하세요. 수십억이라는 숫자는 정상이며 청구가 같은 자릿수라는 뜻이 아닙니다——대부분은 아주 낮은 가격으로 다시 읽히는 캐시 문맥입니다.",
    },
    { h2: "Codex 비용을 확인하는 세 가지 방법" },
    { h3: "1. 로그를 수동으로 읽기" },
    {
      steps: [
        "~/.codex/sessions/를 열고 날짜 폴더를 고른 뒤 rollout-*.jsonl 파일을 선택합니다.",
        "텍스트 편집기로 엽니다. 각 줄은 하나의 JSON 이벤트입니다. 누적을 담은 token-count 이벤트를 찾습니다.",
        "토큰 수에 모델 단가를 곱해 비용을 추정합니다. 번거롭지만 추가 도구 없이 가능합니다.",
      ],
    },
    { h3: "2. 명령줄 도구 사용하기" },
    {
      p: "CLI는 로그를 파싱해 합계를 출력할 수 있습니다. 빠르고 스크립트화도 되지만, 터미널 안에 머물고 상시 표시가 아니라 스냅샷을 보여주며, 가격표를 내장하지 않는 한 토큰을 가격으로 환산하는 일은 직접 해야 합니다.",
    },
    { h3: "3. 오프라인 데스크톱 대시보드 사용하기" },
    {
      p: "Token Forest는 같은 Codex 로그(그리고 Claude Code의 로그)를 읽어 상시 표시되는 그림으로 바꿉니다: 시간에 따른 성장, 모델별 사용량, 여러 주에 걸친 히트맵, 그리고 내장된 업데이트 가능한 가격표로 계산하는 오프라인 비용 추정입니다. Windows와 macOS에서 동작하며 완전히 오프라인이고, 위에서 설명한 토큰 수와 메타데이터만 읽습니다——코드는 절대 읽지 않습니다.",
    },
    { h2: "Codex와 Claude Code를 나란히 추적하기" },
    {
      p: "두 에이전트를 모두 쓴다면 따로 집계하고 싶지는 않을 것입니다. Token Forest는 Codex와 Claude Code를 하나의 합계로 묶고, 실시간 토큰 버블을 출처별로 색칠합니다——Claude Code는 주황, Codex는 청보라——지출이 어디로 가는지 한눈에 보입니다. 특정 CLI의 프런트엔드가 아니라 독립적인 도구이며, 그들과 코드를 공유하지 않습니다.",
    },
  ],
  faqHeading: "자주 묻는 질문",
  faq: [
    {
      q: "Codex CLI는 예전 OpenAI Codex 모델과 같은 건가요?",
      a: "아니요. 2021년의 Codex API 모델은 지원 중단되었습니다. 오늘날의 Codex는 Codex CLI로, 현행 GPT 모델로 동작하는 OpenAI의 터미널 코딩 에이전트입니다. 이 가이드와 Token Forest는 이 CLI의 사용량을 다룹니다.",
    },
    {
      q: "Codex CLI는 사용 로그를 어디에 저장하나요?",
      a: "~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl에 저장합니다(Windows에서는 %USERPROFILE%\\.codex\\sessions\\ 아래). 세션당 파일 하나이며 날짜 폴더로 묶입니다.",
    },
    {
      q: "Codex CLI는 비용이 얼마나 드나요?",
      a: "모델과 각 턴이 소비하는 토큰 수에 따라 다릅니다. 로그에 토큰 수가 기록되므로 모델 단가를 곱하면 추정할 수 있습니다. 캐시와 추론 토큰이 원시 숫자를 실제 청구보다 훨씬 크게 만들므로, 원시 합계가 아니라 추정으로 판단하세요.",
    },
    {
      q: "사용량 추적 도구가 Codex를 추적할 때 제 코드를 읽나요?",
      a: "읽을 필요가 없습니다. 토큰 합계는 메타데이터 필드에 있어 추적 도구는 그것만 있으면 됩니다. Token Forest는 수치·모델 이름·타임스탬프만 읽고, 프롬프트나 코드를 복사하지 않으며 아무것도 업로드하지 않습니다.",
    },
    {
      q: "Codex와 Claude Code를 한곳에서 추적할 수 있나요?",
      a: "네. Token Forest는 두 로그를 모두 읽어 하나의 합계와 대시보드로 묶고, 실시간 토큰 버블을 출처별로 색칠해 둘을 구분할 수 있게 합니다.",
    },
  ],
  cta: {
    heading: "Codex 사용량이 나무로 자라는 것을 보세요",
    body: "Token Forest는 여러분이 소비한 Codex와 Claude Code 토큰을 살아 있는 픽셀 나무로 바꾸고, 그 뒤에 오프라인 비용 대시보드를 둡니다. 무료, 로컬 우선, Windows와 macOS 지원.",
    primaryLabel: "Token Forest 다운로드",
    primaryHref: "/download",
    secondaryLabel: "대시보드 보기",
    secondaryHref: "/dashboard",
  },
};

const BREADCRUMB: Record<Locale, string> = {
  en: "Codex usage tracker",
  zh: "Codex 用量追踪",
  ja: "Codex 使用量トラッカー",
  ko: "Codex 사용량 추적",
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

export default async function CodexUsageTrackerPage({
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
        datePublished="2026-07-15"
        dateModified="2026-07-15"
      />
      <FaqJsonLd items={(doc.faq ?? []).map((f) => ({ question: f.q, answer: f.a }))} />
      <ArticleDocView doc={doc} />
    </>
  );
}
