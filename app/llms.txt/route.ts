import { GITHUB_URL, siteUrl } from "@/lib/seo";

// Dynamic so every link composes from siteUrl() and is correct the moment DNS
// flips. The folder is literally named "llms.txt" → served at /llms.txt (the
// dot makes it bypass the i18n middleware). See also /llms-full.txt.
export function GET() {
  const base = siteUrl();
  const body = `# Token Forest

> A cozy pixel-art desktop pet (Windows & macOS) that grows a tree from the
> Claude Code and Codex AI tokens you spend. Free public beta. Local-first and
> offline — it reads only token counts, never your code.

## What is it
- Token Forest turns the AI tokens you spend in Claude Code and Codex into a living pixel tree on your desktop. It runs locally, reads only token counts from your usage logs, and works fully offline.
- Home: ${base}/en

## Key features
- 8 growth stages, from seed to a fruitful canopy (progress persists across sessions)
- 4 tree species: Apple, Cherry Blossom, Cactus, and a festive Christmas tree
- Real-time token bubbles, color-coded by source (Claude Code = orange, Codex = blue-purple)
- Capsule mini-mode, an opt-in global leaderboard, and an offline cost-estimate dashboard
- 4 UI languages: English, 中文, 日本語, 한국어

## Platforms & pricing
- Windows 10/11 and macOS, from a single codebase
- Free (public beta)
- Download: ${base}/en/download

## Privacy
- Local-first and fully offline. Token Forest reads only token counts (plus model name and timestamp) from your local Claude Code and Codex usage logs — never your code, prompts, or conversation content. No telemetry.

## Dashboard
- An offline usage & cost dashboard: growth profile, per-model usage (Claude Code & Codex), a 26-week heatmap, per-project breakdown, and per-conversation billing — all computed locally from your usage logs, never uploaded. ${base}/en/dashboard

## Leaderboard
- Opt-in global leaderboard: ${base}/en/leaderboard

## Guides
- How much does Claude Code cost? Token pricing explained: ${base}/en/claude-code-cost
- Claude Code usage limits explained (Pro & Max): ${base}/en/claude-code-usage-limits
- ccusage alternative — a visual GUI desktop app: ${base}/en/ccusage-alternative
- How to track your Claude Code & Codex token usage: ${base}/en/track-claude-code-usage

## Available languages
- Both the app UI and this website are available in English, 中文 (Chinese), 日本語 (Japanese), and 한국어 (Korean).
- English: ${base}/en
- 中文: ${base}/zh
- 日本語: ${base}/ja
- 한국어: ${base}/ko

## Official links
- Website: ${base}/en
- Source (GitHub): ${GITHUB_URL}
- Detailed version: ${base}/llms-full.txt
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
