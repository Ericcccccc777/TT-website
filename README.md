# Token-Forest — Website

The official site for **[Token-Forest](https://github.com/Ericcccccc777/Token-Forest-P)** 🌳 — a pixel-art desktop pet that grows a tree from the AI tokens you spend with Claude Code / Codex. (The linked repo is the public product home & downloads; the app itself is proprietary.)

Pages: project intro, download, and a global **leaderboard** that ranks players by the "tree tokens" they've collected.

## Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** (cozy pixel-garden theme, real pixel sprites)
- **Supabase** (Postgres) — leaderboard data + anonymous auth
- **next-intl** — 中文 / English / 日本語 / 한국어, with browser-language auto-detect (`/en`, `/zh`, …)
- Deploy target: **Netlify**

## Development

```bash
npm install
cp .env.local.example .env.local   # then fill in your Supabase URL + anon (publishable) key
npm run dev                        # http://localhost:3000
```

The leaderboard reads from a `leaderboard` table in Supabase; see `supabase/migrations/` for the schema (run them in the Supabase SQL editor).

## Scripts

| Command              | What it does         |
| -------------------- | -------------------- |
| `npm run dev`        | Start the dev server |
| `npm run build`      | Production build     |
| `npm run lint`       | ESLint               |
| `npm run type-check` | `tsc --noEmit`       |
