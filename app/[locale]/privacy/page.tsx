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
        { p: "默认关闭。选择「开启」会先弹出同意确认,列出将同步的全部字段;确认前不会发送任何内容。" },
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

const NOTE: Partial<Record<Locale, string>> = {
  ja: "このプライバシー通知は現在、英語と中国語で提供されています。以下は英語版(正文)です。",
  ko: "이 개인정보 보호정책은 현재 영어와 중국어로 제공됩니다. 아래는 영어 원문입니다.",
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
  const doc = locale === "zh" ? ZH : EN;
  return <LegalDocView doc={doc} note={NOTE[locale as Locale]} />;
}
