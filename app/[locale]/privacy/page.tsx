import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata } from "@/lib/seo";
import { LegalDocView, type LegalDoc } from "@/components/legal-doc";

// Canonical policy text — mirror of Token-Forest-P/PRIVACY.md, same version.
// Do not edit wording here directly; update the canonical file first.

const EN: LegalDoc = {
  title: "Token Forest Privacy Notice",
  meta: [
    "Version 1.0-beta (pre-release draft) · Last updated 2026-07-08 · Effective at first public release",
    "Publisher: Poietic Studio",
  ],
  sections: [
    {
      blocks: [
        {
          p: "Token Forest is a desktop companion that turns your Claude Code / OpenAI Codex usage into a growing pixel tree. This notice describes exactly what the app reads, stores, and — only if you opt in — uploads. The same text is published as PRIVACY.md in the public product repository, whose git history serves as the public change log of this policy.",
        },
      ],
    },
    {
      h: "Summary",
      blocks: [
        {
          list: [
            "Core features run entirely on your device. No account, no API key, no network needed.",
            "The app contains no telemetry, no ads, no crash reporting, no auto-update phoning home.",
            "It reads the usage logs your AI coding tools already write locally — never your source-code files.",
            "It does not store or upload prompts or conversation content.",
            "The global leaderboard is optional and off by default. Before it turns on, the app shows a consent dialog listing every field it would sync. Turning it off requests deletion of your entry.",
            "We do not sell personal data. There is nothing to sell — by default we never receive any.",
          ],
        },
      ],
    },
    {
      h: "What the app reads locally",
      blocks: [
        { p: "Token Forest reads the local usage logs created by supported tools:" },
        {
          code: "Claude Code:  ~/.claude/projects/**/*.jsonl\nOpenAI Codex: ~/.codex/sessions/**/rollout-*.jsonl",
        },
        {
          p: "From these logs it uses: token counts (input / output / cache read / cache write), timestamps, source (Claude or Codex), model identifiers, session identifiers, project-directory names, Git branch names, AI-generated session titles, and message-type structure (used only to tell genuine user turns apart from tool results).",
        },
        {
          p: "To parse a log line, its full content — which can include prompt text — passes through memory. Token Forest does not need prompt meaning, does not copy prompt or conversation text into its own data files, and never uploads it. It never opens your source-code files.",
        },
      ],
    },
    {
      h: "What the app stores locally",
      blocks: [
        {
          p: "The current beta stores its data files next to the application. A future release will move them to standard per-user directories (Windows: %LOCALAPPDATA%\\TokenForest\\, macOS: ~/Library/Application Support/TokenForest/) with automatic migration.",
        },
        {
          table: {
            head: ["File", "Contents"],
            rows: [
              ["garden.json", "Per-tree tokens, growth stage, fruit, decorations, first-use time"],
              [
                "config.json",
                "Window position, language, bubble mode, leaderboard state, display name, region",
              ],
              ["growth_ledger.json", "Growth history by date × tree × token type"],
              [
                "usage_ledger.json",
                "Aggregated session metadata: log file paths, project names, branches, AI titles, times, models, daily token totals",
              ],
              [
                "account.json",
                "Only if the leaderboard was enabled: anonymous user ID and Supabase session tokens",
              ],
            ],
          },
        },
        {
          p: "These files stay on your machine and are never uploaded. usage_ledger.json contains local metadata (such as file paths) that other users of your computer could read if they can read your files; treat the app's data folder as private. account.json currently stores session tokens as plain JSON; moving them to the operating system's credential store is planned. Deleting these files (or uninstalling and deleting the folder) removes all local data.",
        },
      ],
    },
    {
      h: "Network behaviour",
      blocks: [
        {
          p: "With the leaderboard off — the default — Token Forest makes no network requests at all. Growth, bubbles, the shop, capsule mode and the dashboard all work offline. Cost estimates use a bundled price table; nothing is looked up online.",
        },
        {
          p: "Menu items that open a web page (for example the leaderboard website) launch your default browser; the desktop app itself sends nothing in the background.",
        },
      ],
    },
    {
      h: "Optional leaderboard",
      blocks: [
        {
          p: "The leaderboard is off by default. Selecting On shows a consent dialog listing exactly what will sync; nothing is sent unless you confirm it.",
        },
        {
          p: "When enabled, the app creates an anonymous account with Supabase (our database provider) and syncs, roughly every 30 minutes and at moments like startup, tree switch, and quitting:",
        },
        {
          table: {
            head: ["Field", "Shown publicly?"],
            rows: [
              ["Random anonymous ID (generated by Supabase; used only to own your row)", "No"],
              ["Display name (blank = a generated “Anonymous#id” name)", "Yes"],
              ["Total collected tree tokens", "Yes"],
              ["Each tree's token total and growth stage", "Yes (tree details)"],
              ["Region — only if you picked one", "Yes (flag)"],
              ["Current tree species", "Yes"],
              ["Server-generated created/updated timestamps", "May be shown"],
            ],
          },
        },
        {
          p: "Small print: if you leave the name blank, the generated anonymous name is rendered in your app language, so the leaderboard indirectly reflects which UI language you use.",
        },
        {
          p: "Never uploaded, in any mode: raw logs, prompts or conversation content, source code, session titles, file paths, project names, Git branches, per-model or per-session usage, cost estimates.",
        },
        {
          p: "Like any online service, Supabase's infrastructure processes standard connection data (such as IP addresses and request timestamps) to operate and secure the service, under Supabase's own policies.",
        },
      ],
    },
    {
      h: "On · Paused · Off",
      blocks: [
        {
          list: [
            "On — syncs periodically.",
            "Paused — stops updates; your last entry stays on the board.",
            "Off — stops syncing and sends a request to delete your row.",
          ],
        },
        {
          p: "Beta limitation, stated plainly: if the deletion request fails (for example, you are offline), the current beta does not yet retry or confirm it. Toggling Off again while online re-sends it. Reliable delete-with-confirmation is planned before the stable release. You can also ask us to delete your entry (see Contact) — mention the anonymous name/ID shown in the app, and never send us your tokens from account.json.",
        },
      ],
    },
    {
      h: "Website",
      blocks: [
        {
          p: "This website uses no analytics, no advertising trackers, and no marketing cookies. Its hosting provider processes standard server logs (IP address, user agent, requested page, time) to serve and secure the site. The leaderboard page reads the public leaderboard rows described above; viewing it requires no login. If we ever add analytics or similar services, this notice will be updated first.",
        },
      ],
    },
    {
      h: "Service providers",
      blocks: [
        {
          p: "We use a small number of providers, only for the functions described: Supabase (anonymous auth + leaderboard database), the website host, and GitHub (product repository, issues, release downloads). Provider regions and policy links will be finalised in this section before the first stable release.",
        },
      ],
    },
    {
      h: "Verifying these claims",
      blocks: [
        {
          p: "We take “trust us” seriously enough to know it isn't good enough. The app works with your network fully disabled — try it. Each release publishes SHA-256 checksums and its signing status, and release notes call out any privacy or network change. The source code is currently private, but we are exploring opening the core usage-reader component so the “reads logs, uploads nothing” claims can be independently audited.",
        },
      ],
    },
    {
      h: "Your controls",
      blocks: [
        {
          list: [
            "Use the app fully offline — never enable the leaderboard.",
            "Pause or turn off leaderboard sync at any time from the tree's menu.",
            "Change or blank your display name and region.",
            "Delete local data by deleting the app's data files / uninstalling.",
            "Contact us to verify remote deletion.",
          ],
        },
      ],
    },
    {
      h: "Changes",
      blocks: [
        {
          p: "If a future version adds any new data processing — telemetry, crash reporting, auto-update checks, new leaderboard fields — this notice and the in-app consent will be updated before that version ships, and the release notes will call it out under “Privacy or network changes”.",
        },
      ],
    },
    {
      h: "Contact",
      blocks: [
        {
          code: "Publisher: Poietic Studio\nPrivacy:   contact@tokenforest.com.au (interim; privacy@tokenforest.com.au activating before first public release)\nSecurity:  see the Security page\nWebsite:   https://www.tokenforest.com.au",
        },
      ],
    },
  ],
};

const ZH: LegalDoc = {
  title: "Token Forest 隐私声明",
  meta: [
    "版本 1.0-beta(发布前草案) · 最后更新 2026-07-08 · 首个公开版本发布时生效",
    "发布者:Poietic Studio",
  ],
  sections: [
    {
      blocks: [
        {
          p: "Token Forest 是一款把 Claude Code / OpenAI Codex 用量变成像素树成长的桌面应用。本声明说明应用会读取什么、保存什么,以及——仅在你主动开启后——上传什么。同一文本以 PRIVACY.md 发布于公开产品仓库,其 git 历史即本声明的公开变更记录。",
        },
      ],
    },
    {
      h: "摘要",
      blocks: [
        {
          list: [
            "核心功能完全在你的设备上运行:无需账号、无需 API key、无需网络。",
            "应用没有遥测、广告、崩溃上报,也没有自动更新的后台请求。",
            "它读取的是 AI 编程工具已经写在你本机的使用日志——从不读取你的源代码文件。",
            "不保存、不上传 prompt 或对话内容。",
            "全球排行榜为可选功能,默认关闭。开启前会弹出同意确认,列出将同步的全部字段;关闭时会请求删除你的记录。",
            "我们不出售个人数据——默认模式下我们根本收不到任何数据。",
          ],
        },
      ],
    },
    {
      h: "应用在本地读取什么",
      blocks: [
        { p: "Token Forest 读取受支持工具在本机生成的使用日志:" },
        {
          code: "Claude Code:  ~/.claude/projects/**/*.jsonl\nOpenAI Codex: ~/.codex/sessions/**/rollout-*.jsonl",
        },
        {
          p: "从日志中使用:四类 token 数量(input / output / cache 读 / cache 写)、时间戳、来源(Claude/Codex)、模型标识、会话标识、项目目录名、Git 分支名、AI 生成的会话标题,以及消息类型结构(仅用于区分真实提问与工具结果)。",
        },
        {
          p: "解析日志行时,其完整内容(可能包含 prompt 文本)会经过内存。Token Forest 不需要理解 prompt 含义,不会把 prompt/对话正文写入自己的数据文件,更不会上传;也从不打开你的源代码文件。",
        },
      ],
    },
    {
      h: "应用在本地保存什么",
      blocks: [
        {
          p: "当前 Beta 将数据文件保存在应用目录旁;后续版本会迁移到标准每用户目录(Windows:%LOCALAPPDATA%\\TokenForest\\,macOS:~/Library/Application Support/TokenForest/)并自动迁移数据。",
        },
        {
          table: {
            head: ["文件", "内容"],
            rows: [
              ["garden.json", "每棵树的 token、阶段、果实、装饰、首次使用时间"],
              ["config.json", "窗口位置、语言、气泡模式、排行榜状态、昵称、地区"],
              ["growth_ledger.json", "按日期 × 树种 × token 类型的成长流水"],
              [
                "usage_ledger.json",
                "聚合会话元数据:日志路径、项目名、分支、AI 标题、时间、模型、按日 token 汇总",
              ],
              ["account.json", "仅在开启过排行榜后存在:匿名用户 ID 与 Supabase 会话令牌"],
            ],
          },
        },
        {
          p: "这些文件只存在于你的机器上,不会上传。usage_ledger.json 含文件路径等本地元数据,同一台电脑的其他用户若能读你的文件即可看到,请把应用数据目录视为私人目录。account.json 当前以普通 JSON 保存会话令牌,改用操作系统凭据存储已在计划中。删除这些文件(或卸载并删除目录)即清除全部本地数据。",
        },
      ],
    },
    {
      h: "默认网络行为",
      blocks: [
        {
          p: "排行榜关闭(默认)时,Token Forest 不发出任何网络请求:成长、气泡、商店、胶囊模式、数据面板全部离线可用,成本估算使用内置价格表,不做任何在线查询。",
        },
        {
          p: "菜单中打开网页的入口(如排行榜网站)只是调用系统默认浏览器,桌面应用本身不在后台发送任何内容。",
        },
      ],
    },
    {
      h: "可选排行榜",
      blocks: [
        {
          p: "默认关闭。选择「开启」会先弹出同意确认,列出将同步的全部字段;确认前不会发送任何内容。",
        },
        {
          p: "开启后,应用会向 Supabase(数据库服务商)注册匿名账户,并大约每 30 分钟以及启动、换树、退出等时点同步:",
        },
        {
          table: {
            head: ["字段", "是否公开展示"],
            rows: [
              ["随机匿名 ID(Supabase 生成,仅用于归属你的记录)", "否"],
              ["展示昵称(留空则生成「匿名用户#编号」)", "是"],
              ["收集的树 Token 总数", "是"],
              ["每棵树的 Token 数与成长阶段", "是(树详情)"],
              ["地区——仅在你主动选择后", "是(国旗)"],
              ["当前树种", "是"],
              ["服务端生成的创建/更新时间", "可能显示"],
            ],
          },
        },
        {
          p: "小字说明:昵称留空时生成的匿名名按你的界面语言渲染,因此榜单会间接体现你的 UI 语言。",
        },
        {
          p: "任何模式下都不会上传:原始日志、prompt/对话正文、源代码、会话标题、文件路径、项目名、Git 分支、按模型/按会话用量、成本估算。",
        },
        {
          p: "与任何在线服务一样,Supabase 的基础设施会为运行与安全处理标准连接数据(如 IP 地址、请求时间),适用其自身政策。",
        },
      ],
    },
    {
      h: "开启 · 暂停 · 关闭",
      blocks: [
        {
          list: [
            "开启——定期同步。",
            "暂停——停止更新,最后一次记录保留在榜上。",
            "关闭——停止同步,并发送删除请求撤下你的记录。",
          ],
        },
        {
          p: "Beta 限制,如实说明:删除请求失败时(例如离线),当前 Beta 尚不会重试或确认;联网后再切一次「关闭」会重新发送。可靠的删除确认机制会在正式版前补齐。你也可以联系我们协助删除(见「联系我们」),提供 App 内显示的匿名名/编号即可——请勿把 account.json 里的令牌发给任何人。",
        },
      ],
    },
    {
      h: "网站",
      blocks: [
        {
          p: "本网站不使用分析工具、广告跟踪或营销 Cookie。托管商会为提供与保护服务处理标准服务器日志(IP、浏览器标识、请求页面、时间)。排行榜页面读取上述公开榜单数据,浏览无需登录。将来若引入 analytics 等服务,会先更新本声明。",
        },
      ],
    },
    {
      h: "服务提供商",
      blocks: [
        {
          p: "仅为明确功能使用少量服务商:Supabase(匿名认证 + 排行榜数据库)、网站托管商、GitHub(产品仓库、Issues 与 Release 下载)。服务商区域与政策链接将在首个正式版前在本节补全。",
        },
      ],
    },
    {
      h: "如何验证这些承诺",
      blocks: [
        {
          p: "我们很清楚“相信我们”这句话本身不够分量。断网状态下应用照常运行——你可以亲自试试。每个 Release 都会发布 SHA-256 校验值与签名状态,Release notes 会单独列出任何隐私/网络变化。源代码目前是私有的,但我们在考虑开放核心的用量读取组件,让“只读日志、默认零上传”可以被独立审计。",
        },
      ],
    },
    {
      h: "你的控制权",
      blocks: [
        {
          list: [
            "完全离线使用——不开启排行榜即可;",
            "随时在树的菜单中暂停或关闭同步;",
            "修改或清空昵称与地区;",
            "删除应用数据文件/卸载即删除本地数据;",
            "联系我们确认远程记录已删除。",
          ],
        },
      ],
    },
    {
      h: "变更",
      blocks: [
        {
          p: "未来版本若新增任何数据处理(遥测、崩溃上报、更新检查、新排行榜字段),会在该版本发布之前更新本声明与 App 内同意文案,并在 Release notes 的「Privacy or network changes」一节中明确列出。",
        },
      ],
    },
    {
      h: "联系我们",
      blocks: [
        {
          code: "发布者:  Poietic Studio\n隐私:    contact@tokenforest.com.au(过渡期;privacy@tokenforest.com.au 将在首个公开版本前启用)\n安全:    见 Security 页\n网站:    https://www.tokenforest.com.au",
        },
      ],
    },
  ],
};

const JA: LegalDoc = {
  title: "Token Forest プライバシー通知",
  meta: [
    "バージョン 1.0-beta(プレリリース草案) · 最終更新 2026-07-08 · 最初の公開リリース時に発効",
    "発行者:Poietic Studio",
  ],
  sections: [
    {
      blocks: [
        {
          p: "Token Forest は、Claude Code / OpenAI Codex の利用状況を、成長するピクセルの木に変えるデスクトップアプリです。本通知は、アプリが何を読み取り、何を保存し、そして——あなたが同意した場合にのみ——何をアップロードするかを正確に説明します。同一の文章は公開プロダクトリポジトリに PRIVACY.md として公開されており、その git 履歴が本ポリシーの公開変更履歴となります。",
        },
      ],
    },
    {
      h: "概要",
      blocks: [
        {
          list: [
            "中核機能はすべてお使いのデバイス上で動作します。アカウント、API キー、ネットワークは不要です。",
            "アプリにはテレメトリ、広告、クラッシュレポート、外部へ通信する自動更新は一切ありません。",
            "AI コーディングツールがすでにローカルに書き出している使用ログを読み取ります——あなたのソースコードファイルを読むことはありません。",
            "プロンプトや会話内容を保存・アップロードすることはありません。",
            "グローバルリーダーボードは任意機能で、既定でオフです。オンにする前に、同期される全項目を列挙した同意ダイアログを表示します。オフにすると、あなたの記録の削除を要求します。",
            "当社は個人データを販売しません。売るものがそもそもありません——既定では当社は一切データを受け取りません。",
          ],
        },
      ],
    },
    {
      h: "アプリがローカルで読み取るもの",
      blocks: [
        { p: "Token Forest は、対応ツールがローカルに生成する使用ログを読み取ります:" },
        {
          code: "Claude Code:  ~/.claude/projects/**/*.jsonl\nOpenAI Codex: ~/.codex/sessions/**/rollout-*.jsonl",
        },
        {
          p: "これらのログから次を使用します:トークン数(入力 / 出力 / キャッシュ読み取り / キャッシュ書き込み)、タイムスタンプ、ソース(Claude または Codex)、モデル識別子、セッション識別子、プロジェクトディレクトリ名、Git ブランチ名、AI が生成したセッションタイトル、およびメッセージ種別の構造(実際のユーザーの発話とツール結果を区別するためだけに使用)。",
        },
        {
          p: "ログの 1 行を解析する際、その全内容(プロンプト文を含む場合があります)がメモリを通過します。Token Forest はプロンプトの意味を必要とせず、プロンプトや会話本文を自身のデータファイルにコピーすることも、アップロードすることもありません。ソースコードファイルを開くことも決してありません。",
        },
      ],
    },
    {
      h: "アプリがローカルに保存するもの",
      blocks: [
        {
          p: "現行ベータは、データファイルをアプリケーションの隣に保存します。将来のリリースでは、標準のユーザーごとのディレクトリ(Windows:%LOCALAPPDATA%\\TokenForest\\、macOS:~/Library/Application Support/TokenForest/)へ、自動移行のうえ移動します。",
        },
        {
          table: {
            head: ["ファイル", "内容"],
            rows: [
              ["garden.json", "木ごとのトークン、成長段階、果実、装飾、初回使用時刻"],
              [
                "config.json",
                "ウィンドウ位置、言語、バブルモード、リーダーボードの状態、表示名、地域",
              ],
              ["growth_ledger.json", "日付 × 木 × トークン種別ごとの成長履歴"],
              [
                "usage_ledger.json",
                "集約されたセッションのメタデータ:ログファイルのパス、プロジェクト名、ブランチ、AI タイトル、時刻、モデル、日次トークン合計",
              ],
              [
                "account.json",
                "リーダーボードを有効にした場合のみ:匿名ユーザー ID と Supabase のセッショントークン",
              ],
            ],
          },
        },
        {
          p: "これらのファイルはお使いのマシン上にとどまり、アップロードされることはありません。usage_ledger.json にはファイルパスなどのローカルメタデータが含まれ、同じコンピューターの他のユーザーがあなたのファイルを読める場合には、見られる可能性があります。アプリのデータフォルダーは非公開として扱ってください。account.json は現在、セッショントークンを平文の JSON として保存しています。オペレーティングシステムの認証情報ストアへの移行を予定しています。これらのファイルを削除する(またはアンインストールしてフォルダーを削除する)と、すべてのローカルデータが削除されます。",
        },
      ],
    },
    {
      h: "ネットワーク動作",
      blocks: [
        {
          p: "リーダーボードがオフのとき——これが既定です——Token Forest はネットワークリクエストを一切行いません。成長、バブル、ショップ、カプセルモード、ダッシュボードはすべてオフラインで動作します。費用の見積もりは同梱の価格表を使用し、オンラインでの照会は行いません。",
        },
        {
          p: "ウェブページを開くメニュー項目(例:リーダーボードのウェブサイト)は既定のブラウザーを起動するだけであり、デスクトップアプリ自体がバックグラウンドで何かを送信することはありません。",
        },
      ],
    },
    {
      h: "任意のリーダーボード",
      blocks: [
        {
          p: "リーダーボードは既定でオフです。「オン」を選ぶと、同期される内容を正確に列挙した同意ダイアログが表示されます。あなたが確認するまで、何も送信されません。",
        },
        {
          p: "有効にすると、アプリは Supabase(当社のデータベースプロバイダー)で匿名アカウントを作成し、おおよそ 30 分ごと、および起動・木の切り替え・終了などのタイミングで、次を同期します:",
        },
        {
          table: {
            head: ["項目", "公開表示?"],
            rows: [
              [
                "ランダムな匿名 ID(Supabase が生成。あなたの記録を識別するためだけに使用)",
                "いいえ",
              ],
              ["表示名(空欄の場合は「Anonymous#id」形式の名前を生成)", "はい"],
              ["収集した木のトークン合計", "はい"],
              ["木ごとのトークン合計と成長段階", "はい(木の詳細)"],
              ["地域——あなたが選択した場合のみ", "はい(国旗)"],
              ["現在の木の種類", "はい"],
              ["サーバーが生成する作成/更新のタイムスタンプ", "表示される場合あり"],
            ],
          },
        },
        {
          p: "細目:名前を空欄にすると、生成される匿名名はアプリの言語で表示されるため、リーダーボードにはお使いの UI 言語が間接的に反映されます。",
        },
        {
          p: "いかなるモードでもアップロードしないもの:生ログ、プロンプトや会話内容、ソースコード、セッションタイトル、ファイルパス、プロジェクト名、Git ブランチ、モデル別・セッション別の使用状況、費用の見積もり。",
        },
        {
          p: "あらゆるオンラインサービスと同様に、Supabase のインフラは、サービスの運用と保護のために標準的な接続データ(IP アドレスやリクエストのタイムスタンプなど)を、Supabase 自身のポリシーに従って処理します。",
        },
      ],
    },
    {
      h: "オン · 一時停止 · オフ",
      blocks: [
        {
          list: [
            "オン——定期的に同期します。",
            "一時停止——更新を停止します。最後の記録はボードに残ります。",
            "オフ——同期を停止し、あなたの記録の削除要求を送信します。",
          ],
        },
        {
          p: "ベータの制限事項として率直に述べます:削除要求が失敗した場合(例:オフライン時)、現行ベータはまだ再試行や確認を行いません。オンラインで再度「オフ」に切り替えると再送されます。確認を伴う確実な削除機能は、安定版リリース前に対応予定です。当社に削除を依頼することもできます(「お問い合わせ」を参照)——アプリに表示される匿名名/ID をお知らせください。また、account.json 内のトークンは誰にも送らないでください。",
        },
      ],
    },
    {
      h: "ウェブサイト",
      blocks: [
        {
          p: "本ウェブサイトは、アナリティクス、広告トラッカー、マーケティング Cookie を一切使用しません。ホスティングプロバイダーは、サイトの提供と保護のために標準的なサーバーログ(IP アドレス、ユーザーエージェント、要求されたページ、時刻)を処理します。リーダーボードのページは上記の公開リーダーボードの行を読み取り、閲覧にログインは不要です。将来アナリティクス等のサービスを追加する場合は、本通知を先に更新します。",
        },
      ],
    },
    {
      h: "サービスプロバイダー",
      blocks: [
        {
          p: "当社は、説明した機能のためだけに少数のプロバイダーを利用します:Supabase(匿名認証 + リーダーボードのデータベース)、ウェブサイトのホスト、および GitHub(プロダクトリポジトリ、Issue、リリースのダウンロード)。プロバイダーの所在地域とポリシーへのリンクは、最初の安定版リリース前に本セクションで確定します。",
        },
      ],
    },
    {
      h: "これらの主張の検証",
      blocks: [
        {
          p: "当社は「信じてください」だけでは不十分だと承知しています。ネットワークを完全に無効にしてもアプリは動作します——ぜひお試しください。各リリースは SHA-256 チェックサムと署名ステータスを公開し、リリースノートでプライバシーやネットワークに関する変更を明示します。ソースコードは現在非公開ですが、「ログを読むだけで何もアップロードしない」という主張を独立して監査できるよう、中核となる使用状況リーダーコンポーネントの公開を検討しています。",
        },
      ],
    },
    {
      h: "あなたが行える管理",
      blocks: [
        {
          list: [
            "リーダーボードを有効にせず、アプリを完全にオフラインで使用する。",
            "木のメニューから、いつでもリーダーボードの同期を一時停止または停止する。",
            "表示名と地域を変更または空欄にする。",
            "アプリのデータファイルを削除/アンインストールして、ローカルデータを削除する。",
            "リモートでの削除を確認するために当社に連絡する。",
          ],
        },
      ],
    },
    {
      h: "変更",
      blocks: [
        {
          p: "将来のバージョンが新たなデータ処理(テレメトリ、クラッシュレポート、自動更新チェック、新しいリーダーボード項目)を追加する場合は、そのバージョンの提供前に本通知とアプリ内の同意内容を更新し、リリースノートの「Privacy or network changes」の項目で明示します。",
        },
      ],
    },
    {
      h: "お問い合わせ",
      blocks: [
        {
          code: "発行者:      Poietic Studio\nプライバシー:  contact@tokenforest.com.au(暫定;privacy@tokenforest.com.au は最初の公開リリース前に有効化)\nセキュリティ:  Security ページを参照\nウェブサイト:  https://www.tokenforest.com.au",
        },
      ],
    },
  ],
};

const KO: LegalDoc = {
  title: "Token Forest 개인정보 보호정책",
  meta: [
    "버전 1.0-beta(사전 공개 초안) · 최종 업데이트 2026-07-08 · 최초 공개 릴리스 시 발효",
    "발행자: Poietic Studio",
  ],
  sections: [
    {
      blocks: [
        {
          p: "Token Forest는 Claude Code / OpenAI Codex 사용량을 자라나는 픽셀 나무로 바꿔 주는 데스크톱 앱입니다. 본 정책은 앱이 무엇을 읽고, 무엇을 저장하며, 그리고 사용자가 동의한 경우에만 무엇을 업로드하는지 정확히 설명합니다. 동일한 내용이 공개 제품 저장소에 PRIVACY.md로 게시되어 있으며, 그 git 기록이 본 정책의 공개 변경 이력이 됩니다.",
        },
      ],
    },
    {
      h: "요약",
      blocks: [
        {
          list: [
            "핵심 기능은 전적으로 사용자의 기기에서 실행됩니다. 계정, API 키, 네트워크가 필요 없습니다.",
            "앱에는 텔레메트리, 광고, 오류 보고, 외부로 연결되는 자동 업데이트가 전혀 없습니다.",
            "AI 코딩 도구가 이미 로컬에 기록해 둔 사용 로그를 읽습니다 — 사용자의 소스 코드 파일은 읽지 않습니다.",
            "프롬프트나 대화 내용을 저장하거나 업로드하지 않습니다.",
            "글로벌 리더보드는 선택 기능이며 기본적으로 꺼져 있습니다. 켜지기 전에 동기화될 모든 항목을 나열한 동의 창을 표시합니다. 끄면 사용자의 기록 삭제를 요청합니다.",
            "당사는 개인정보를 판매하지 않습니다. 판매할 것이 애초에 없습니다 — 기본 설정에서는 당사가 어떠한 데이터도 받지 않습니다.",
          ],
        },
      ],
    },
    {
      h: "앱이 로컬에서 읽는 것",
      blocks: [
        { p: "Token Forest는 지원 도구가 로컬에 생성한 사용 로그를 읽습니다:" },
        {
          code: "Claude Code:  ~/.claude/projects/**/*.jsonl\nOpenAI Codex: ~/.codex/sessions/**/rollout-*.jsonl",
        },
        {
          p: "이 로그에서 다음을 사용합니다: 토큰 수(입력 / 출력 / 캐시 읽기 / 캐시 쓰기), 타임스탬프, 출처(Claude 또는 Codex), 모델 식별자, 세션 식별자, 프로젝트 디렉터리 이름, Git 브랜치 이름, AI가 생성한 세션 제목, 그리고 메시지 유형 구조(실제 사용자 발화와 도구 결과를 구분하기 위해서만 사용).",
        },
        {
          p: "로그 한 줄을 파싱할 때 그 전체 내용(프롬프트 텍스트를 포함할 수 있음)이 메모리를 거칩니다. Token Forest는 프롬프트의 의미를 필요로 하지 않으며, 프롬프트나 대화 본문을 자체 데이터 파일에 복사하지도, 업로드하지도 않습니다. 사용자의 소스 코드 파일을 여는 일도 결코 없습니다.",
        },
      ],
    },
    {
      h: "앱이 로컬에 저장하는 것",
      blocks: [
        {
          p: "현재 베타는 데이터 파일을 애플리케이션 옆에 저장합니다. 향후 릴리스에서는 표준 사용자별 디렉터리(Windows: %LOCALAPPDATA%\\TokenForest\\, macOS: ~/Library/Application Support/TokenForest/)로 자동 마이그레이션하여 이동합니다.",
        },
        {
          table: {
            head: ["파일", "내용"],
            rows: [
              ["garden.json", "나무별 토큰, 성장 단계, 열매, 장식, 최초 사용 시각"],
              ["config.json", "창 위치, 언어, 버블 모드, 리더보드 상태, 표시 이름, 지역"],
              ["growth_ledger.json", "날짜 × 나무 × 토큰 유형별 성장 기록"],
              [
                "usage_ledger.json",
                "집계된 세션 메타데이터: 로그 파일 경로, 프로젝트 이름, 브랜치, AI 제목, 시각, 모델, 일별 토큰 합계",
              ],
              ["account.json", "리더보드를 활성화한 경우에만: 익명 사용자 ID와 Supabase 세션 토큰"],
            ],
          },
        },
        {
          p: "이 파일들은 사용자의 기기에 남아 있으며 업로드되지 않습니다. usage_ledger.json에는 파일 경로와 같은 로컬 메타데이터가 포함되어 있어, 같은 컴퓨터의 다른 사용자가 사용자의 파일을 읽을 수 있다면 볼 수 있습니다. 앱의 데이터 폴더는 비공개로 취급하십시오. account.json은 현재 세션 토큰을 일반 JSON으로 저장합니다. 운영 체제의 자격 증명 저장소로 옮기는 것을 계획하고 있습니다. 이 파일들을 삭제하면(또는 제거 후 폴더를 삭제하면) 모든 로컬 데이터가 삭제됩니다.",
        },
      ],
    },
    {
      h: "네트워크 동작",
      blocks: [
        {
          p: "리더보드가 꺼져 있을 때 — 기본값입니다 — Token Forest는 어떠한 네트워크 요청도 하지 않습니다. 성장, 버블, 상점, 캡슐 모드, 대시보드는 모두 오프라인에서 작동합니다. 비용 추정은 내장된 가격표를 사용하며, 온라인으로 조회하지 않습니다.",
        },
        {
          p: "웹 페이지를 여는 메뉴 항목(예: 리더보드 웹사이트)은 기본 브라우저를 실행할 뿐이며, 데스크톱 앱 자체가 백그라운드에서 무언가를 전송하지 않습니다.",
        },
      ],
    },
    {
      h: "선택형 리더보드",
      blocks: [
        {
          p: "리더보드는 기본적으로 꺼져 있습니다. 「켜기」를 선택하면 동기화될 내용을 정확히 나열한 동의 창이 표시됩니다. 사용자가 확인하기 전에는 아무것도 전송되지 않습니다.",
        },
        {
          p: "활성화하면 앱은 Supabase(당사의 데이터베이스 제공업체)에 익명 계정을 만들고, 약 30분마다 그리고 시작·나무 전환·종료 등의 시점에 다음을 동기화합니다:",
        },
        {
          table: {
            head: ["항목", "공개 표시?"],
            rows: [
              ["무작위 익명 ID(Supabase가 생성; 사용자의 기록을 식별하는 데만 사용)", "아니요"],
              ["표시 이름(비우면 「Anonymous#id」 형식의 이름 생성)", "예"],
              ["수집한 나무 토큰 합계", "예"],
              ["나무별 토큰 합계와 성장 단계", "예(나무 상세)"],
              ["지역 — 사용자가 선택한 경우에만", "예(국기)"],
              ["현재 나무 종류", "예"],
              ["서버가 생성한 생성/수정 타임스탬프", "표시될 수 있음"],
            ],
          },
        },
        {
          p: "세부 사항: 이름을 비우면 생성되는 익명 이름이 앱 언어로 표시되므로, 리더보드에 사용자의 UI 언어가 간접적으로 반영됩니다.",
        },
        {
          p: "어떤 모드에서도 업로드하지 않는 것: 원본 로그, 프롬프트나 대화 내용, 소스 코드, 세션 제목, 파일 경로, 프로젝트 이름, Git 브랜치, 모델별·세션별 사용량, 비용 추정.",
        },
        {
          p: "다른 온라인 서비스와 마찬가지로, Supabase의 인프라는 서비스를 운영하고 보호하기 위해 표준 연결 데이터(IP 주소, 요청 타임스탬프 등)를 Supabase 자체 정책에 따라 처리합니다.",
        },
      ],
    },
    {
      h: "켜기 · 일시정지 · 끄기",
      blocks: [
        {
          list: [
            "켜기 — 주기적으로 동기화합니다.",
            "일시정지 — 업데이트를 중단하며, 마지막 기록은 보드에 남습니다.",
            "끄기 — 동기화를 중단하고 사용자의 기록 삭제 요청을 보냅니다.",
          ],
        },
        {
          p: "베타 제한 사항을 솔직히 밝힙니다: 삭제 요청이 실패하면(예: 오프라인 상태), 현재 베타는 아직 재시도하거나 확인하지 않습니다. 온라인 상태에서 다시 「끄기」로 전환하면 재전송됩니다. 확인을 동반한 안정적인 삭제 기능은 정식 릴리스 전에 제공될 예정입니다. 당사에 삭제를 요청할 수도 있습니다(「문의」 참조) — 앱에 표시되는 익명 이름/ID를 알려 주십시오. 그리고 account.json의 토큰은 누구에게도 보내지 마십시오.",
        },
      ],
    },
    {
      h: "웹사이트",
      blocks: [
        {
          p: "본 웹사이트는 분석 도구, 광고 추적기, 마케팅 쿠키를 일절 사용하지 않습니다. 호스팅 제공업체는 사이트를 제공하고 보호하기 위해 표준 서버 로그(IP 주소, 사용자 에이전트, 요청한 페이지, 시각)를 처리합니다. 리더보드 페이지는 위에서 설명한 공개 리더보드 행을 읽으며, 열람에 로그인이 필요 없습니다. 향후 분석 등의 서비스를 추가할 경우 본 정책을 먼저 업데이트합니다.",
        },
      ],
    },
    {
      h: "서비스 제공업체",
      blocks: [
        {
          p: "당사는 설명한 기능을 위해서만 소수의 제공업체를 이용합니다: Supabase(익명 인증 + 리더보드 데이터베이스), 웹사이트 호스트, 그리고 GitHub(제품 저장소, 이슈, 릴리스 다운로드). 제공업체의 소재 지역과 정책 링크는 최초 정식 릴리스 전에 본 섹션에서 확정합니다.",
        },
      ],
    },
    {
      h: "이 주장의 검증",
      blocks: [
        {
          p: "당사는 「믿어 달라」는 말만으로는 충분하지 않다는 것을 잘 알고 있습니다. 네트워크를 완전히 비활성화해도 앱은 작동합니다 — 직접 시험해 보십시오. 각 릴리스는 SHA-256 체크섬과 서명 상태를 공개하며, 릴리스 노트에 개인정보나 네트워크 관련 변경 사항을 명시합니다. 소스 코드는 현재 비공개이지만, 「로그만 읽고 아무것도 업로드하지 않는다」는 주장을 독립적으로 감사할 수 있도록 핵심 사용량 리더 구성 요소의 공개를 검토하고 있습니다.",
        },
      ],
    },
    {
      h: "사용자의 관리 권한",
      blocks: [
        {
          list: [
            "리더보드를 활성화하지 않고 앱을 완전히 오프라인으로 사용합니다.",
            "나무 메뉴에서 언제든지 리더보드 동기화를 일시정지하거나 끕니다.",
            "표시 이름과 지역을 변경하거나 비웁니다.",
            "앱의 데이터 파일을 삭제/제거하여 로컬 데이터를 삭제합니다.",
            "원격 삭제를 확인하기 위해 당사에 문의합니다.",
          ],
        },
      ],
    },
    {
      h: "변경",
      blocks: [
        {
          p: "향후 버전이 새로운 데이터 처리(텔레메트리, 오류 보고, 자동 업데이트 확인, 새 리더보드 항목)를 추가하는 경우, 해당 버전을 제공하기 전에 본 정책과 앱 내 동의 내용을 업데이트하고, 릴리스 노트의 「Privacy or network changes」 항목에서 명시합니다.",
        },
      ],
    },
    {
      h: "문의",
      blocks: [
        {
          code: "발행자:      Poietic Studio\n개인정보:    contact@tokenforest.com.au(임시; privacy@tokenforest.com.au는 최초 공개 릴리스 전 활성화)\n보안:        Security 페이지 참조\n웹사이트:    https://www.tokenforest.com.au",
        },
      ],
    },
  ],
};

const NOTE: Partial<Record<Locale, string>> = {
  zh: "本页为英文版《隐私声明》的中文翻译,便于阅读。如中英文之间存在任何歧义,以英文版为准。",
  ja: "本ページは英語版《プライバシー通知》の日本語訳(参考)です。日本語版と英語版との間に相違がある場合は、英語版が優先します。",
  ko: "본 페이지는 영문 《개인정보 보호정책》의 한국어 번역본(참고용)입니다. 한국어판과 영문판 사이에 차이가 있는 경우 영문판이 우선합니다.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localizedMetadata("/privacy", locale as Locale);
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const byLocale: Partial<Record<Locale, LegalDoc>> = { zh: ZH, ja: JA, ko: KO };
  const doc = byLocale[locale as Locale] ?? EN;
  return <LegalDocView doc={doc} note={NOTE[locale as Locale]} />;
}
