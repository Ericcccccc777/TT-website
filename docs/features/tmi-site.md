# Feature: TMI site at /TMI

## Status: AS-BUILT 2026-11-28

## 1. What this feature is for

TMI (Token-Made Intelligence) is the desktop app that replaced the tree game: AI characters who live in the corner of the screen. It has its own website, separate from this Next.js site. That website now lives at https://www.tokenforest.com.au/TMI/ so it can be visited before it gets a domain of its own.

## 2. Happy path

### 2.1 A visitor opens /TMI

`/TMI` (and `/TMI/`) serves TMI's language picker. It sends the visitor to `/TMI/zh/` or `/TMI/en/`: the language they picked last time on that site, otherwise their browser language, otherwise English.

### 2.2 A visitor browses the TMI site

Every page of the TMI site is reachable under `/TMI/<lang>/…`: home, characters, features, house, comics, leaderboard, download, FAQ, about, privacy, security, terms. The leaderboard pages read the same Supabase database as this site, read-only, with the public anon key.

### 2.3 The TMI desktop app links here

The app's privacy, security, terms and leaderboard links open `/TMI/zh/…` or `/TMI/en/…` (Japanese and Korean fall back to English until the TMI site has those languages). The app's README badge image is still served by this site at `/badge/<id>.svg`.

## 3. Edge-case behavior

### 3.1 Path without a trailing slash

#### Behavior

- `/TMI/zh/faq` and `/TMI/zh/faq/` show the same page. Next.js first redirects the slash form to the bare form, then a rewrite maps it to `public/TMI/zh/faq/index.html`.

### 3.2 A path that is not a TMI page

#### Behavior

- `/TMI/zh/no-such-page` gets this site's normal 404.

### 3.3 Locale middleware

#### Behavior

- The next-intl middleware never runs on `/TMI…`, so it does not redirect TMI pages to `/en/TMI/…`.

## 4. How it is built

- Source: the `tOkeN-Website` folder next to this repo on the maintainer's machine (not a git repo yet).
- Build: `node build.mjs --base /TMI --site-url https://www.tokenforest.com.au/TMI --no-comics --out <dir>/TMI`. `--base` prefixes every in-site path (pages, images, scripts, styles) with `/TMI`. `--no-comics` leaves the daily news comics out: the owner has not decided to publish them yet, so the comics page says there are none. Drop the flag once they are approved.
- Copy the output into `public/TMI/`, leaving out `_redirects`, `_headers` and `robots.txt` (Netlify only reads those at the site root, and this site has its own).
- `next.config.ts` `rewrites()` maps page paths to their `index.html`. Public files are matched first, so assets are served directly.
- ESLint and Stylelint skip `public/TMI/**`: it is generated output from another project.
- Cache headers for `/TMI/img/*`, `/TMI/comics/*` and `/TMI/fonts/*` are in `netlify.toml`.

## 5. Out of scope

- The Token Forest pages, downloads, leaderboard and badge of this site are unchanged.
- A separate domain or Netlify site for TMI.
