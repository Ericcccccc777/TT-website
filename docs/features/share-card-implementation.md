# Share — Implementation Notes

**Spec:** `docs/features/share-card.md` (canonical, CEO domain)
**This file:** technical detail, manager domain.

## Scope

Two independent surfaces that ship together:

1. A `ShareButton` client component on three pages.
2. A per-player Open Graph card at `app/[locale]/p/[id]/opengraph-image.tsx`,
   replacing the site-wide `OG_IMAGE` on that route only.

Nothing else changes. No database migration, no new dependency, no change to
`robots` or sitemap behaviour (both stay owned by `player-page.md`).

## Functional requirements (EARS)

### Share control

- **U1** — The share control SHALL render the same label on every device and at
  every point in the page lifecycle.
- **E1** — WHEN the visitor activates the share control AND `navigator.share` is
  a function THE SYSTEM SHALL invoke it with `{ title, text, url }`.
- **E2** — WHEN `navigator.share` rejects with `AbortError` THE SYSTEM SHALL
  take no further action and leave the control unchanged.
- **E3** — WHEN `navigator.share` rejects with anything other than `AbortError`
  THE SYSTEM SHALL fall through to the clipboard path.
- **E4** — WHEN the visitor activates the share control AND `navigator.share` is
  absent THE SYSTEM SHALL write `url` to the clipboard.
- **UB3** — IF `navigator.clipboard` or its `writeText` is absent THEN THE SYSTEM
  SHALL take the same path as a rejected write (UB1). The absent-API case throws
  synchronously, so the guard and the rejection handler are one `try`, never two.
- **E5** — WHEN the clipboard write resolves THE SYSTEM SHALL display the copied
  label for 2000 ms and then restore the default label.
- **UB1** — IF the clipboard write rejects THEN THE SYSTEM SHALL reveal the URL
  as selectable read-only text and SHALL NOT display the copied label. There is
  no branch in which activation produces no observable result.
- **S1** — WHILE the copied label is displayed the control SHALL remain
  activatable (a second press re-copies; it does not queue a second timer).

### Player card image

- **U2** — The card SHALL be 1200×630 PNG.
- **U5** — The card SHALL NOT render any value the player's own page would not
  render for the same visitor. The image route SHALL derive its data from the
  same `getPlayer` call the page uses, and SHALL NOT read the profile through
  any wider query.
- **E6** — WHEN the card route is requested for an id that `getPlayer` resolves
  THE SYSTEM SHALL draw the player variant.
- **E7** — WHEN `getPlayer` returns null, throws, or does not settle within
  2500 ms THE SYSTEM SHALL draw the brand variant.
- **U6** — The card route SHALL NOT contain an unbounded wait. Every await in it
  is either local (disk, in-process) or raced against an explicit deadline.
- **E8** — WHEN **any** variable text the card would draw — the display name,
  the project name, or both — contains a code point above U+02FF THE SYSTEM
  SHALL request one character-subset font covering **all** text on the card,
  fixed strings included, before drawing.
- **UB2** — IF the subset font request fails, returns a format the renderer
  cannot parse, or exceeds 2500 ms THEN THE SYSTEM SHALL draw the card omitting
  **both** the name and the project name, and SHALL NOT draw either in a font
  that lacks their glyphs.
- **U7** — Script detection SHALL run over the concatenation of every variable
  string the card draws, never over the name alone. A Latin name beside a
  Chinese project name is the case that makes name-only detection wrong.
- **E9** — WHEN the resolved player has no `recentRank` THE SYSTEM SHALL omit
  the monthly rank block entirely.
- **E10** — WHEN the resolved player has no `project_name` THE SYSTEM SHALL omit
  the project line entirely.
- **U3** — The card SHALL NOT render the player's project description, project
  link, project picture, region flag, or join date.
- **U4** — Every fixed string drawn on the card SHALL be Latin-script, so that
  the brand variant never depends on a network fetch.

## Routing contract

| Path                               | Kind                  | Cache               |
| ---------------------------------- | --------------------- | ------------------- |
| `/{locale}/p/{id}/opengraph-image` | file-convention image | `revalidate = 300`  |

The route is public and independently addressable. It repeats `getPlayer`'s
visibility check rather than trusting the page — the page and the image are two
separate requests and a crawler may fetch only the second.

**`revalidate = 300`, not 3600.** The hour used by `sitemap.ts` governs how
quickly a player becomes *findable*; this window governs how long a card
outlives a **takedown** — a project pulled by a moderator (0029/0030), a player
hidden, a player banned. Regeneration re-runs `getPlayer`, so eligibility is
re-derived rather than cached alongside the pixels. Per-player card URLs are
fetched only when someone actually shares a link, so the twelvefold shorter
window costs almost nothing.

`generateMetadata` in `app/[locale]/p/[id]/page.tsx` points `openGraph.images`
and `twitter.images` at this URL **explicitly**, built as
`` `${localizedUrl(path, locale)}/opengraph-image` ``. It is not left to Next's
file-convention auto-injection: `lib/seo.ts` already documents that an explicit
`openGraph` block suppresses it, and this page has one.

For a player who does not resolve, `generateMetadata` returns early (existing
behaviour) and never emits an image URL — so the brand variant of the image is
reached only by direct request, never advertised.

## UI surface

| Surface                                    | Control                 | Shares                    |
| ------------------------------------------ | ----------------------- | ------------------------- |
| `app/[locale]/p/[id]/page.tsx` header      | `ShareButton`           | that player's page        |
| `app/[locale]/download/page.tsx` hero      | `ShareButton`           | the download page         |

`ShareButton` is `"use client"`. Both call sites are server components; each
passes an **absolute** URL built server-side from `localizedUrl(...)`. The
component never derives its own URL from `window.location`: the download page's
control shares a different address than the one the visitor is reading, so a
`location.href` default would be wrong exactly where nobody would check it.

## Card composition

Reuses the root card's palette so the two read as one family
(`app/opengraph-image.tsx` is not modified and not imported — its composition is
a full-bleed hero, this one is a two-column layout, and sharing code between them
would mean parameterising a file this change has no other reason to touch).

```
┌──────────────────────────────── 1200×630 ────────────────────────────────┐
│  sky gradient (#8fb8d0 → #c4dce8 → #e8d5a8), same three stops as root    │
│                                                                          │
│   ┌──────────┐    <username>                          (64px, clamped)    │
│   │   tree   │    #3  ALL TIME    #7  LAST 30 DAYS    (gold / small caps)│
│   │  sprite  │    ▸ <project name>                     (32px, clamped)   │
│   └──────────┘                                                           │
│                                                    Token Forest (44px)   │
│  ──────────────────────── ground strip #3a7d44 ───────────────────────── │
└──────────────────────────────────────────────────────────────────────────┘
```

Brand variant: tree at stage 8, no name, no ranks, wordmark centred.

Sprite selection reuses the page's own mapping — `TREE_PREFIX` + `spriteStage` in
`app/[locale]/p/[id]/page.tsx`. Both files need it, so it moves to
`lib/leaderboard-format.ts` beside the other board formatters, and the page
imports it from there. This is the only pre-existing file this change refactors,
and only because a second consumer appeared.

Sprites are read from disk with `readFileSync` and embedded as data URLs, exactly
as the root card does — Satori cannot fetch remote images, and every sprite is
already in `public/sprites/`.

## Font handling

Satori ships a Latin-only face.

**Detection input is every variable string the card draws — the display name and
the project name, concatenated — never the name alone.** A Latin name beside a
Chinese project name is the case name-only detection gets wrong, and it is not
rare. The family is chosen from that concatenation.

**Subset request text is every string drawn on the card**, the fixed Latin ones
included (`ALL TIME`, `LAST 30 DAYS`, `Token Forest`, `#` and the digits). When
a font list is supplied, the renderer uses only that list, so a subset covering
the name but not the rank captions would draw boxes for the captions instead.

**The fallback omits both the name and the project name, never one of the two.**

| Script detected in name + project name               | Family requested |
| ------------------------------------- | ---------------- |
| Hangul (U+AC00–U+D7AF, U+1100–U+11FF) | `Noto Sans KR`   |
| Kana (U+3040–U+30FF)                  | `Noto Sans JP`   |
| Han (U+3400–U+9FFF, U+F900–U+FAFF)    | `Noto Sans SC`   |
| Anything else above U+02FF            | `Noto Sans`      |
| Nothing above U+02FF                  | none — no fetch  |

Order matters: Hangul first, then kana, then Han. A Japanese name mixing kanji
and kana must resolve to JP, which covers both; SC covers neither kana nor
hangul.

Fetched from the Google Fonts CSS endpoint with `text=` set to that full string,
which returns a subset of a few kilobytes rather than a multi-megabyte CJK face.

**The request sends a deliberately ancient `User-Agent`.** The modern one gets
woff2 back, and Satori cannot parse woff2 — the card would silently lose its
text. The old UA makes Google serve TTF.

**That UA trick is an assumption about someone else's server, so it is checked,
not trusted.** Google documents the CSS response as user-agent-tailored, which
means it is free to change. Two gates:

1. The CSS is accepted only when the `src` it yields declares
   `format('truetype' | 'opentype' | 'woff')` or ends in `.ttf` / `.otf` /
   `.woff`. A woff2 URL is treated as a *failure*, not as something to try.
2. The downloaded bytes must open with a recognised sfnt tag — `00 01 00 00`,
   `true`, `ttcf`, `OTTO`, or `wOFF`. `wOF2` and anything unrecognised is a
   failure.

Both failures take the UB2 path.

**Draw-time failures need an eager render boundary, not a bare `try`.**
`next/og` renders inside the async `start()` of a `ReadableStream`, so
`new ImageResponse(...)` returns before layout has happened and a
`try { return new ImageResponse(...) }` catches nothing. The buffer is therefore
drained with `await res.arrayBuffer()` **inside** the `try`, and the bytes are
re-wrapped in a `Response` carrying the original headers. Without this, a font
the renderer rejects escapes as a broken stream — the "no card at all" outcome
the whole chain exists to prevent.

One `AbortSignal.timeout(2500)` covers the CSS fetch and the font fetch together,
so adding the second request did not double the worst case a crawler can be made
to wait. **The signal is created once and passed to both fetches**, which is the
point — a per-fetch timeout would silently allow 5 s.

## Data requirements

`getPlayer(id)` only — already exists, already filters held and hidden players
(view `leaderboard_public`, migrations 0025/0031). No new query, no new column,
no migration.

Fields read: `username`, `tree`, `stage_index`, `project_name`, plus
`lifetimeRank` / `recentRank` from the same call. Everything else on the entry is
deliberately unread (**U3**).

## External dependencies

| Dependency                                   | Version | Used for              | Failure behaviour             |
| -------------------------------------------- | ------- | --------------------- | ----------------------------- |
| `next/og` (`ImageResponse`)                  | next 16 | drawing the card      | n/a — build-time present      |
| `fonts.googleapis.com` + `fonts.gstatic.com` | —       | CJK/other subset (E8) | card drawn without name or project (UB2) |
| `navigator.share`                            | browser | native panel (E1)     | clipboard path (E4)           |
| `navigator.clipboard.writeText`              | browser | copy (E4)             | selectable text (UB1)         |

No new package. `next/og` is already used by `app/opengraph-image.tsx`.

## i18n

Four locales (`en`, `zh`, `ja`, `ko`) — the repo carries four message files even
though `install.json`'s `supported_locales` lists two; the files are the source
of truth and all four stay key-identical (383 keys before this change).

| Key          | Namespace         | en                                                          |
| ------------ | ----------------- | ----------------------------------------------------------- |
| `share`      | `Share`           | Share                                                       |
| `copied`     | `Share`           | Copied                                                      |
| `copyManual` | `Share`           | Copy this address                                           |
| `shareAria`  | `PlayerPage`      | Share {username}'s page                                     |
| `shareText`  | `PlayerPage`      | {username}'s forest on Token Forest                         |
| `shareDownload` | `Share`        | Send this to someone                                        |
| `downloadText` | `Share`         | Token Forest — the tokens you spend in Claude Code and Codex grow a pixel tree on your desktop. Free, Windows and macOS. |

Nothing drawn **inside** the card image is translated (**U4**).

## Boundary contracts

- **`player-page.md`** owns `robots` and the sitemap rule. This change reads
  `hasProject` nowhere and must not alter indexing behaviour.
- **`project-showcase.md`** owns what may be published from a project. This
  change publishes strictly less than the page already does (name only).
- **`rolling-board.md`** owns `ShowcaseCard`'s shape. A per-card control shipped
  there first and was then removed at the CEO's direction (spec § 8); the board's
  own spec is updated in this same change (constitution § 5) so it does not
  describe a card that no longer exists. `ShowcaseCard` is back to the props it
  had before this feature.
- **`player-page.md`** owns the player page's visible contents and its share
  card. Both change here — a control in the header, and a picture that is no
  longer the site-wide one — so it is updated in this same change too.

## File locations

**New**

- `components/share-button.tsx`
- `app/[locale]/p/[id]/opengraph-image.tsx`

**Modified**

- `app/[locale]/p/[id]/page.tsx` — header control; `openGraph`/`twitter` images
- `app/[locale]/download/page.tsx` — hero control
- `components/leaderboard/showcase-card.tsx` — a per-card control was added and
  then removed; the file ends this change with the props it started with
- `app/[locale]/leaderboard/recent/page.tsx` — its private copies of
  `spriteStage` / `TREE_PREFIX` give way to the shared ones
- `app/[locale]/leaderboard/page.tsx` — same, plus an orphaned local map removed
- `lib/leaderboard-format.ts` — `TREE_PREFIX` / `spriteStage` / `treePrefix` /
  `spriteFile` live here now
- `lib/leaderboard.ts` — `getPlayer` bounds its rank counts, checks their errors,
  and counts with the board's own tie-break
- `messages/{en,zh,ja,ko}.json` — 7 keys × 4
- `docs/features/rolling-board.md` — the card no longer carries a control
  (constitution § 5)
- `docs/features/player-page.md` — the header gains a control; the card picture
  is no longer the site-wide one (constitution § 5)

## Scenario → automated test map

`test_required = false` for this project; Stage 6 is skipped. Scenarios 3.2, 3.3
and 3.9 are marked `[Required automated test]` in the spec and are therefore
**carried as a known gap**, verified by the Stage 7 smoke procedures until a test
framework exists.
