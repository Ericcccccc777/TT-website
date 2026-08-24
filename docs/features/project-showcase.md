# Project showcase — a player's own work, on the leaderboard

A player can describe something they built: a name, a one-line description, a
link and a picture.

The website only ever **shows** this. Everything is written in the desktop app,
in its leaderboard settings, and is off by default. Nothing on the website can
create, edit or remove it.

## Happy path

1. A player fills in their project in the desktop app and syncs.
2. On the last-30-days board their card shows the project in full — picture,
   name, description, link — with nothing to click first.
3. Their own page shows the same thing, larger, at an address they can send to
   anyone. Clicking their name on either board opens it.
4. Because they have a project, that page is one we tell search engines about.

## The collapsed panel is gone

The first version of this feature put the project behind a small triangle beside
the player's name on the all-time board: press it and a panel opened between that
row and the next.

**That has been removed.** It was the wrong shape for the job in two ways. A
visitor scanning the board had no reason to press a triangle — it promised
nothing, so nobody pressed it, and the work stayed invisible. And a table row is
too narrow to ever hold the thing itself, which is why the panel existed at all.

The two surfaces that replaced it show the project outright: the last-30-days
board (`rolling-board.md`) and the player's own page (`player-page.md`). The
all-time board now carries no project marker at all — the player's name links to
their page, which is where the work lives.

## What counts as having a project

**The project name decides it.** A player with a name has a project; a player
without one does not, no matter what else they filled in. The name is the
showcase's heading — without it there is nothing to announce the block by, and a
visitor using a screen reader would be handed a region with nothing readable at
the top of it.

Everything else is optional and simply absent when empty:

| filled in           | what is shown                         |
| ------------------- | ------------------------------------- |
| name only           | the name, alone                       |
| name + description  | both, no space reserved for a picture |
| name + picture      | the name and the picture              |
| all four            | all four                              |
| picture but no name | **nothing at all** — never shown      |

Nothing ever reserves an empty slot. A player with no picture gets a block that
is simply shorter, not one with a gap in it.

## The link

Shown as the site's address — `example.com` — never as the full raw link.

The reason is trickery. An address can be made to read like a site it is not:
characters that render as ordinary letters but are not, and characters with no
width at all. The name and the description are screened for that kind of thing,
and the picture's address is pinned so tightly that none of it can appear there.
The link is the one thing that is not screened — so we only ever show the part of
it that names the site.

**Clicking it does not leave the site straight away.** A small box appears first,
naming the destination and saying plainly that it is someone else's site, that we
do not run it and cannot vouch for what is on it. From there the visitor can go
anyway — which opens it in a new tab — or stay. Closing the box, pressing Escape
or clicking outside it all mean "stay".

We chose this over screening what a player may link to. Screening a web address
is a losing game: anyone can register a new one, and a list of forbidden ones is
always a day behind. Telling the visitor where they are about to go, and letting
them decide, works regardless of what the address is.

Search engines are still told we do not vouch for it — the leaderboard is a page
with real standing, and without that signal it becomes a place people publish
links to farm it.

**What this does not cover:** the address itself is still printed on the page as
readable text, and nobody screens it. A player can register a deliberately
offensive-looking address and it will appear on the board. The remedy for that is
the takedown action listed below, not the warning box.

**A takedown hides, it does not destroy.** Blocking a project stops the board
carrying it and stops us accepting any further version of it, and that is all:
what the player wrote stays in our records so the admin can see what they acted
on, and lifting the takedown puts it straight back. The uploaded picture is not
deleted either — the desktop app will not re-upload a picture it believes it has
already sent, so deleting one here would take it away permanently, which is the
wrong outcome for a switch that is meant to be reversible. The consequence worth
knowing: while a project is taken down the board publishes none of it, but the
picture itself stays fetchable by anyone who works out its address. If a picture
must genuinely be gone, that is a separate, deliberate deletion — not something
a reversible switch should do behind the admin's back.

## The picture

A fixed-size thumbnail. Whatever shape a player uploads, it is fitted inside
that box — nothing a player can upload changes the board's layout.

Pictures are the only expensive part of this feature, and the last-30-days board
now shows every one of them at once rather than on demand. That is a deliberate
trade — invisible work was worth less than the bandwidth it saved — and it is why
the size limit per picture is load-bearing rather than a tuning knob.

**Turning the showcase off takes the picture down too.** Clearing the project —
whether by switching the whole showcase off or by only emptying the name — also
removes the uploaded picture from our side at the next sync. The one thing this
cannot cover is a switch-off that never reaches us at all: done offline, or with
a stale sign-in, the entry and the picture stay as they were until an attempt
gets through. Write to us and we will remove it by hand.

**If the picture cannot be loaded, the text is shown alone** — exactly what a
player with no picture gets. No broken frame, no "failed to load"
notice. A picture can go missing for real reasons (a player removed it and the
removal only half-completed) and for boring ones (the visitor's connection
faltered), and in both cases the honest thing to show is what we do have.

When a player replaces their picture, the new one appears at that player's next
sync. It must not be possible to publish one picture, have it seen, and then
quietly swap it for another and have the old one keep showing indefinitely.
Whether the new picture genuinely turns over at that moment depends on the
desktop app and is one of the launch gates below.

## Whose project is not published

- **Players who filled in nothing.** Nothing to show, nothing shown.
- **Players hidden for cheating.** They are already absent from the board
  entirely — everything they wrote goes with them. This needs no separate rule.
- **Players whose gains are being held by the anti-cheat rules.** These players
  _stay_ on the board with a reduced score, and by default their project is not
  published anywhere. We have judged their numbers untrustworthy; handing the same
  account a promotional space with a live outward link says the opposite. Their
  card and their own page look exactly as if they had filled in nothing.

  **An admin can grant one anyway.** Beside a held player on the admin page there
  is a switch. Turning it on publishes that player's project while their gains
  stay held; turning it off hides it again. The board reflects the change
  immediately — it does not wait for that player to sync.

  Three details the admin page has to get right, because each one is a way of
  quietly doing the wrong thing:

  - **The permission outlives the project.** A player can clear their project and
    keep the permission. It does nothing at that moment, but it would publish
    whatever they write next without anyone looking. So the page shows the
    permission, and the button that removes it, even for a player who has written
    nothing — and says plainly that a leftover permission should usually be taken
    away.
  - **No switch for a hidden player.** A player hidden for cheating is off the
    board entirely, so granting them a permission would change nothing. The page says
    so instead of offering a button that appears to work. Taking a permission
    away stays available, always.
  - **When we cannot read the permission at all**, the page says so, and offers
    no switch — a guess is worse than an admission, and either button would fail
    the same way the reading did.

  This exists because the two judgements are separate. Holding a gain says "we do
  not believe this number." It does not say "this person may not describe what
  they built." Releasing every held token merely to let someone show a project
  would mean paying for one decision with another. The switch is a deliberate,
  recorded human act, the same way releasing a held gain already is.

## Where it appears

The tokens leaderboard family only. The forest-value and vendor-usage boards are
built differently and are deliberately out of scope.

Two surfaces, both showing it outright:

- **The last-30-days board** — in each player's card, no clicking. See
  `rolling-board.md`.
- **The player's own page** — larger, at a fixed address that can be sent to
  someone, and told to search engines when a project is present. See
  `player-page.md`.

The all-time board shows no project at all. It is a ranking table, and the
project belongs where there is room for it.

Same words and same picture on both surfaces, and the same rules decide who gets
to publish them.

## Must be settled before this goes live

Today the only ways to deal with a player who publishes something unacceptable
are to hide them from the board completely, or to edit the database by hand. The
admin page has no action that clears a project.

Two further problems make hand-editing unreliable:

- The word screening runs only when a player changes what they wrote. Text that
  passed when the word list was shorter stays published afterwards.
- The values live in the desktop app. Clearing them on our side may simply be
  written back on that player's next sync. What the app publishes about its own
  behaviour suggests this is the likely outcome, not the unlikely one.

**Four things must be true before launch:**

1. The admin page can clear one player's project without hiding the player.
2. Clearing it actually sticks against the desktop app's next sync.
3. Pictures can only ever come from our own storage, never a look-alike address.
4. A player whose gains are held shows nothing.

Until 1 and 2 hold, the only honest response to an incident is hiding the player
entirely — **and hiding a player does not take their picture down.** Its address
can be worked out from information the site already publishes, so it stays
reachable by anyone, not only by people who saw it on the board. Removing a picture
today means deleting it by hand.

## Known limitations (accepted for this version)

- ~~Which panel is open is not part of the page's address.~~ Obsolete: the
  collapsed panel is gone, and each player now has an address of their own.
- The words a player writes are part of the page from the moment it loads, so
  search engines and the AI assistants this site invites will read them and file
  them under our name. This is deliberate — the words cost nothing to include
  and help the page. Nothing waits for a click any more: on the last-30-days
  card and on a player's own page the picture loads with the rest of it. What we
  do keep back is the page's own hidden description, the line we hand a search
  engine as *our* summary — that stays in our words, never the player's.
- A player writes in whatever language they choose, and it sits beside text in
  the visitor's language. Nothing marks the switch for a screen reader, which
  matches how player names already behave on this site.

## Automated tests

**None.** This repository has no test runner of any kind, so there is nowhere for
an automated test to live. Every scenario below is verified by hand. Adding a
test runner is worth doing and is deliberately not bundled into this feature.

Two things the steps below cannot reach are checked at code review instead: that
project text never enters the page's hidden description for search engines, and
that the link carries the tags telling search engines we do not vouch for it.

## Smoke test (manual)

Run on the deployed site, not locally — the picture is fetched from our storage
rather than shipped with the site.

1. Open the last-30-days board. Confirm every player with a project name shows it
   in full on their card — picture, name, description, link — with nothing to
   click first, and that players without one show no project area.
2. Open the all-time board. Confirm there is **no** project marker anywhere on it,
   and that clicking a name opens that player's own page.
3. On a player page with a project, confirm the same four things appear.
4. Confirm the link shows an address rather than a full raw link, that the
   leaving-the-site notice appears first, and that going ahead opens a new tab and
   lands where it says.
5. On a phone-width screen, confirm no card or page slides sideways and no text is
   cut off.
6. In the desktop app, remove the picture but keep the name. Sync, reload. Confirm
   the text shows alone, with no gap and no broken frame.
7. In the desktop app, replace the picture with a different one. Sync, reload.
   Confirm the new one appears rather than the old one persisting.
8. In the desktop app, switch the showcase off entirely. Sync, reload. Confirm the
   project is gone from both surfaces.
9. Repeat 1–4 in each of the four languages.
10. Ask the engineer to point one player's picture at something that is not there.
    Reload. Confirm you see the name and the description alone — no gap where the
    picture would be, no broken-picture icon, no error message.
