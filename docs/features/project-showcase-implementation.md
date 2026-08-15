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

**What the trigger checks today — read with the two sections below, which narrow
it:**

| field           | check                                                         | source                   |
| --------------- | ------------------------------------------------------------- | ------------------------ |
| `project_name`  | ≤ 24 chars, banned-word screened, no zero-width/bidi/control  | `0022:66-99`, `:151-154` |
| `project_desc`  | ≤ 80 chars, same screening                                    | same                     |
| `project_url`   | `https://` only, ≤ 200 chars, host anchored — **path is not** | `0022:165`               |
| `project_image` | filename pinned to the row's `user_id` — **host is not**      | `0022:174-175`           |
| all four        | `''` normalised to `NULL`                                     | `0022:144-149`           |

Two narrowings the table must be read against:

- **`project_url` skips the word screener entirely.** `0022:151-154` calls
  `project_text_rejection` for `project_name` and `project_desc` only. The path
  half of the regex is `(/[^\s]*)?$` — anything but whitespace. W1 then renders
  that unscreened string's hostname as visible text on the one indexable page,
  and there is no takedown action. A free subdomain (`<slur>.pages.dev`) is
  publishable board text today.
  **Open product question:** should the screener also run over the link's host?
  New decision, not settled here.
- **`project_image` pins the filename, not the host.** See the next section.

## Migration 0024 — pin the image host and path (LAUNCH GATE)

`0022:174` matches `^https://[a-z0-9]+\.supabase\.co/…`. `[a-z0-9]+` accepts
**any** Supabase project ref, not ours. Verified by replaying the regex:
`attackerproject9.supabase.co/storage/v1/object/public/project-images/<uid>.webp`
passes. `next.config.ts:25-30` mirrors the hole with `hostname: "*.supabase.co"`
and `pathname: "/storage/v1/object/public/**"`.

Consequence is not a tracking pixel — `next/image` fetches server-side, so
visitor IPs never reach the third party. It is three things:

- the 64 KB `file_size_limit` and the MIME allow-list on our bucket are both
  bypassable;
- content can be swapped after review;
- until it is pinned, `/_next/image?url=https://<any-ref>.supabase.co/storage/v1/object/public/…`
  is an **open image proxy** any client can drive. `minimumCacheTTL` does not
  blunt it, because nothing repeats.

Fix both gates from `NEXT_PUBLIC_SUPABASE_URL`:

- `0024` — `create or replace` the trigger function with the project ref
  interpolated, so the host is exact. Idempotent, same shape as 0023.
- `next.config.ts` — exact hostname **and** narrow the pathname to
  `/storage/v1/object/public/project-images/**`. Pinning only the hostname still
  leaves every other public bucket in our own project proxyable.

Cheapest now: one row holds an image, and it is ours.

## Rendering

`app/[locale]/leaderboard/page.tsx` is an async Server Component that awaits
`searchParams` and declares no `revalidate`, so it re-renders per request. It is
**not** statically generated — the `●` in build output belongs to the locale-free
stub `app/leaderboard/page.tsx`, which returns `null`.

**The structural constraint.** The panel must be a second `<tr>` holding one
`<td colSpan={4}>`, sibling to the player row inside a `<Fragment key={entry.id}>`.
`<div>` and `<details>` are hoisted out of `<tbody>` by the HTML parser. Precedent
in this repo: `app/ranger/[userId]/page.tsx:542`, `:664-669`.

`colSpan={4}` is correct on mobile too. The `<colgroup>` at `page.tsx:236-241`
fixes the table at four columns; the third column is hidden with Tailwind
`hidden … sm:table-cell` at `:253-256` and `:348-349`, which changes what is
painted, not the column count.

**Width safety.** That `<tr>` sits inside `overflow-hidden` (`page.tsx:231`)
wrapping a `w-full` auto-layout table, so content that cannot shrink is
**clipped, not scrolled**. Apply `min-w-0` plus `overflow-wrap:anywhere` /
`word-break:break-word` (the pair at `components/tree-modal.tsx:205-206`) to the
panel cell **and every text node inside it**. The binding case is
`project_desc`: 80 characters with no space in them, displayed verbatim, screened
for length, characters and word lists but not for repetition (`0022:66-99`). The
raw URL is not the binding case — W1 means it is never displayed. For scale, the
widest unbreakable string on the board today is a 16-character username.

Do **not** apply `row-slide-in` to the panel row — it translates X by 60px
(`app/globals.css:363-373`). Do **not** add a `prefers-reduced-motion` guard; the
global kill-switch at `globals.css:979-988` already zeroes every animation.

**Server/client split, and why the panel row always exists.** Keep the page a
Server Component. The rows plus their panels move into one client component that
owns the open-row state. Settled decision 3 requires the project **text** to be
in the HTML from first paint, so the panel row is emitted on the server for every
row that has a project and is hidden with CSS — not mounted on activation. Two
consequences follow and both are load-bearing:

- if the row were created on activation, the text would be absent from
  view-source and decision 3 would fail **silently** until someone ran a crawl;
- `aria-controls` needs its target to exist while the panel is closed, on every
  trigger on the page.

Hide it with a mechanism that removes it from the accessibility tree as well as
from view (`hidden` attribute, or `display:none`) — not opacity or height alone.
The `<img>` is the exception: it is mounted only when that row is open.

## Accessibility contract

The trigger is a `<button>` **inside a `<td>`**, never a clickable `<tr>` — the
username cell already owns an interactive control (`page.tsx:307`), and no `<tr>`
in this codebase is clickable.

- `aria-expanded` reflects open state and returns to `false` on collapse;
  `aria-controls` points at the panel cell's id, derived from `entry.id`.
- The panel is labelled by the project name — an `aria-labelledby` from the panel
  region to the heading element. Without it the rationale in
  `project-showcase.md` ("a region with nothing readable at the top of it") is
  unimplementable and unverifiable.
- Collapsing returns focus to the trigger. `Escape` closes an open panel; both
  repo precedents do this (`components/top-bar.tsx:175`, `:213`;
  `components/tree-modal.tsx`).
- **There is no single correct precedent to copy.** Repo-wide, `aria-controls`
  occurs exactly once, at `components/top-bar.tsx:423` — the mobile hamburger,
  which has `aria-expanded` and `aria-controls` but never restores focus
  (`onClick={() => setMenuOpen((prev) => !prev)}`). `top-bar.tsx:169-172`
  (`closeMenu`) restores focus, but its trigger at `:230-231` has
  `aria-haspopup` + `aria-expanded` and **no** `aria-controls`. Two half
  precedents; this trigger is the first to do both. Do not copy
  `app/ranger/[userId]/page.tsx:564-571` — that chevron is a `<Link>` with
  `aria-hidden` on the glyph and no `aria-expanded`, so its state is never
  announced.

## Data layer

`lib/leaderboard.ts::getLeaderboard(page)` — one query, one round trip, explicit
nine-column select at `:102`, spread into rows at `:116`.

- Add the four columns to the select string at `:102` **and** to the type at
  `:12-29`. The `as LeaderboardEntry[]` cast at `:127` hides a mismatch, and
  nothing in the toolchain catches a type-only edit that adds columns to the type
  but not to the select string.
- **`LeaderboardEntry` is shared — declare the four fields optional.**
  `lib/leaderboard-boards.ts:122` does `export type ValueEntry = LeaderboardEntry & {…}`,
  and `getValueBoard` builds it from an explicit object literal at `:193-206`
  that enumerates every field and does **not** spread the row. Four new
  _required_ properties make that literal a missing-property error and fail
  `tsc --noEmit`. Declaring them `project_name?: string | null` keeps the value
  board — which `project-showcase.md` puts out of scope — untouched. The
  alternative (four `null` lines in that literal) is a one-line edit to an
  out-of-scope file; we are not taking it.
- Coerce explicitly after the spread, as `:115-125`.
- Never `select("*")` — 0008's per-column grants make it 42501 for `anon`
  (`app/badge/[userId]/route.ts:224-225`).
- Key open-state on `entry.id`, never on rank or array index: the query has no
  tie-break (`:105`), unlike the value board which adds one deliberately
  (`lib/leaderboard-boards.ts:161`).
- Render `project_image` verbatim. The extension may be `webp`, `jpg` or `png`,
  so reconstructing the URL from a user id fetches a missing object — which
  answers **HTTP 400**, not 404 (see § Image handling).
- **Failure mode to accept knowingly:** these columns ride the same select as the
  whole board. A grant regression returns an error, `getLeaderboard` collapses to
  `entries: []` (`:108-110`), and every visitor sees the empty state with the raw
  message printed at `page.tsx:197`. This table's grants have degraded to
  per-column twice (0008, 0016) and this exact 403 shipped once (0023). Accepted
  rather than paying a second round trip on every page view; the four columns go
  on the release checklist instead.

## Held accounts — settled in `project-showcase.md`; needs a database change before launch

`anon` **cannot read `held_tokens` or `raw_score`** — verified live, a direct read
returns 42501. The mechanism is not what an earlier draft of this file said:
`0016:483` revokes **insert and update** only, and its sole SELECT statement
(`:489`) grants `service_role`. The columns are unreadable because `0008:131-132`
degraded SELECT on this table to per-column and `0016:98-100` added them
afterwards — the exact trap `0023` documents.

**Suppression must happen where the columns themselves become `NULL`, not where
the website reads them.** `anon` can query the base table directly (`0023:29`),
so a read-side view or `security definer` accessor is not a privacy boundary: a
visitor holding the same public key the site holds can diff the API against the
page, and the difference _is_ the held set. That breaks `0016:10` — "the row
stays, the rank drops, nobody is told anything."

Write-time blanking is mechanically available. `held_tokens` is written by
`update public.leaderboard` (`0016:420-421`, `:447-448`, `:547-548`), so the
existing `BEFORE INSERT OR UPDATE` trigger (`0022:186-187`) fires and can null the
four fields while the account is held; the desktop app's next sync then re-blanks
silently. If we ship the read-side shape instead, we must record that the hold
becomes inferable — we do not get to claim both.

**Live shape, as of 2026-08-16:** one account carries a hold and has no project;
one account has a project and carries no hold. These figures move on every sync
and every admin ruling (`0016:420-421`, `:447-448`, `:547-548`) — re-check before
relying on them. The consequence to note is not a count but a gap: **the two
states never overlap today, so the held-account path cannot be exercised
end-to-end until someone deliberately creates it.** Name that person before
launch; `project-showcase.md`'s smoke section carries the same note.

## Link handling

```
target="_blank" rel="noopener noreferrer nofollow ugc"
```

`noopener noreferrer` matches all 11 existing external links in the repo.
`nofollow ugc` is new and required: page 1 is indexable, sitemapped at priority
0.7, and `app/robots.ts:7-23` allow-lists 15 AI crawlers. Pages 2 and beyond
already return `robots: { index: false, follow: true }`
(`app/[locale]/leaderboard/page.tsx:26-33`) at 50 rows per page
(`lib/leaderboard.ts:78`), so indexed exposure is score-gated to the top 50.

Visible text is the hostname, not the href — see the two narrowings under
§ Database. Deriving display text from the parsed hostname also renders any
punycode host in its `xn--` form, which is the honest thing to show.

## Image handling

- `next/image`, fixed `width`/`height`, `objectFit: contain`, `loading="lazy"`,
  never `priority`, never a CSS `backgroundImage`. No dimensions are stored, so
  the box is fixed and the image fits inside it.
- `alt=""`. There is no author-supplied alternative text in the data, and the
  only candidate — the project name — is already the panel's heading, so reusing
  it makes a screen reader announce the same words twice. An empty `alt` marks it
  decorative, which is the correct treatment for an image with no independent
  information the surrounding text does not already carry.
- Mounted only when the row is open.
- **Cache busting.** The object name is pinned to `<user_id>.<ext>` forever
  (`0022:174-175`). The origin serves `cache-control: public, max-age=300` from
  the object's own stored metadata — but next@16.2.9 takes
  `Math.max(minimumCacheTTL, getMaxAge(upstream))`
  (`node_modules/next/dist/server/image-optimizer.js:713`, where the default is
  `14400`), so
  `next.config.ts:24`'s `604800` wins regardless and a replaced image would
  otherwise serve stale for up to 7 days. Append a token derived from the row's
  `updated_at`. Verified safe: in next@16.2.9 `matchRemotePattern` skips the
  search check when `search` is unset, so a query string does not break
  `remotePatterns`.
  **Sufficiency is not established.** `updated_at` moves only on a row UPDATE;
  replacing the Storage object does not touch the row, and `project_image` is
  byte-identical after a replacement. The token turns over only if the desktop
  app re-upserts the row when it replaces the image. Live data is consistent with
  a lag: object written 19:48:13Z, row `updated_at` 20:17:59Z. `project-showcase.md`
  says "at that player's next sync" rather than "immediately" for this reason.
- **A missing object answers HTTP 400** on the wire with a 404-shaped JSON body
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
There is no type augmentation and no parity script.

A missed key is not a crash: `use-intl` logs to `console.error` and renders the
literal `LeaderboardPage.<key>` to that locale's visitors, and `i18n/request.ts`
overrides neither behaviour. Silent and ugly rather than loud — which is a
better argument for shipping all four files in one commit, not a weaker one.

Keys needed: an expand/collapse label for the trigger, a panel heading, a label
for the link. Player-written text is never translated. In English, never place an
apostrophe directly before `{` (ICU escape).

**The privacy page is part of this feature's surface.**
`app/[locale]/privacy/page.tsx:144` (en), `:405` (zh) and the ja/ko equivalents
already publish the user-facing description of what is uploaded and when it is
cleared. Under CLAUDE.md § Doc-in-sync, if a launch gate changes what is stored
or cleared, those four strings change in the same commit.

## Requirements (EARS)

- **U1** THE SYSTEM SHALL treat a leaderboard entry as having a project if and
  only if its project name is a non-empty string after trimming.
- **U2** THE SYSTEM SHALL render player-written project text as escaped text
  nodes only.
- **U3** THE SYSTEM SHALL emit the panel row and its project text for every entry
  that has a project on first render, in a state that is neither visible nor
  exposed to assistive technology.
- **U4** THE SYSTEM SHALL include, in each project image request, a token derived
  from that entry's last-updated time.
- **U5** THE SYSTEM SHALL render project panels on the tokens board only.
- **U6** THE SYSTEM SHALL NOT place player-written project text in page metadata
  or structured data.
- **E1** WHEN an entry has a project THE SYSTEM SHALL render an expand control
  within that entry's username cell.
- **E2** WHEN an expand control is activated THE SYSTEM SHALL reveal that entry's
  already-present panel row and set `aria-expanded` to true.
- **E3** WHEN a second expand control is activated THE SYSTEM SHALL collapse the
  previously open panel before revealing the new one.
- **E4** WHEN an open panel's own control is activated THE SYSTEM SHALL collapse
  that panel and set `aria-expanded` to false.
- **E5** WHEN a panel is collapsed THE SYSTEM SHALL move keyboard focus to the
  control that collapsed it.
- **E6** WHEN a panel is revealed THE SYSTEM SHALL begin loading that entry's
  image, and not before.
- **E7** WHEN `Escape` is pressed while a panel is open THE SYSTEM SHALL collapse
  it.
- **S1** THE SYSTEM SHALL render only those project fields that are present.
- **S2** THE SYSTEM SHALL reserve no layout space for an absent project field.
- **N1** IF the project image fails to load THEN THE SYSTEM SHALL remove the
  image from the panel and render the remaining fields alone.
- **N2** IF an entry has no project name THEN THE SYSTEM SHALL render no expand
  control for it, regardless of its other project fields.
- **N3** IF an entry's gains are held THEN THE SYSTEM SHALL render neither an
  expand control nor any of its project text into the markup.
- **W1** WHERE a project link is present THE SYSTEM SHALL render its hostname as
  the link text.
- **W2** WHERE a project link is present THE SYSTEM SHALL emit `target="_blank"`
  and `rel="noopener noreferrer nofollow ugc"` on it.
- **W3** WHERE a panel is rendered THE SYSTEM SHALL associate it with its project
  name as the panel's accessible label.

N3's second clause matters: the text is server-rendered, so suppressing only the
control would still publish a held player's words to the crawlers
`app/robots.ts:7-23` allow-lists.

## Scenario → verification

No test runner exists in this repository — no vitest, jest or playwright, no
`*.test.*`, no `test` script in `package.json`. Verification is the numbered
procedure in `project-showcase.md`, and it does **not** reach everything:

| requirement    | reached by                                       |
| -------------- | ------------------------------------------------ |
| U1, N2         | step 1                                           |
| U3, E6         | step 2 (engineer half)                           |
| E2, E3, E4, E5 | steps 2–4                                        |
| E7, W3         | step 5, partially — announce-state only          |
| W1             | step 6 (visible text, new tab, destination)      |
| S1, S2         | steps 8 and 11                                   |
| N1             | step 11                                          |
| U4             | step 9                                           |
| **U6, W2**     | **code review only — no step can see them**      |
| **N3**         | **launch gate — unexercisable today, see above** |
| U2, U5         | code review                                      |

`tsc --noEmit`, `eslint .` and `stylelint` (`package.json:11`) run as gates, plus
`precommit-typecheck.sh`, `lint-bans.sh` and `precommit-cycles.sh` from
`.claude/settings.json`. None of them catches a type-only edit that adds columns
to the type but not to the select string.

## Launch gates

Neither document may be signed off as shippable until all four hold.

1. **0024** — pin the image host and path (§ Migration 0024).
2. **Held-account blanking** — write-time, not read-time (§ Held accounts), plus
   someone to manufacture the test state.
3. **A takedown action.** `app/ranger/actions.ts` exposes ban/unban/
   deleteOrphan/acknowledge/hold/release and nothing that clears these fields;
   `lib/ranger/data.ts:48`, `:170` do not even select them. Whether a server-side
   clear survives the desktop app's next sync is **not established from this
   repo — and the app's own published behaviour points the wrong way**:
   `app/[locale]/privacy/page.tsx:144` states that turning the switch off clears
   the fields and deletes the image at the next sync, i.e. the app pushes its
   local state on sync. That describes the _off_ path only, so it is not
   conclusive, but it suggests a server-side clear on a player whose switch is
   still **on** would be overwritten.
4. **Bucket enumeration.** `0022:227-230` creates
   `"project image read" … for select to anon, authenticated`, and it works: an
   anon list call against `project-images` returns the full inventory with names,
   timestamps and sizes. Object names are `<user_id>.<ext>`, so this is a second
   disclosure channel for the same content. It compounds with the ban model —
   a ban filters the row rather than deleting it (`0005:4`, `:57-62`), so the
   `AFTER DELETE` cleanup at `0022:252-253` never fires and a banned uploader's
   object survives, enumerable. **This policy ships with this feature; it is not
   pre-existing.**

## Accepted risks

- **Blank board on a grant regression** — see § Data layer. Mitigated by a
  release-checklist item, not by code.
- **Stale word screening** — the trigger only runs when values change
  (`0022:124-142`), so text that passed an older word list stays published.
  Re-screening existing rows is separate work.
- **Combining-mark stacking** in the name or description. U+0300–U+036F are
  absent from `0022:71` and survive — but usernames run the identical character
  class and are already rendered on every row, so the panel adds no new exposure.
- **Payload growth** — ~1 KB today; ~21 KB per page at full adoption.
- **The website's remote-image path is unexercised in production**, though the
  storage half is already live: one object, 5,504 bytes, publicly fetchable and
  publicly listable right now. Smoke test on the deployed URL.
