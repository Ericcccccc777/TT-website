import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

// ── Site identity ─────────────────────────────────────────────────────────────

/**
 * Canonical origin for every absolute URL the site emits (canonical tags,
 * hreflang, sitemap, JSON-LD, OG image). Driven by NEXT_PUBLIC_SITE_URL so
 * preview deploys can point at their own host; falls back to the production
 * domain. Trailing slash stripped so concatenation is always safe.
 */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "https://www.tokenforest.com.au"
  );
}

/** Canonical entity name — always the space form in metadata/JSON-LD/prose. */
export const SITE_NAME = "Token Forest";
/** Aliases so the hyphen wordmark + one-word forms resolve to one entity. */
export const SITE_ALTERNATE_NAMES = ["Token-Forest", "TokenForest"] as const;
/** The only real external identifier we can cite as sameAs. */
export const GITHUB_URL = "https://github.com/Ericcccccc777/Poietic-TokenForest";

/** next-intl uses short locale codes; map them to BCP-47 for hreflang keys. */
export const BCP47: Record<Locale, string> = {
  en: "en",
  zh: "zh-CN",
  ja: "ja",
  ko: "ko",
};

/** Open Graph locale codes (og:locale / og:locale:alternate). */
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  zh: "zh_CN",
  ja: "ja_JP",
  ko: "ko_KR",
};

/**
 * Site-wide social share image, served by app/opengraph-image.tsx at the app
 * root (locale-free URL). Stored absolute so it works in openGraph, twitter,
 * AND JSON-LD (schema.org needs absolute URLs). It MUST be set explicitly on
 * any page/helper that defines its own `openGraph`, because an explicit
 * openGraph block suppresses Next's automatic file-convention og:image.
 */
export const OG_IMAGE = {
  url: `${siteUrl()}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: "Token Forest — grow a pixel tree from your Claude Code & Codex tokens",
  type: "image/png",
} as const;

// ── Demo video ────────────────────────────────────────────────────────────────

/**
 * The product demo video. Facts (title, duration, upload date) are copied
 * verbatim from YouTube — schema.org VideoObject must describe the canonical
 * video, not a paraphrase of it, or the markup is a policy violation.
 *
 * `thumbnail` is deliberately self-hosted rather than pointing at i.ytimg.com:
 * that host is unreachable on some networks, and a broken thumbnail would leave
 * a hole where the video block should be. The player itself is only reachable
 * where YouTube is, which we accept.
 *
 * `embedUrl` uses youtube-nocookie.com, and the facade in components/
 * video-facade.tsx mounts it only after a click — so a visitor who never plays
 * the video never touches a YouTube server.
 */
export const DEMO_VIDEO = {
  id: "I_qqApJl_Bo",
  title: "Token Forest | I turned my AI coding tokens into a living pixel forest",
  watchUrl: "https://www.youtube.com/watch?v=I_qqApJl_Bo",
  embedUrl: "https://www.youtube-nocookie.com/embed/I_qqApJl_Bo",
  thumbnail: "/token-forest-demo.jpg",
  thumbnailWidth: 1280,
  thumbnailHeight: 720,
  uploadDate: "2026-07-09T22:52:33-07:00",
  /** ISO 8601 duration — 109 seconds. */
  duration: "PT1M49S",
  durationLabel: "1:49",
  /** The video's spoken/on-screen language. One cut serves all four locales. */
  inLanguage: "en",
} as const;

/** VideoObject description, per locale. English is the guaranteed fallback. */
export const DEMO_VIDEO_DESCRIPTION: Record<Locale, string> = {
  en: "A short demo of Token Forest: a pixel companion that sits above your taskbar and turns every Claude Code and Codex request into an energy bubble. Collect the bubbles and your tree grows, stage by stage, from a sprout into a fruit-bearing tree.",
  zh: "Token Forest 简短演示:一只停在任务栏上方的像素桌宠,把你在 Claude Code 和 Codex 上的每一次请求变成能量气泡。收集气泡,你的树就会一阶一阶长大,从幼苗长成结果的大树。",
  ja: "Token Forest の短いデモ。タスクバーの上に住むピクセルの相棒が、Claude Code と Codex のリクエストをエネルギーバブルに変えます。バブルを集めると、木は芽から実をつける大木へと段階的に成長します。",
  ko: "Token Forest 짧은 데모. 작업 표시줄 위에 사는 픽셀 친구가 Claude Code와 Codex 요청을 에너지 방울로 바꿉니다. 방울을 모으면 나무가 새싹에서 열매 맺는 나무로 단계별로 자랍니다.",
};

// ── URL helpers ───────────────────────────────────────────────────────────────

/** Normalize a logical path: "/" → "", "/x" stays, "x" → "/x". */
function normalizePath(path: string): string {
  if (path === "/" || path === "") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

/** Absolute, locale-prefixed URL for a logical path (e.g. "/", "/faq"). */
export function localizedUrl(path: string, locale: Locale): string {
  return `${siteUrl()}/${locale}${normalizePath(path)}`;
}

/**
 * hreflang map for `alternates.languages` and the sitemap. Absolute URLs, keyed
 * by BCP-47, plus x-default → the English URL. Works in both page metadata
 * (Next accepts absolute) and MetadataRoute.Sitemap (which requires absolute).
 */
export function localizedAlternates(path: string): Record<string, string> {
  const p = normalizePath(path);
  const base = siteUrl();
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[BCP47[locale]] = `${base}/${locale}${p}`;
  }
  languages["x-default"] = `${base}/${routing.defaultLocale}${p}`;
  return languages;
}

// ── Per-route SEO copy ────────────────────────────────────────────────────────

export type SeoCopy = { title: string; description: string; keywords?: string[] };

/**
 * SEO copy source of truth, keyed by logical path. Developer-owned, English-
 * first: every path MUST have an `en` entry (the guaranteed fallback). Kept as
 * a typed record rather than the next-intl `Metadata` namespace because the
 * sitemap/robots/og/manifest/llms routes run outside request scope where
 * `getTranslations` is unavailable, and because this gives compile-time
 * coverage. Localized titles/descriptions for the three existing pages are
 * carried over from the message files so nothing regresses.
 */
export const SEO_COPY: Record<string, Partial<Record<Locale, SeoCopy>>> = {
  "/": {
    en: {
      title: "Token Forest — grow a pixel tree from your Claude Code tokens",
      description:
        "Token Forest is a cozy pixel-art desktop pet for Windows and macOS that grows a tree from the Claude Code and Codex tokens you spend. Local-first and offline — it reads only token counts, never your code. Free public beta.",
      keywords: [
        "Token Forest",
        "Claude Code token usage tracker",
        "Codex token tracker",
        "desktop pet for developers",
        "AI token visualizer",
        "Claude Code usage monitor",
      ],
    },
    zh: {
      title: "Token Forest — 让你的 Claude Code 和 Codex token 长成一棵树",
      description:
        "Token Forest 是一款 Windows 和 macOS 上的像素桌宠：你用 Claude Code 和 Codex 花掉的 token，会在桌面上长成一棵树。本地优先、离线运行，只读取 token 计数，从不读取你的代码。免费公测中。",
    },
    ja: {
      title: "Token Forest — Claude Code と Codex のトークンを木に育てよう",
      description:
        "Token Forest は Windows と macOS 向けのピクセルデスクトップペット。Claude Code や Codex で使ったトークンがデスクトップで木に育ちます。ローカル優先・オフラインで、コードではなくトークン数だけを読み取ります。無料公開ベータ。",
    },
    ko: {
      title: "Token Forest — Claude Code와 Codex 토큰을 나무로 키우세요",
      description:
        "Token Forest는 Windows와 macOS용 픽셀 데스크톱 펫입니다. Claude Code와 Codex로 사용한 토큰이 바탕화면에서 나무로 자랍니다. 로컬 우선·오프라인으로 코드가 아닌 토큰 수만 읽습니다. 무료 공개 베타.",
    },
  },
  "/download": {
    en: {
      title: "Download Token Forest — Windows & macOS, free",
      description:
        "Download Token Forest for Windows and macOS. A free desktop pet that grows a pixel tree from your Claude Code and Codex token usage — local, offline, privacy-first. Free download, no account needed.",
      keywords: [
        "download Token Forest",
        "Claude Code token tracker download",
        "Codex usage monitor Windows macOS",
      ],
    },
    zh: {
      title: "下载 Token Forest — Windows 与 macOS,免费",
      description:
        "在 Windows 和 macOS 上下载 Token Forest。一款免费桌宠,把你的 Claude Code 和 Codex token 用量长成一棵像素树——本地、离线、隐私优先。免费下载,无需账号。",
    },
    ja: {
      title: "Token Forest をダウンロード — Windows と macOS、無料",
      description:
        "Windows と macOS で Token Forest をダウンロード。Claude Code と Codex のトークン使用量からピクセルツリーを育てる無料のデスクトップペット。ローカル・オフライン・プライバシー優先。無料ダウンロード、アカウント不要。",
    },
    ko: {
      title: "Token Forest 다운로드 — Windows 및 macOS, 무료",
      description:
        "Windows와 macOS에서 Token Forest를 다운로드하세요. Claude Code와 Codex 토큰 사용량으로 픽셀 나무를 키우는 무료 데스크톱 펫 — 로컬, 오프라인, 프라이버시 우선. 무료 다운로드, 계정 불필요.",
    },
  },
  "/privacy": {
    en: {
      title: "Privacy Notice — Token Forest",
      description:
        "Exactly what Token Forest reads, stores and (only if you opt in) uploads. Local-first, no telemetry; the optional leaderboard is off by default and fully disclosed.",
    },
    zh: {
      title: "隐私声明 — Token Forest",
      description:
        "Token Forest 会读取什么、保存什么、以及仅在你主动开启后上传什么。本地优先、无遥测;可选排行榜默认关闭并完整披露字段。",
    },
    ja: {
      title: "プライバシー通知 — Token Forest",
      description:
        "Token Forest が読み取り・保存し、オプトイン時のみアップロードする内容の完全な説明。ローカル優先・テレメトリなし。",
    },
    ko: {
      title: "개인정보 보호정책 — Token Forest",
      description:
        "Token Forest가 읽고 저장하며, 옵트인 시에만 업로드하는 내용의 전체 설명. 로컬 우선·텔레메트리 없음.",
    },
  },
  "/security": {
    en: {
      title: "Security Policy — Token Forest",
      description:
        "How to privately report a Token Forest vulnerability, what is in scope, and how we respond and publish fixes.",
    },
    zh: {
      title: "安全政策 — Token Forest",
      description: "如何私下报告 Token Forest 安全漏洞、报告范围,以及我们的响应与修复发布流程。",
    },
    ja: {
      title: "セキュリティポリシー — Token Forest",
      description: "Token Forest の脆弱性を非公開で報告する方法、対象範囲、対応と修正の公開手順。",
    },
    ko: {
      title: "보안 정책 — Token Forest",
      description:
        "Token Forest 취약점을 비공개로 보고하는 방법, 보고 범위, 대응 및 수정 공개 절차.",
    },
  },
  "/terms": {
    en: {
      title: "End User License Agreement (EULA) — Token Forest",
      description:
        "The Token Forest End User License Agreement: your license to use the app and the optional leaderboard service, the warranty disclaimer, and the limitation of liability.",
    },
    zh: {
      title: "最终用户许可协议(EULA) — Token Forest",
      description:
        "Token Forest 最终用户许可协议:你使用本应用与可选排行榜服务的授权、免责声明与责任限制。",
    },
    ja: {
      title: "エンドユーザーライセンス契約(EULA) — Token Forest",
      description:
        "Token Forest エンドユーザーライセンス契約:本アプリおよび任意のリーダーボードサービスの使用許諾、保証の否認、責任の制限。",
    },
    ko: {
      title: "최종 사용자 라이선스 계약(EULA) — Token Forest",
      description:
        "Token Forest 최종 사용자 라이선스 계약: 앱 및 선택형 리더보드 서비스 사용 라이선스, 보증 부인, 책임 제한.",
    },
  },
  "/leaderboard": {
    en: {
      title: "Token Forest Global Leaderboard",
      description:
        "See the biggest Token Forest trees worldwide. Grow the mightiest tree from the Claude Code and Codex tokens you spend and climb the opt-in global leaderboard.",
      keywords: ["Token Forest leaderboard", "Claude Code token leaderboard"],
    },
    zh: {
      title: "Token Forest 全球排行榜",
      description:
        "看看全球最大的 Token Forest 树。用你在 Claude Code 和 Codex 上花掉的 token 培育最强的树,登上自愿加入的全球排行榜。",
    },
    ja: {
      title: "Token Forest グローバルランキング",
      description:
        "世界中で最も大きな Token Forest の木をチェック。Claude Code と Codex で使ったトークンで最強の木を育て、任意参加のグローバルランキングを駆け上がろう。",
    },
    ko: {
      title: "Token Forest 글로벌 리더보드",
      description:
        "전 세계에서 가장 큰 Token Forest 나무를 확인하세요. Claude Code와 Codex로 사용한 토큰으로 가장 강한 나무를 키우고 선택적 참여 글로벌 리더보드에 오르세요.",
    },
  },
  "/dashboard": {
    en: {
      title: "Token Forest Dashboard — Claude Code & Codex usage and cost",
      description:
        "See your Claude Code and Codex token usage with an offline cost estimate — growth, per-model usage, a 26-week heatmap, and per-conversation billing, all computed locally and never uploaded.",
      keywords: [
        "Claude Code cost dashboard",
        "Claude Code token usage dashboard",
        "Codex usage dashboard",
        "AI coding cost tracker",
      ],
    },
    zh: {
      title: "Token Forest 数据面板 — 你的 Claude Code 和 Codex token 用量与花费",
      description:
        "在数据面板里查看 Claude Code 和 Codex 的 token 用量与离线成本估算——成长曲线、按模型用量、26 周热力图、按对话账单,全部本地计算,绝不上传。",
    },
    ja: {
      title: "Token Forest ダッシュボード — Claude Code と Codex のトークン使用量とコスト",
      description:
        "Claude Code と Codex のトークン使用量とオフラインのコスト見積もりを確認。成長曲線・モデル別使用量・26 週間ヒートマップ・会話ごとの明細を、すべてローカルで計算し、アップロードしません。",
    },
    ko: {
      title: "Token Forest 대시보드 — Claude Code와 Codex 토큰 사용량 및 비용",
      description:
        "Claude Code와 Codex의 토큰 사용량과 오프라인 비용 추정치를 확인하세요. 성장 곡선·모델별 사용량·26주 히트맵·대화별 명세를 모두 로컬에서 계산하며 업로드하지 않습니다.",
    },
  },
  "/ccusage-alternative": {
    en: {
      title: "ccusage Alternative — a Visual GUI Desktop App | Token Forest",
      description:
        "Looking for a ccusage GUI? Token Forest is a free desktop alternative that reads the same Claude Code & Codex logs, with a pixel pet and a full offline dashboard.",
      keywords: [
        "ccusage alternative",
        "ccusage gui",
        "ccusage desktop app",
        "claude code usage tracker",
        "ccusage vs",
        "token forest",
      ],
    },
    zh: {
      title: "ccusage 替代方案：可视化 GUI 桌面应用 | Token Forest",
      description:
        "在找 ccusage 的图形界面？Token Forest 是免费的桌面替代方案，读取同样的 Claude Code 与 Codex 日志，带像素宠物和离线仪表盘。",
      keywords: [
        "ccusage 替代",
        "ccusage gui",
        "ccusage 桌面应用",
        "claude code 用量统计",
        "ccusage 对比",
        "token forest",
      ],
    },
    ja: {
      title: "ccusage の代替 — ビジュアル GUI アプリ | Token Forest",
      description:
        "ccusage の GUI をお探しですか。Token Forest は同じ Claude Code・Codex ログを読む無料のデスクトップ代替。ピクセルのペットとオフラインのダッシュボード付き。",
      keywords: [
        "ccusage 代替",
        "ccusage gui",
        "ccusage デスクトップアプリ",
        "claude code 使用量",
        "ccusage 比較",
        "token forest",
      ],
    },
    ko: {
      title: "ccusage 대안: 시각적 GUI 데스크톱 앱 | Token Forest",
      description:
        "ccusage GUI를 찾고 있나요? Token Forest는 같은 Claude Code·Codex 로그를 읽는 무료 데스크톱 대안으로, 픽셀 펫과 오프라인 대시보드를 제공합니다.",
      keywords: [
        "ccusage 대안",
        "ccusage gui",
        "ccusage 데스크톱 앱",
        "claude code 사용량 추적",
        "ccusage 비교",
        "token forest",
      ],
    },
  },
  "/claude-code-usage-limits": {
    en: {
      title: "Claude Code Usage Limits Explained (Pro & Max) | Token Forest",
      description:
        "How Claude Code usage limits work — the rolling 5-hour session window, weekly caps, Pro vs Max 5x/20x, when limits reset, and how to track your burn rate so you're never caught mid-task.",
      keywords: [
        "claude code usage limit",
        "claude code rate limit",
        "claude code weekly limit",
        "am i hitting my claude code limit",
        "claude max usage limit",
        "claude code limit reset",
      ],
    },
    zh: {
      title: "Claude Code 使用上限详解（Pro 与 Max）| Token Forest",
      description:
        "详解 Claude Code 使用上限：滚动 5 小时会话窗口、每周额度、Pro 与 Max 5x/20x 的区别、限额何时重置，以及如何盯住消耗速度，避免写到一半被限流。",
      keywords: [
        "claude code 使用上限",
        "claude code 限额",
        "claude code 每周上限",
        "claude max 使用限制",
        "claude code 限额重置",
        "claude code rate limit",
      ],
    },
    ja: {
      title: "Claude Code の使用上限を解説（Pro・Max）| Token Forest",
      description:
        "Claude Code の使用上限を解説。ローリング 5 時間セッション、週次上限、Pro と Max 5x/20x の違い、上限リセットのタイミング、そして消費ペースを追って作業中の制限を防ぐ方法まで。",
      keywords: [
        "claude code 使用上限",
        "claude code レート制限",
        "claude code 週次上限",
        "claude max 上限",
        "claude code 上限 リセット",
        "claude code limit",
      ],
    },
    ko: {
      title: "Claude Code 사용 한도 정리 (Pro·Max) | Token Forest",
      description:
        "Claude Code 사용 한도를 정리했습니다. 롤링 5시간 세션, 주간 한도, Pro와 Max 5x/20x의 차이, 한도 초기화 시점, 그리고 소모 속도를 추적해 작업 중 제한을 피하는 방법까지.",
      keywords: [
        "claude code 사용 한도",
        "claude code 속도 제한",
        "claude code 주간 한도",
        "claude max 사용 제한",
        "claude code 한도 초기화",
        "claude code rate limit",
      ],
    },
  },
  "/claude-code-cost": {
    en: {
      title: "Claude Code Cost: Token Pricing Explained (2026)",
      description:
        "How much does Claude Code cost? A plain-English guide to token pricing, cache reads, Opus vs Sonnet vs Haiku, and subscription vs API — plus how to see your real cost.",
      keywords: [
        "claude code cost",
        "claude code pricing",
        "how much does claude code cost",
        "claude code token cost",
        "claude code cost per token",
        "is claude code expensive",
        "claude code api pricing",
        "token forest",
      ],
    },
    zh: {
      title: "Claude Code 费用详解:Token 计价(2026)",
      description:
        "Claude Code 到底多少钱?一份大白话指南:四类 token 计价、缓存读取、Opus/Sonnet/Haiku 对比、订阅 vs API——以及如何在本地离线看到你的真实花费。",
      keywords: [
        "claude code 费用",
        "claude code 价格",
        "claude code 多少钱",
        "claude code token 费用",
        "claude code 每个token价格",
        "claude code 贵吗",
        "token forest",
      ],
    },
    ja: {
      title: "Claude Code の料金:トークン課金を解説(2026)",
      description:
        "Claude Code はいくら? 4 種類のトークン課金、キャッシュ読み取り、Opus/Sonnet/Haiku、サブスク対 API を平易に解説。自分の実コストの見方も紹介します。",
      keywords: [
        "claude code 料金",
        "claude code 費用",
        "claude code いくら",
        "claude code トークン 料金",
        "claude code 価格",
        "claude code 高い",
        "token forest",
      ],
    },
    ko: {
      title: "Claude Code 비용: 토큰 요금 정리 (2026)",
      description:
        "Claude Code는 얼마? 네 가지 토큰 요금, 캐시 읽기, Opus/Sonnet/Haiku, 구독 vs API를 쉬운 말로 정리하고 내 실제 비용 확인법까지 안내합니다.",
      keywords: [
        "claude code 비용",
        "claude code 요금",
        "claude code 가격",
        "claude code 토큰 비용",
        "claude code 토큰당 비용",
        "claude code 비싼가",
        "token forest",
      ],
    },
  },
  "/track-claude-code-usage": {
    en: {
      title: "How to Track Claude Code & Codex Token Usage",
      description:
        "A step-by-step guide to where Claude Code and Codex store your token usage logs, what's inside them, and how to read your usage and cost — all offline.",
      keywords: [
        "how to track claude code token usage",
        "where does claude code store usage logs",
        "how to see claude code costs",
        "how to monitor codex usage",
        "track claude code usage",
      ],
    },
    zh: {
      title: "如何追踪 Claude Code 与 Codex Token 用量",
      description:
        "手把手教你找到 Claude Code 与 Codex 的本地用量日志、看懂里面的内容，并完全离线地查看你的 token 用量与成本估算。",
      keywords: [
        "如何追踪 claude code token 用量",
        "claude code 日志在哪里",
        "查看 claude code 花费",
        "监控 codex 用量",
        "追踪 claude code 用量",
      ],
    },
    ja: {
      title: "Claude Code と Codex のトークン使用量を追跡する方法",
      description:
        "Claude Code と Codex のローカル使用ログの場所と中身、そして使用量とコストをオフラインで確認する手順を、ステップごとに解説します。",
      keywords: [
        "claude code トークン使用量 追跡",
        "claude code ログ 場所",
        "claude code コスト 確認",
        "codex 使用量 監視",
        "claude code 使用量",
      ],
    },
    ko: {
      title: "Claude Code·Codex 토큰 사용량 추적 방법",
      description:
        "Claude Code와 Codex의 로컬 사용 로그 위치와 내용, 그리고 사용량과 비용을 오프라인으로 확인하는 방법을 단계별로 안내합니다.",
      keywords: [
        "claude code 토큰 사용량 추적",
        "claude code 로그 위치",
        "claude code 비용 확인",
        "codex 사용량 모니터링",
        "claude code 사용량",
      ],
    },
  },
};

/** Resolve copy for a path+locale, falling back to English. */
export function seoCopy(path: string, locale: Locale): SeoCopy {
  const byLocale = SEO_COPY[path];
  return byLocale?.[locale] ?? byLocale?.en ?? { title: SITE_NAME, description: "" };
}

// ── The metadata engine ───────────────────────────────────────────────────────

/**
 * Build a page's `Metadata` from SEO_COPY: absolute title (so the layout's
 * "%s | Token Forest" template does not double-brand), description, keywords,
 * self-referential canonical, full hreflang set (+ x-default), and localized
 * OpenGraph/Twitter that always re-include OG_IMAGE (a page-level openGraph
 * block otherwise suppresses the file-convention image).
 */
export function localizedMetadata(path: string, locale: Locale): Metadata {
  const copy = seoCopy(path, locale);
  const canonical = localizedUrl(path, locale);
  const alternateLocales = routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]);

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: {
      canonical,
      languages: localizedAlternates(path),
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      locale: OG_LOCALE[locale],
      alternateLocale: alternateLocales,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [OG_IMAGE.url],
    },
  };
}
