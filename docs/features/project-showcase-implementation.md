# Project showcase — implementation notes

Companion to `project-showcase.md`. Everything technical lives here; that file
stays readable.

## Database (already applied, committed at `9139bd8`)

`0022_leaderboard_project.sql` adds four nullable columns to `public.leaderboard`
— `project_name`, `project_desc`, `project_url`, `project_image` — plus a
`BEFORE INSERT OR UPDATE` trigger that validates them only when they actually
change, a `project-images` storage bucket, and an `AFTER DELETE` trigger that
drops the object when a row leaves the board.

`0023_leaderboard_project_grants.sql` grants the four columns to `anon`
(SELECT) and `authenticated` (SELECT/INSERT/UPDATE). It exists because 0008 and
0016 degraded this table from table-level to per-column grants; **any future
column on `leaderboard` must ship its grants in the same migration.**

What the trigger guarantees, so the website need not re-check it:

| field           | guarantee                                                          | source                   |
| --------------- | ------------------------------------------------------------------ | ------------------------ |
| `project_name`  | ≤ 24 chars, banned-word screened, no zero-width/bidi/control chars | `0022:66-99`, `:151-154` |
| `project_desc`  | ≤ 80 chars, same screening                                         | same                     |
| `project_url`   | `https://` only, ≤ 200 chars, anchored host+path regex             | `0022:163-169`           |
| `project_image` | path and filename pinned to the row's own `user_id`                | `0022:171-177`           |
| all four        | `''` normalised to `NULL`                                          | `0022:144-149`           |

## Migration 0024 — pin the image host (required, not yet written)

`0022:174` matches `^https://[a-z0-9]+\.supabase\.co/…`. `[a-z0-9]+` accepts
**any** Supabase project ref, not ours. Verified by replaying the regex:
`attackerproject9.supabase.co/storage/v1/object/public/project-images/<uid>.webp`
passes. `next.config.ts:28` mirrors the hole with `hostname: "*.supabase.co"`.

Consequence is not a tracking pixel — `next/image` fetches server-side, so
visitor IPs never reach the third party. It is that the 64 KB `file_size_limit`
and the MIME allow-list on our bucket are both bypassable, and content can be
swapped after review.

Fix both gates from `NEXT_PUBLIC_SUPABASE_URL`:

- `0024` — `create or replace` the trigger function with the project ref
  interpolated, so the host is exact. Idempotent, same shape as 0023.
- `next.config.ts` — replace the wildcard with the exact hostname.

Cheapest now: one row holds an image, and it is ours.

## Rendering

`app/[locale]/leaderboard/page.tsx` is an async Server Component that awaits
`searchParams` and declares no `revalidate`, so it re-renders per request. It is
**not** statically generated — the `●` in build output belongs to the locale-free
stub `app/leaderboard/page.tsx`, which returns `null`.

**The structural constraint.** The panel must be a second `<tr>` holding one
`<td colSpan={4}>`, sibling to the player row inside a `<Fragment key={entry.id}>`.
`<div>` and `<details>` are hoisted out of `<tbody>` by the HTML parser. Precedent
in this repo: `app/ranger/[userId]/page.tsx:541`, `:664-669`.

`colSpan={4}` is correct on mobile too — column 3 is hidden with `display:none`
(`page.tsx:236-241`, `:348-349`), which does not change the column count.

That `<tr>` sits inside `overflow-hidden` (`page.tsx:231`) wrapping a `w-full`
auto-layout table, so **content that cannot shrink is clipped, not scrolled**, and
an unbreakable 200-char URL widens the whole board. Hence: `min-w-0` plus
`overflow-wrap:anywhere` / `word-break:break-word`, the pair already at
`components/tree-modal.tsx:205-206`.

Do **not** apply `row-slide-in` to the panel row — it translates X by 60px
(`app/globals.css:363-372`). Do **not** add a `prefers-reduced-motion` guard; the
global kill-switch at `globals.css:979-988` already zeroes every animation.

**Server/client split.** Keep the page a Server Component. The rows plus their
panels move into one client component that owns the open-row state; the panel's
text is rendered into the markup on the server (so it is in the HTML from first
paint) while the `<img>` is mounted only when that row is open.

## Accessibility contract

The trigger is a `<button>` **inside a `<td>`**, never a clickable `<tr>` — the
username cell already owns an interactive control (`page.tsx:307`), and no `<tr>`
in this codebase is clickable.

- `aria-expanded` reflects open state; `aria-controls` points at the panel cell's
  id, derived from `entry.id`.
- Collapsing returns focus to the trigger.
- Copy the disclosure at `components/top-bar.tsx:422-423` + `:169-172` — the only
  correct one in the repo. Do **not** copy `tree-modal.tsx` (never restores focus)
  or the ranger chevron (`ranger/[userId]/page.tsx:569`, no ARIA at all).

## Data layer

`lib/leaderboard.ts::getLeaderboard(page)` — one query, one round trip, explicit
nine-column select at `:102`, spread into rows at `:116`.

- Add the four columns to the select string at `:102` **and** to the type at
  `:12-29`. The `as LeaderboardEntry[]` cast at `:127` hides a mismatch, and
  `tsc --noEmit` is the only automated gate in this repo — a type-only edit
  compiles clean and is silently wrong.
- Type them `string | null`; coerce explicitly after the spread, as `:115-125`.
- Never `select("*")` — 0008's per-column grants make it 42501 for `anon`
  (`app/badge/[userId]/route.ts:224-225`).
- Key open-state on `entry.id`, never on rank or array index: the query has no
  tie-break (`:105`), unlike the value board which adds one deliberately
  (`lib/leaderboard-boards.ts:161`).
- Render `project_image` verbatim. The extension may be `webp`, `jpg` or `png`,
  so reconstructing the URL from a user id will 404 (`0022:174-175`).
- **Failure mode to accept knowingly:** these columns ride the same select as the
  whole board. A grant regression returns an error, `getLeaderboard` collapses to
  `entries: []` (`:108-110`), and every visitor sees the empty state with the raw
  message printed at `page.tsx:197`. This table's grants have degraded to
  per-column twice (0008, 0016) and this exact 403 shipped once (0023). Accepted
  rather than paying a second round trip on every page view; the four columns go
  on the release checklist instead.

## Held accounts — OPEN, needs a database change

`project-showcase.md` says a player whose gains are being held gets no panel.
That cannot be implemented in web code: `anon` **cannot read `held_tokens` or
`raw_score`** — 0016 revoked them and a direct read returns 42501 (verified).

It must therefore be a server-side blanking: a view or a `security definer`
accessor that returns the four project fields as `NULL` when the account is held.
That shape is also the _correct_ one, because it preserves 0016's invariant that
holds are silent — the site cannot leak a decision it never receives, and a held
player is indistinguishable from a player who filled nothing in.

**Live data makes this urgent to settle:** two accounts currently carry holds —
`Yohann` (1.76e9 of 1.77e9 held, ~99%) and `Ericccccc` (1.72e8 of 1.85e10, ~0.9%).
`Ericccccc` is the only account with a project. A literal "any hold at all" rule
ships this feature showing nothing at all. See the open question in
`project-showcase.md` — the criterion is a product decision, not a technical one.

## Link handling

```
target="_blank" rel="noopener noreferrer nofollow ugc"
```

`noopener noreferrer` matches all 11 existing external links in the repo.
`nofollow ugc` is new and required: page 1 is indexable (`page.tsx:26`),
sitemapped at priority 0.7, and `app/robots.ts:7-23` allow-lists 15 AI crawlers.

Visible text is the hostname, not the href. `project_url` is the one field that
never passes the zero-width/bidi screen — `0022:151-154` calls the screener for
name and desc only — and the regex is case-insensitive (`!~*`) and admits
punycode. Deriving display text from the parsed hostname removes both.

## Image handling

- `next/image`, fixed `width`/`height`, `objectFit: contain`, `loading="lazy"`,
  never `priority`, never a CSS `backgroundImage`. No dimensions are stored, so
  the box is fixed and the image fits inside it.
- Mounted only when the row is open.
- **Cache busting.** The object name is fixed at `<user_id>.<ext>` forever, and
  the origin serves `cache-control: no-cache`, so `next.config.ts:24`'s
  `minimumCacheTTL: 604800` is the only caching layer — a replaced image would
  serve stale bytes for up to 7 days. Append a token derived from the row's
  `updated_at`. Verified safe: in next@16.2.9 `matchRemotePattern` skips the
  search check when `search` is unset, so a query string does not break
  `remotePatterns`.
- **Missing object returns HTTP 400** on the wire with a 404-shaped JSON body
  (verified). A `res.status === 404` check would miss it — use `onError`, which
  is why the panel is a client component.

## Metadata and structured data — hard prohibition

Project text must never reach `generateMetadata`, `openGraph`, or any JSON-LD.
`components/json-ld.tsx:11` is a bare `JSON.stringify` into
`dangerouslySetInnerHTML` with no closing-script escaping; its comment ("our own
JSON, never user input") is a load-bearing invariant.

Project text may only ever be an ICU **value**, never a message key
(`page.tsx:277`, `:310`).

## i18n

Flat `LeaderboardPage` namespace, all four files, same commit. Verified: exactly
61 keys in en/zh/ja/ko, byte-identical key sets, zero `project*` keys today.
There is no type augmentation, no parity script, no test — a missed key is a
runtime error on a live page.

Keys needed: an expand/collapse label for the trigger, a panel heading, a label
for the link. Player-written text is never translated. In English, never place an
apostrophe directly before `{` (ICU escape).

## Requirements (EARS)

- **U1** THE SYSTEM SHALL treat a leaderboard entry as having a project if and
  only if its project name is a non-empty string after trimming.
- **U2** THE SYSTEM SHALL render player-written project text as escaped text
  nodes only, and SHALL NOT place it in page metadata or structured data.
- **E1** WHEN a leaderboard row has a project THE SYSTEM SHALL render an
  expand control within that row's username cell.
- **E2** WHEN the expand control is activated THE SYSTEM SHALL render a panel row
  immediately after that player's row and set `aria-expanded` to true.
- **E3** WHEN a second expand control is activated THE SYSTEM SHALL collapse the
  previously open panel before opening the new one.
- **E4** WHEN an open panel is collapsed THE SYSTEM SHALL move keyboard focus to
  the control that collapsed it.
- **E5** WHEN a panel is opened THE SYSTEM SHALL begin loading that player's
  image, and not before.
- **S1** WHILE a panel is open THE SYSTEM SHALL render only the fields that are
  present, reserving no space for absent ones.
- **N1** IF the project image fails to load THEN THE SYSTEM SHALL remove the
  image from the panel and render the remaining fields alone.
- **N2** IF a leaderboard entry has no project name THEN THE SYSTEM SHALL render
  no expand control for that row, regardless of its other project fields.
- **W1** WHERE a project link is present THE SYSTEM SHALL render its hostname as
  the link text and SHALL emit `target="_blank"` and
  `rel="noopener noreferrer nofollow ugc"`.

## Scenario → verification

No test runner exists in this repository — no vitest, jest or playwright, no
`*.test.*`, no `test` script in `package.json`. Every requirement above is
`[Smoke test only]`, per the numbered procedure in `project-showcase.md`.

`tsc --noEmit` and `eslint .` remain the only automated gates and both must pass.

## Accepted risks

- **Blank board on a grant regression** — see _Data layer_. Mitigated by a
  release-checklist item, not by code.
- **Stale word screening** — the trigger only runs when values change
  (`0022:124-142`), so text that passed an older word list stays published.
  Re-screening existing rows is separate work.
- **No takedown action** — `app/ranger/actions.ts` exposes ban/unban/
  deleteOrphan/acknowledge/hold/release and nothing that clears these fields;
  `lib/ranger/data.ts:48`, `:170` do not even select them. Whether a server-side
  clear survives the desktop app's next sync is **not established** from this
  repo. Both are launch gates in `project-showcase.md`.
- **First remote image in production** — `remotePatterns` has never executed on
  the Netlify runtime; there are zero remote image sources anywhere in `app/`,
  `components/` or `lib/` today. Smoke test on the deployed URL.
- **Anon can list the whole storage bucket** (`0022:227-230`) — pre-existing,
  out of scope for the website.
- **Payload growth** — ~1 KB today; ~21 KB per page at full adoption.
