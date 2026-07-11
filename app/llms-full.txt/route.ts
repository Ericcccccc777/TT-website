import { GITHUB_URL, siteUrl } from "@/lib/seo";

// The long-form companion to /llms.txt: a single flat document an answer engine
// can ingest without crawling — full FAQ, feature detail, and system
// requirements inlined.
export function GET() {
  const base = siteUrl();
  const body = `# Token Forest — full reference

> Token Forest is a cozy pixel-art desktop pet for Windows and macOS that grows
> a tree from the Claude Code and Codex tokens you spend. Free public beta.
> Local-first, offline; it reads only token counts, never your code.

## Overview
Token Forest sits above your taskbar and turns AI token usage into a living pixel tree. Every token you spend in Claude Code or Codex feeds the tree, which grows through 8 stages from a seed to a fruit-bearing canopy. It reads your local usage logs in real time, works fully offline, and never sees your code, prompts, or conversations.

## Platforms & pricing
- Windows 10/11 and macOS, from a single codebase.
- Free during public beta.
- Download: ${base}/en/download

## Growth stages
Token Forest has 8 growth stages driven purely by tokens spent, and progress persists across sessions: Sprout, Sapling, Young Tree, Grown Tree, Lush Tree, Big Tree, Flourishing, and Fruitful.

## Tree species
Four species ship today — Apple, Cherry Blossom, Cactus, and a festive Christmas tree — each with themed decorations.

## Token bubbles
Each conversation produces a floating, color-coded token bubble above the tree (Claude Code = orange, Codex = blue-purple).

## Cost & the 4 token classes
Token Forest tracks four token classes: input, output, cache-read, and cache-write. Its Dashboard shows an offline cost estimate from a built-in price table (it may differ from your Anthropic or OpenAI bill). Cache-read tokens dominate raw counts but are cheap per token — in Token Forest's own 6-week sample, cache reads accounted for about 57% of real cost while input and output were only about 24% — which is why raw token counts can look enormous while real cost stays modest.

## Dashboard
Token Forest includes an offline usage & cost dashboard — a "report card" for your AI coding. Three views share one set of numbers, so any two figures reconcile:
- Growth: one profile per tree — stage, days planted, growth curve, and "this tree is worth ≈ $X".
- Usage: full-history stats — daily/weekly/monthly charts, per-model breakdown (Claude Code & Codex), a 26-week heatmap, burn rate, and per-project breakdown.
- Chats: one line per conversation — title, project, prompt count, the four token classes, and an estimated cost.
Everything is computed locally from your usage logs and never uploaded; cost is an offline estimate from a bundled price table (it may differ from your Anthropic or OpenAI bill). Details: ${base}/en/dashboard

## Privacy
Local-first and fully offline. Token Forest reads only token counts, plus model name, timestamp, and session title, from your local Claude Code and Codex usage logs. It never reads your code, prompts, or conversation content, and sends no telemetry. The only network feature is the opt-in global leaderboard.

## FAQ
Q: Does Token Forest read my code or prompts?
A: No. It reads only token counts (plus model name, timestamp, and session title) from your local usage logs — never your code, prompts, or conversation content.

Q: Is Token Forest free?
A: Yes, it is free during public beta.

Q: Which platforms does it support?
A: Windows 10/11 and macOS, from a single codebase.

Q: The installer is unsigned — how do I open it?
A: On Windows, if SmartScreen appears, click "More info" then "Run anyway". On macOS, if Gatekeeper blocks it, open System Settings → Privacy & Security and choose "Open Anyway" (or right-click the app and choose Open). Each release also publishes a SHA-256 checksum so you can verify the download.

Q: Does it work with both Claude Code and Codex?
A: Yes. It reads each tool's local usage logs (Claude Code and Codex).

Q: Is my data uploaded anywhere?
A: No telemetry, and it works fully offline. The global leaderboard is opt-in.

Q: How do I see how much I've spent?
A: The Dashboard shows an offline cost estimate from a built-in price table. It is an estimate and may differ from your Anthropic or OpenAI bill.

Q: Why is my Claude Code token count so high?
A: Cache-read tokens make raw counts balloon. They are counted for growth but priced far lower than input/output, so your real cost is much smaller than the raw number suggests.

Q: Is Token Forest a GUI for ccusage?
A: No. It is an independent tool — a GUI alternative to the ccusage CLI, not a front-end for it, and it shares no code.

## System requirements
- Windows 10/11 or macOS.
- Claude Code and/or Codex used on this machine (so usage logs exist).
- No account and no network required — runs fully local.

## Available languages
Both the app UI and the website are available in four languages. Localized home pages:
- English: ${base}/en
- 中文 (Chinese): ${base}/zh
- 日本語 (Japanese): ${base}/ja
- 한국어 (Korean): ${base}/ko

## Guides
- How much does Claude Code cost? Token pricing, cache reads, Opus vs Sonnet vs Haiku, and subscription vs API billing: ${base}/en/claude-code-cost
- Claude Code usage limits explained — the rolling 5-hour session window, weekly caps, and Pro vs Max: ${base}/en/claude-code-usage-limits
- ccusage alternative — a visual GUI desktop app that reads the same Claude Code & Codex logs: ${base}/en/ccusage-alternative
- How to track your Claude Code & Codex token usage — where the logs live and how to read them: ${base}/en/track-claude-code-usage

## Official links
- Website: ${base}/en
- Download: ${base}/en/download
- Leaderboard: ${base}/en/leaderboard
- Source (GitHub): ${GITHUB_URL}
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
