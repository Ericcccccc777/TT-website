# Project showcase — execution plan

Transient. Delete at the Stage 8 commit that ships the implementation.

Spec: `project-showcase.md` (behaviour) · `project-showcase-implementation.md` (constraints).
Already landed: migrations `0022`/`0023` (columns, validation, bucket), `0024` + the
`next.config.ts` narrowing (image host pinned — applied and tested live).

## Order, and why it matters

1. **DB first** (§1). The website cannot read what does not exist, and §2 changes
   `getLeaderboard` to read a view that §1 creates.
2. **Data layer** (§2) before UI (§3) — the UI is typed off `LeaderboardEntry`.
3. **Ranger** (§4) can be built in parallel with §3; they touch no common file.
4. **Gates 3 and 4** (§5) before launch, in any order.
5. i18n keys (§6) land in the same commit as the UI that reads them.

## §1 Database

### 1.1 `supabase/migrations/0025_project_visibility.sql` — NEW

| what                              | detail                                                                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `leaderboard_project_allowances`  | `user_id PK → auth.users`, `allowed_by text`, `created_at timestamptz default now()`. RLS **enabled with no anon/authenticated policy** = deny-all; only `service_role`. Mirrors `0005`'s bans table exactly.                                           |
| `public.is_project_allowed(uuid)` | `security definer`, `stable`, `set search_path = ''`. Same reason as `0005`'s `is_banned`: the view must consult a table `anon` cannot read.                                                                                                            |
| `public.leaderboard_public` view  | Every column `getLeaderboard` selects today, plus the four project fields returned as `NULL` when `held_tokens > 0 AND NOT is_project_allowed(user_id)`.                                                                                                |
| revoke                            | `revoke select (project_name, project_desc, project_url, project_image) on public.leaderboard from anon;` — `authenticated` keeps them (the desktop app's `INSERT … ON CONFLICT DO UPDATE` needs SELECT on every column it reads, per `0023`'s header). |
| grant                             | `grant select on public.leaderboard_public to anon, authenticated;`                                                                                                                                                                                     |

**⚠️ The view must be `security_invoker = true`.** Without it the view runs as its
owner and the ban RLS (`0005:57-62`) stops applying — every banned player comes
back onto the board. `0021` documents this exact trap for the usage views.

**⚠️ Do not expose `held_tokens` or `raw_score` through the view.** The rule is
applied inside it; the inputs stay unreadable.

Self-check block at the end, in the house style: view returns the same row count
as the board does today; a held-and-not-allowed account returns four `NULL`s; the
same account with an allowance returns its values; `anon` selecting
`project_name` from the base table now fails with `42501`.

### 1.2 Apply order

`0025` must be run **before** §2 ships, or the site queries a view that does not
exist and every visitor sees the empty state (`lib/leaderboard.ts:108-110`).

## §2 Data layer

### 2.1 `lib/leaderboard.ts`

- `LeaderboardEntry` (`:12-29`) — add `project_name?`, `project_desc?`,
  `project_url?`, `project_image?`, each `string | null`.
  **Optional, not required.** `lib/leaderboard-boards.ts:122` extends this type
  and `:193-206` builds it from an explicit literal with no spread; four required
  properties fail `tsc --noEmit` or force an edit to the out-of-scope value board.
- `getLeaderboard` (`:102`) — read `leaderboard_public` instead of `leaderboard`,
  and add the four columns to the select string.
  **Both edits or neither**: the `as LeaderboardEntry[]` cast at `:127` hides a
  type-only change, and nothing in the toolchain catches it.
- Coerce explicitly after the spread, matching `:115-125`.
- Never `select("*")`.

### 2.2 Nothing else in `lib/`

`lib/leaderboard-boards.ts` is untouched — that is the point of the fields being
optional.

## §3 UI — the panel

### 3.1 Component shape

The panel row must be a `<tr><td colSpan={4}>` sibling of the player row inside a
keyed `<Fragment>`; `<div>` and `<details>` are hoisted out of `<tbody>`.
Single-open state has to live above the rows, but the _content_ must be
server-rendered so it is in the HTML from first paint (settled decision 3).

So: a context provider around `<tbody>`, with two small client islands per row.
This matches the existing idiom — `TreeModalButton` is already a client island
inside a server-rendered `<td>` (`page.tsx:307`).

| file                                                    | kind   | responsibility                                                                                                                                              |
| ------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/leaderboard/project-showcase.tsx` — NEW     | client | `ProjectShowcaseProvider` (owns `openId`), `ProjectTrigger` (the marker button), `ProjectPanelRow` (the `<tr>`, renders `children` and controls visibility) |
| `components/leaderboard/external-link-dialog.tsx` — NEW | client | the interstitial                                                                                                                                            |
| `app/[locale]/leaderboard/page.tsx` — EDIT              | server | wrap `<tbody>`; emit `<Fragment>` per entry; render panel content as `children`                                                                             |

### 3.2 `ProjectTrigger`

- A `<button>` inside the username cell — never a clickable `<tr>`.
- `aria-expanded`, `aria-controls` → the panel cell's id, derived from `entry.id`.
- Rendered only when the entry has a project name (trimmed non-empty).
- Collapsing returns focus to it. `Escape` closes.
- Copy no single existing widget: repo-wide `aria-controls` appears exactly once
  (`components/top-bar.tsx:423`, which never restores focus), and
  `top-bar.tsx:169-172` restores focus but its trigger has no `aria-controls`.

### 3.3 `ProjectPanelRow`

- Always emitted for entries with a project; hidden with the `hidden` attribute
  or `display:none` so it leaves the accessibility tree too. Not opacity/height.
- `min-w-0` + `overflow-wrap:anywhere` + `word-break:break-word` on the cell and
  every text node in it. Binding case is an 80-character description with no
  spaces — the cell sits inside `overflow-hidden` (`page.tsx:231`), so unshrinkable
  content is **clipped, not scrolled**.
- No `row-slide-in` (it translates X by 60px, `globals.css:363-373`). No
  `prefers-reduced-motion` guard — `globals.css:979-988` already covers it.
- `aria-labelledby` → the project-name element.
- The `<img>` mounts only when open; `next/image`, fixed width/height,
  `objectFit: contain`, `loading="lazy"`, never `priority`, `alt=""` (decorative —
  the name is already the heading), `onError` → drop the image and reflow to text
  only. **A missing object answers HTTP 400, not 404** — do not status-check,
  use `onError`.
- Cache-bust the image src with a token from `updated_at`. Verified safe:
  `matchRemotePattern` skips the search check when `search` is unset.

### 3.4 `ExternalLinkDialog`

- The trigger stays a real `<a href>` carrying
  `target="_blank" rel="noopener noreferrer nofollow ugc"`, so middle-click,
  ⌘-click and "copy link address" keep working. Intercept **plain left-click
  only** (primary button, no modifier keys) and `preventDefault()`.
- Visible text and dialog text are both the parsed **hostname**, never the href.
- Confirm → `window.open(url, "_blank", "noopener,noreferrer")` — the string form.
  A bare `window.open` hands the destination a live `window.opener` to our page.
- `role="dialog"` + `aria-modal="true"`, focus trapped, `Escape` and backdrop
  dismiss, focus returns to the link. Written fresh —
  `components/tree-modal.tsx` never restores focus.

### 3.5 `page.tsx` edits

- Import and wrap; no change to the `<colgroup>` (four columns is what makes
  `colSpan={4}` correct, including where column 3 is hidden at `:253-256`/`:348-349`).
- Key on `entry.id`, never rank or index — the query has no tie-break (`:105`).
- Project text goes through `t()` **as a value, never as a key** (`:277`, `:310`),
  and never into `generateMetadata` or JSON-LD.

## §4 Ranger — the allowance switch

| file                           | change                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ranger/data.ts`           | `:48`, `:170` — add the four project columns and an `allowed` flag (join `leaderboard_project_allowances`) to the admin reads. Admin reads the **base table**, not the view.                                                                                                                                  |
| `app/ranger/actions.ts`        | `allowProjectAction` / `disallowProjectAction`. Both re-verify `getAdminUser()` before writing, matching `banAction`/`unbanAction`. Write `allowed_by` from the admin's email. `revalidatePath("/ranger")` **and** `/[locale]/leaderboard` — settled decision 4 requires the board to reflect it immediately. |
| `app/ranger/[userId]/page.tsx` | The switch beside a held account, plus a read-only preview of what that player published (name / description / link / image) so the decision is informed.                                                                                                                                                     |

An allowance on an unheld account is a no-op; do not special-case it.

## §5 Remaining launch gates

Both must land before this ships. Neither is written yet.

- **Gate 3 — takedown.** A ranger action that clears the four fields for one
  player without hiding them, plus deleting the storage object. **Open question
  first:** whether a server-side clear survives the desktop app's next sync.
  `app/[locale]/privacy/page.tsx:144` publishes that the app clears these fields
  on sync when the switch is off — which suggests the app pushes local state and
  would overwrite us. Confirm against the app before building the action.
- **Gate 4 — bucket enumeration.** `0022:227-230` grants `anon` SELECT on
  `storage.objects` for this bucket; an anon list call returns the whole inventory
  with names (`<user_id>.<ext>`), timestamps and sizes. Narrow or drop that
  policy. Note it compounds with the ban model: a ban filters the row rather than
  deleting it, so `0022:252-253`'s cleanup never fires and a banned uploader's
  object stays enumerable.

## §6 i18n

`messages/{en,zh,ja,ko}.json`, flat `LeaderboardPage` namespace, **all four in the
same commit**. Currently 61 keys each, byte-identical sets, zero `project*`.

Keys: trigger label (expand / collapse), panel heading, link label, dialog title,
dialog body, dialog confirm, dialog cancel. A missing key is not a crash — it
renders the literal `LeaderboardPage.<key>` to that locale's visitors.

## Not in this plan

- The value and usage boards (out of scope, `project-showcase.md`).
- Any change that lets the website write project data — it is read-only by design.
- Re-screening existing rows against a grown word list (accepted risk).
- A test runner. There is none, and this feature does not introduce one.

## Verification

`npm run type-check`, `npm run lint`, `npm run build` all green, four locale files
at equal key counts, then the numbered smoke procedure in `project-showcase.md`
**on the deployed URL** — this is the first remote image the website has ever
rendered in production.
