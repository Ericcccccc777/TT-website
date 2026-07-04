# SEO + GEO — implementation notes & change log

Working notebook for the SEO/GEO foundation. Plain-language product view lives in
`docs/features/seo-geo.md`. Full architecture: the approved plan at
`~/.claude/plans/vectorized-juggling-wozniak.md`.

## Scope shipped (PR 1 — technical foundation)

The clean-slate technical SEO/GEO plumbing. No new visible content pages yet
(those are PR 2+). Everything composes from `NEXT_PUBLIC_SITE_URL`
(fallback `https://tokenforest.com.au`), so URLs are correct the moment DNS flips.

## Change list (by commit)

**`838ca91` feat(seo): metadata engine + JSON-LD schema builders**

- `lib/seo.ts` (new): `siteUrl()`; `SITE_NAME="Token Forest"` (+ alternates
  `Token-Forest`, `TokenForest`); `GITHUB_URL`; `BCP47` map (`en, zh→zh-CN, ja,
ko`); `OG_LOCALE` map (`en_US/zh_CN/ja_JP/ko_KR`); absolute `OG_IMAGE`;
  `localizedAlternates(path)` → full hreflang set + `x-default`; `SEO_COPY`
  record (per-route title/description/keywords, English-first fallback, seeded
  with the existing localized home/download/leaderboard titles + new
  descriptions); `localizedMetadata(path, locale)` engine (absolute title,
  self-canonical, hreflang, localized OpenGraph/Twitter).
- `lib/schema.ts` (new): pure JSON-LD builders — `homeGraph` (WebSite +
  Organization + SoftwareApplication `@graph`), `softwareApplication`,
  `breadcrumbList`, `faqPage`, `techArticle`. Deliberately **no**
  `aggregateRating`/`review` (no real reviews) and **no** `softwareVersion`
  (installers unshipped).
- `components/json-ld.tsx` (new): `HomeJsonLd`, `SoftwareAppJsonLd`,
  `BreadcrumbJsonLd`, `FaqJsonLd`, `ArticleJsonLd` — server components emitting
  inline `<script type="application/ld+json">`.

**`d7afa4d` feat(seo): metadataBase, title template, canonical + hreflang across pages**

- `app/layout.tsx`: added `metadata.metadataBase` (site-wide, so the 404 and
  non-locale routes resolve social/canonical against the real origin).
- `app/[locale]/layout.tsx`: `generateMetadata` reduced to site-wide defaults
  (title template `%s | Token Forest`, default OG/Twitter + OG image,
  `verification` from `GOOGLE_SITE_VERIFICATION`/`BING_SITE_VERIFICATION`);
  removed the old home-oriented metadata + unused `getTranslations` import;
  injected the gated Plausible `<Script>` in `<body>`.
- `app/[locale]/page.tsx`: added `generateMetadata → localizedMetadata("/")`
  and `<HomeJsonLd>`.
- `app/[locale]/download/page.tsx`: `localizedMetadata("/download")` +
  `<SoftwareAppJsonLd>` + `<BreadcrumbJsonLd>` (Home → Download).
- `app/[locale]/leaderboard/page.tsx`: `localizedMetadata("/leaderboard")` +
  `<BreadcrumbJsonLd>` (Home → Leaderboard).

**`108c583` feat(seo): sitemap, robots, OG image, manifest, icons**

- `app/sitemap.ts` (new): per-locale URLs for `/`, `/download`, `/leaderboard`,
  each with the full hreflang `alternates.languages`.
- `app/robots.ts` (new): `*` allow / disallow `api,_next,_vercel`, plus explicit
  allow blocks for 15 AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User,
  ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Perplexity-User,
  Google-Extended, CCBot, Applebot-Extended, Bytespider, Amazonbot, cohere-ai,
  Meta-ExternalAgent); sitemap + host.
- `app/opengraph-image.tsx` (new): 1200×630 `next/og` card — `AppleTree_8.png`
  embedded as base64, parchment/sky/ground palette, wordmark + tagline + caption.
- `app/twitter-image.tsx` (new): reuses the OG render fn (config declared as
  static literals — Next can't parse re-exported route config).
- `app/manifest.ts` (new): PWA-lite, `start_url:"/en"`, parchment/leaf colors.
- `app/apple-icon.tsx` (new): 180×180 `next/og` touch icon.
- `middleware.ts`: matcher now also excludes `opengraph-image|twitter-image|
apple-icon|icon` — these are **extensionless**, so without the exclusion the
  i18n middleware 307-redirected them and the images broke. (This was the one
  real bug found in verification.)

**`187f8d4` feat(geo): dynamic llms.txt + llms-full.txt**

- `app/llms.txt/route.ts` + `app/llms-full.txt/route.ts` (new): plain-text
  product descriptions for AI answer engines; links composed from `siteUrl()`.
  Served at root (the dot bypasses the i18n middleware).

**`1886466` chore(seo): document SEO/GEO env vars**

- `.env.local.example`: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`,
  `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`.

## Key decisions / gotchas encoded

- **Brand entity** = "Token Forest" (space) in all metadata/JSON-LD; hyphen kept
  only as the wordmark; both + "TokenForest" registered as `alternateName`.
- **SoftwareApplication** (not WebApplication) — native desktop app,
  `applicationCategory: DeveloperApplication`, `operatingSystem: "Windows, macOS"`,
  `offers price 0 AUD`.
- **Analytics = Plausible** (Netlify SSR makes `@vercel/analytics` a no-op);
  cookieless, env-gated.
- **OG image URL is extensionless** (`/opengraph-image`), absolute via `siteUrl()`
  — must be re-included on every page's `openGraph` (a page-level openGraph block
  suppresses the file-convention image).
- Metadata routes must **not** use `getTranslations`/`setRequestLocale` (they run
  outside request scope) — all strings come from `lib/seo` constants.

## Verification done (prod build on :3459)

- `tsc --noEmit` clean; `eslint` clean on all touched/new files (2 pre-existing
  errors remain in untouched `top-bar.tsx`/`tree-modal.tsx` — out of scope).
- `next build` green, 26 routes incl. `/sitemap.xml`, `/robots.txt`, `/llms.txt`,
  `/llms-full.txt`, `/opengraph-image`, `/twitter-image`, `/manifest.webmanifest`,
  `/apple-icon`.
- Live curl: robots (AI rules present), sitemap (absolute URLs + per-URL
  hreflang), llms.txt (absolute links), correct Content-Types; image routes
  return `200 image/png` after the middleware fix.
- `/en` head: self-canonical, 5 hreflang (`zh-CN/en/ja/ko/x-default`), absolute
  `og:image`+dims, `twitter:image`, `@graph` (WebSite/Organization/
  SoftwareApplication/Offer), manifest + apple-touch-icon links.
- OG image rendered and eyeballed (1200×630) — sprite + wordmark correct.

## Remaining work

**PR 2+ — content pages** (add each path to `app/sitemap.ts` in the same commit
that ships the page):

- `/faq`, `/claude-code-token-usage-tracker`, `/codex-token-usage-tracker`,
  `/claude-code-desktop-pet`, `/visualize-ai-token-spending`, `/compare`,
  `/compare/ccusage`, `/why-is-my-claude-code-token-count-so-high`.
- Home/download/leaderboard on-page upgrades (entity `<h1>`, home FAQ section,
  "Learn" footer column, top-bar FAQ link).
- Content accuracy guardrails: see the plan (only Claude Code + Codex; ccusage is
  an "alternative"; cost = estimate; attribute the 57% cache-read stat).

**Launch dependencies (human):**

- Point `tokenforest.com.au` DNS at Netlify; set `NEXT_PUBLIC_SITE_URL`.
- After go-live: register Search Console + Bing (set the verification env vars),
  submit the sitemap; optionally set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`.
- Reconcile the desktop app's leaderboard default vs. the site's opt-in wording.
