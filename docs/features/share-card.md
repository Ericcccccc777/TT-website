# Feature: Share — a button to send it with, and a card that looks like you

## Status: FINALIZED 2026-08-21

## 1. What this feature is for

A player who fills in their project now gets a page of their own. But the page
never tells them it can be sent to anyone, and when it is sent, the picture that
shows up in the chat thread is the same one every other page on this site
produces — the same tree, the same words, whoever shared it.

Both halves of that are wrong for a page whose entire reason to exist is "this
one is mine."

This feature adds the button that says the page can be shared, and makes the
picture that travels with it show the player's own forest.

## 2. Happy path

### 2.1 Sharing from a player's own page

1. A player opens their page and sees a **Share** control beside their name.
2. On a phone, pressing it opens the phone's own sharing panel — the one with
   their messaging apps in it — pre-filled with their page's address and a short
   line of text.
3. On a computer, pressing it copies the address instead, and the control says
   **Copied** for a couple of seconds before going back to normal.
4. They paste it into a chat.
5. The chat shows a card: **their tree**, their name, where they stand, and — if
   they have one — their project's name. Not a generic site picture.

### 2.2 Sharing the download page

1. A visitor on the download page sees a **Send this to someone** control.
2. It behaves as 2.1, and shares the download page.
3. The card that shows up is the site's ordinary one — a download page is not
   anybody's personal page and should not pretend to be.

### 2.3 What the personal card shows

**The governing rule, from which every case below follows: the card never shows
anything the player's own page would not show to a stranger, and the card's
address is checked for itself.** It is a public address of its own — a chat app
fetches it without ever loading the page — so it repeats the same eligibility
test rather than assuming the page already passed one.

Every player's card is the same shape, filled with their own facts:

| Part            | What it is                                                         |
| --------------- | ------------------------------------------------------------------ |
| The tree        | Their species at the stage they have actually reached              |
| Their name      | As it appears on the board                                         |
| Where they rank | Their all-time position; their monthly position when they have one |
| Their project   | The project name alone — never the description, never the picture  |
| The brand       | The product name, so a stranger knows what they are looking at     |

## 3. Edge-case behavior

### 3.1 Words on the card that are not written in the Latin alphabet

The picture is drawn from scratch by us, using a typeface we supply. The typeface
we currently supply covers the Latin alphabet only, so a Chinese, Japanese or
Korean name would come out as empty boxes — on the one surface where a player's
name is the whole point.

**Two things on the card are the player's own words: their name and their
project's name.** Either one can be in an alphabet we do not ship, and they can
differ — an English name beside a Chinese project is ordinary. So the check
covers both together, never the name alone.

#### Behavior (CEO sign-off)

- Before drawing, we fetch just the letters that card actually uses — both the
  player's words and our own fixed ones — in a typeface that has them.
- If that fetch fails, takes too long, or comes back as something we cannot draw
  with, we draw the card **without either the name or the project name** rather
  than with broken boxes. Dropping one and keeping the other would simply move
  the boxes. The tree, the rank and the brand still make a card worth looking at.
- The fixed words on the card (the product name, the rank marker) are always
  Latin and never depend on this.
- **A card without those words is still that player's card, not a generic one.**
  It carries their tree and their standing, and — the part that makes this safe —
  every chat app shows the player's name as ordinary text beside the picture,
  drawn by the reader's own device from a typeface that has their alphabet. The
  name is never actually missing from the preview; it is only missing from the
  picture. Falling back to the generic card would throw away the tree and the
  rank to solve a problem that does not exist.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Open the personal page of a player whose name is in Chinese, Japanese or Korean.
2. Look at the card picture for that page directly.
3. Then do the same for a player whose **name is in English but whose project's
   name is not** — the ordinary case the rule above exists for, and the one a
   name-only check would get wrong.

**Pass criteria:**

- In both cases every word renders as readable characters, not boxes or blanks.
- Neither case shows one of the two words drawn and the other missing.

**Failure signals:**

- Tofu boxes (□□□) where the name should be.
- The whole picture fails to appear.

### 3.2 A player who is hidden, banned, or does not exist

Their page already shows the ordinary not-found screen, deliberately
indistinguishable from an address that never existed.

#### Behavior (CEO sign-off)

- The card picture for such an address behaves the same way: it produces the
  **generic site card**, never a personal one, and never any hint that a
  particular player used to be there.
- This holds even when the address is requested directly rather than through the
  page — the picture is a public address of its own and cannot rely on the page
  having checked first.

#### Classification

[Required automated test]

#### Smoke test procedure

**Reproduce:**

1. Take the card-picture address of a real player and change the player part to
   something that does not exist.
2. Open it.

**Pass criteria:**

- A generic card appears, or nothing does. No player name, no rank, no project.

**Failure signals:**

- A card showing a real player's details.
- An error page that says something different from what an unknown address says.

### 3.3 A player whose gains are being held for cheating

These players stay on the board with a reduced score, and everything they wrote
about their project is already withheld from the website entirely.

#### Behavior (CEO sign-off)

- Their card shows the tree, the name and the rank, and **no project line** —
  the same as a player who never filled one in. Nothing special is added for
  this case; it falls out of the withholding that already happens.
- The tree, the name and the rank are on these players' own pages already —
  they stay listed, only their project is withheld — which is exactly why the
  card may carry them: 2.3's rule measured against the page, not a separate
  allowance made here. Anything withheld from the page is withheld from
  the card by the same act of withholding, not by a second rule that could drift
  out of step with the first.

#### Classification

[Required automated test]

#### Smoke test procedure

**Reproduce:**

1. Open the card picture of a player currently being held.

**Pass criteria:**

- No project name appears on the card.

### 3.4 A player who collected nothing in the last thirty days

#### Behavior (CEO sign-off)

- The card shows their all-time position only, and simply omits the monthly one.
- No dash, no zero, no empty label — an absent line reads better on a small
  picture than a placeholder does.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Open the card picture of a player who is on the all-time board but not the
   monthly one.

**Pass criteria:**

- One rank is shown, the layout does not look like something is missing.

### 3.5 The sharing panel is not available

Most computer browsers have no system sharing panel, and some phone browsers
refuse it outside a secure connection.

#### Behavior (CEO sign-off)

- The control is labelled **Share** everywhere, always, and never changes. What
  differs is what pressing it does: the sharing panel where there is one, a
  straight copy where there is not.
- Copying reports itself — the control says **Copied** for a couple of seconds —
  so a player on a computer is never left wondering whether anything happened.
- A label that is decided while the page loads would visibly flip under the
  player's eyes on exactly the devices that have a panel. One honest word that
  covers both outcomes is better than two words that swap.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Open a player page on a desktop browser.

**Pass criteria:**

- The control reads **Share**, and pressing it says **Copied**.

### 3.6 The player dismisses the sharing panel, or the panel itself fails

The browser reports "the player closed the panel" and "the panel broke" in the
same way, and the two need opposite responses.

#### Behavior (CEO sign-off)

- **Dismissed:** nothing happens. No error, no message, no change — the player
  chose not to share, which is not a fault.
- **Failed for any other reason:** fall through to copying, exactly as if there
  had been no panel at all (3.5). A phone whose panel is broken must not be a
  dead end while the same phone can copy perfectly well.
- The two are told apart by which reason the browser gives; a dismissal is the
  only one treated as "nothing happened".

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. On a phone, press Share, then dismiss the panel without choosing anything.

**Pass criteria:**

- The page is unchanged and shows no error, and the control does **not** say
  Copied — a dismissal must not silently copy instead.

### 3.7 Copying is refused by the browser

#### Behavior (CEO sign-off)

- The control reveals the address as selectable text so the player can copy it
  by hand. This is the last step of the chain and always happens — there is no
  branch in which pressing the control produces nothing at all.
- It never claims **Copied** when nothing was copied.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Open a player page over a plain, non-secure connection.
2. Press the control.

**Pass criteria:**

- The address appears as selectable text. The control must not say "Copied", and
  must not do nothing at all.

### 3.8 A player changes their name, tree or project

#### Behavior (CEO sign-off)

- The card picture may lag behind by **up to five minutes**, then redraws from
  scratch.
- A link already sitting in somebody's chat thread keeps whatever card the chat
  app captured at the time. That is how every chat app works, it is not ours to
  fix, and it is the reason the window below is short rather than generous.
- **Five minutes, not an hour.** The hour we accept for the search-engine listing
  is about a player becoming *findable* — being late there costs nothing. This
  window also governs how long a card outlives a **takedown**: a project pulled
  by a moderator, a player hidden for cheating, a player banned. Those are the
  cases the window is sized for, and an hour of a pulled project still being
  drawn on a card would defeat the act of pulling it.
- Redrawing re-checks eligibility from scratch every time (2.3's rule), so a
  takedown clears the picture on the next redraw without anyone doing anything.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Change a project name in the desktop app and sync.
2. Wait five minutes, then re-request the card picture.

**Pass criteria:**

- The new project name appears.

### 3.9 The card cannot be drawn

The database may be slow, unreachable, or the request may arrive for a player
whose data is half-written.

#### Behavior (CEO sign-off)

- Fall back to the **generic site card**. Never fail outright: a chat app that
  receives an error shows no card at all, and a link with no card is worse than
  a link with a generic one.

#### Classification

[Required automated test]

#### Smoke test procedure

**Reproduce:**

1. Not reproducible by hand — covered by the automated check.

### 3.10 A name long enough to overflow the picture

Names on the board can be long, and the picture is a fixed size.

#### Behavior (CEO sign-off)

- The name shrinks to one line and is cut with an ellipsis if it still does not
  fit. It never wraps onto the tree, and it never pushes the rank off the card.
- The same applies to a project name.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Open the card picture of the player with the longest name on the board.

**Pass criteria:**

- Everything stays inside the picture, nothing overlaps.

## 4. Who can use this

- **The share control**: everyone, on the two pages that carry one. No sign-in,
  nothing to enable.
- **A personal card**: produced for any player who appears on the board.
  Players who are hidden, banned or unknown get the generic card.
- Nothing here can be written to by anyone. The share controls only read what is
  already on the page.

## 5. External dependencies (plain language)

- **The visitor's browser**, for the sharing panel and for copying. Both are
  optional capabilities; the feature degrades in a fixed order when they are
  absent (3.5, 3.7).
- **A typeface source**, for any words on the card not written in the Latin
  alphabet — the player's name, their project's name, or both (3.1). When it is
  unreachable the card is drawn without either of them, rather than not drawn.
- **Our own database**, for the facts on the card. When it is unreachable the
  generic card is served (3.9).

## 6. Deferred / unresolved

- **The player's own project picture on the card.** It would be the most
  eye-catching thing on it, but the pictures are stored in a format that several
  chat apps render unreliably or not at all, which produces a blank thumbnail
  with nothing logged anywhere. Doing it properly means converting on the way
  out. Deferred until someone asks.
- **A share control on either board.** Neither the all-time table nor the
  last-30-days cards carry one. The table's rows are too narrow to hold anything;
  the cards had one and it was removed — twenty of them down a scrolling page
  competed with the projects the board exists to show, and a visitor who wants to
  pass someone on is one click from the page that has the control. On both boards
  the player's name is the way through.
- **Anything for visitors inside a chat app's built-in browser.** Someone who
  opens our link inside a messaging app lands in a cut-down browser where
  downloading a desktop installer mostly does not work. Whether that is worth
  handling depends on how many visitors arrive that way, and we do not have that
  number yet.
- **A count of how often the controls are pressed.** Worth having before
  deciding anything else here; not part of this round.
- **Telling an outage apart from an unknown player.** Both produce the generic
  card, on purpose — a stranger must not learn which one happened. That also
  means we cannot see the difference either, and this project has nowhere to
  send that signal today. When error tracking exists, the generic-card path is
  the first thing that should report itself.

## 7. Out of scope

- Sharing to a specific named service (no "post to X" buttons).
- Any change to what the desktop app does.
- Any change to who is listed with search engines — that rule is unchanged and
  belongs to the personal-page feature.
- Shortened links.

## 8. Decision history

- **The share control lives on the player's own page and nowhere near the
  boards.** It shipped on each rolling-board card first; seen on a real board it
  was twenty repetitions of the same control competing with the projects the
  board is there to show. The name already leads to the page, and the page is
  where the thing being shared actually is. — CEO, 2026-08-21
- **Scope is the button plus the personal card; the chat-app-browser handling is
  not in it.** That handling exists to solve a mobile-app-store problem we do not
  have, and its cost is only justified by traffic we cannot yet measure. — CEO,
  2026-08-21
- **The project picture stays off the card.** A blank thumbnail on the channels
  this is most shared through is worse than a card without a picture. Revisit
  with the conversion step, not without it. — Tech Lead, pending CEO confirmation
- **A card that cannot be drawn degrades to the generic one, never to an error.**
  A link with no card at all is the worst outcome, and it is the one an error
  produces. — Tech Lead, pending CEO confirmation
- **The player's words are dropped rather than drawn broken when their typeface
  cannot be fetched — and that means both of them, together.** Boxes where a name
  should be look like a bug to the person sharing; absent words look like a
  design. Dropping the name but keeping the project name would only move the
  boxes, so neither is drawn without the other. The auditor asked whether such a
  card should degrade to the generic one instead; it should not, because the name
  still reaches the reader as text beside the picture. — Tech Lead, pending CEO
  confirmation
- **The first draft of this decision said "the name", and the spec kept saying so
  in three places after the rule had changed.** Recorded because the correction
  had to be made three times: the rule, the dependency it rests on, and the
  decision that chose it. — Auditor finding, accepted 2026-08-21
- **One rule governs the card, stated in 2.3, instead of per-case permissions.**
  The auditor found the held-player case reasoning from its own logic rather than
  from a shared rule — two rules for one question is how they drift apart.
  — Auditor finding, accepted 2026-08-21
- **A failed sharing panel falls through to copying; only a dismissal is
  silent.** The first draft collapsed both into "nothing happens", which left a
  phone with a broken panel unable to share at all. — Auditor finding, accepted
  2026-08-21
- **The card's freshness window is five minutes, not the hour used for search
  listings.** The two windows look alike and are not: one delays a player
  becoming findable, the other delays a takedown taking effect. — Auditor
  finding, accepted 2026-08-21
- **One constant label, never swapped.** Deciding the wording from what the
  browser can do means it changes after the page has already been drawn — a
  visible flip on precisely the devices that have a sharing panel. "Share" is
  true of both outcomes. — Tech Lead, pending CEO confirmation
- **No flag on the card.** Drawing a flag means fetching an emoji picture from
  somewhere else every time a card is drawn, for decoration. The tree already
  carries the identity. — Tech Lead, pending CEO confirmation

## 9. (Audit mode only — leave empty in new-feature mode) Code vs spec delta
