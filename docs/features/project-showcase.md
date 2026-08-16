# Project showcase — a player's own work, on the leaderboard

A player can describe something they built. On the tokens leaderboard their row
gains a small control; opening it reveals a panel between their row and the next
one, holding a name, a one-line description, a link and a picture.

The website only ever **shows** this. Everything is written in the desktop app,
in its leaderboard settings, and is off by default. Nothing on the website can
create, edit or remove it.

## Happy path

1. A player fills in their project in the desktop app and syncs.
2. A visitor opens the tokens leaderboard and sees a small marker on that
   player's row. Rows with nothing to show carry no marker.
3. The visitor activates the marker. A panel opens directly beneath that row,
   pushing the rest of the board down.
4. The panel shows the project name, the description, a link, and a picture.
5. Activating a different player's marker closes the first panel and opens the
   new one. Only one is ever open.
6. Activating the same marker again closes it.

The marker sits **beside the player's name**, not on the row as a whole. The row
already carries something else you can click — the little tree that shows what a
player has grown — and a whole-row target would mean two different things happen
depending on where a visitor lands. It also gives someone using a keyboard one
clear thing to move to rather than an ambiguous block.

## What counts as having a project

**The project name decides it.** A player with a name has a project; a player
without one does not, no matter what else they filled in. The name is the
panel's heading — without it there is nothing to announce a panel by, and a
visitor using a screen reader would be handed a region with nothing readable at
the top of it.

Everything else is optional and simply absent when empty:

| filled in           | what the panel shows                  |
| ------------------- | ------------------------------------- |
| name only           | the name, alone                       |
| name + description  | both, no space reserved for a picture |
| name + picture      | the name and the picture              |
| all four            | all four                              |
| picture but no name | **no marker, no panel** — never shown |

The panel never reserves an empty slot. A player with no picture gets a panel
that is simply shorter, not one with a gap in it.

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

It loads only when a panel is opened, never before. Most visitors open none, and
the pictures are the only expensive part of this feature.

**Turning the showcase off takes the picture down too.** Clearing the project —
whether by switching the whole showcase off or by only emptying the name — also
removes the uploaded picture from our side at the next sync. The one thing this
cannot cover is a switch-off that never reaches us at all: done offline, or with
a stale sign-in, the entry and the picture stay as they were until an attempt
gets through. Write to us and we will remove it by hand.

**If the picture cannot be loaded, the panel quietly shows the text alone** — the
same panel a player with no picture gets. No broken frame, no "failed to load"
notice. A picture can go missing for real reasons (a player removed it and the
removal only half-completed) and for boring ones (the visitor's connection
faltered), and in both cases the honest thing to show is what we do have.

When a player replaces their picture, the new one appears at that player's next
sync. It must not be possible to publish one picture, have it seen, and then
quietly swap it for another and have the old one keep showing indefinitely.
Whether the new picture genuinely turns over at that moment depends on the
desktop app and is one of the launch gates below.

## Who does not get a panel

- **Players who filled in nothing.** No marker, no panel, no change to their row.
- **Players hidden for cheating.** They are already absent from the board
  entirely — everything they wrote goes with them. This needs no separate rule.
- **Players whose gains are being held by the anti-cheat rules.** These players
  _stay_ on the board with a reduced score, and by default they get no panel. We
  have judged their numbers untrustworthy; handing the same account a promotional
  space with a live outward link says the opposite. Their row shows no marker,
  exactly as if they had filled in nothing.

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
    board entirely, so granting them a panel would change nothing. The page says
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

The tokens leaderboard only. The other two boards — forest value and vendor
usage — are built differently and are deliberately out of scope for this
version. A visitor who finds the panel on one board will look for it on the
others; that is an accepted cost of shipping this one first.

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
reachable by anyone, not only by people who saw the panel. Removing a picture
today means deleting it by hand.

## Known limitations (accepted for this version)

- Which panel is open is not part of the page's address. A panel cannot be
  linked to, the browser's back button does not close one, and switching
  language or turning the page closes whatever was open. Making it addressable
  would reload the whole page on every click, and nothing on this site shows a
  loading indicator.
- The words a player writes are part of the page from the moment it loads, so
  search engines and the AI assistants this site invites will read them and file
  them under our name. This is deliberate — the words cost nothing to include
  and help the page. It applies to the first fifty players only; later pages of
  the board are already kept out of search. Only the picture waits for a click.
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

Run on the deployed site, not locally — this is the first picture on the whole
site that is fetched from our storage rather than shipped with the site, and that
path has never run in production.

1. Open the tokens leaderboard. Confirm exactly the players with a project name
   carry a marker, and no one else does.
2. Activate a marker. Confirm the panel opens directly beneath that player's row
   and pushes the rest down.
   _[engineer, with the browser's network panel open: confirm the picture is
   requested only now, not on page load.]_
3. Activate a second player's marker. Confirm the first panel closes.
4. Activate the same marker again. Confirm it closes and the keyboard focus
   returns to the marker.
5. Reach a marker using only the keyboard, open and close it. Confirm the marker
   announces whether it is open.
6. Confirm the link shows an address rather than a full raw link, opens in a new
   tab, and lands where it says.
7. On a phone-width screen, open a panel. Confirm nothing is cut off and the
   board itself has not become wider.
8. In the desktop app, remove the picture but keep the name. Sync, reload, open
   the panel. Confirm the text shows alone with no gap and no broken frame.
9. In the desktop app, replace the picture with a different one. Sync, reload,
   open the panel. Confirm the new picture appears rather than the old one.
10. Hide a player who has a project. Confirm their row and their panel both
    disappear from the board.
11. Ask the engineer to point one player's picture at something that is not
    there. Reload and open that panel. Confirm you see the name and the
    description alone — no gap where the picture would be, no broken-picture
    icon, no error message.

**Launch gate, not a step:** confirm a player whose gains are held shows no
marker. This cannot be checked from the public board — holds are invisible there
by design, and today no held account has a project. Start from the admin page,
put a project on a held account deliberately, and check the board from outside.
Name who creates that state before launch.
