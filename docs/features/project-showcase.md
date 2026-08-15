# Project showcase — a player's own work, on the leaderboard

A player can describe something they built. On the tokens leaderboard their row
gains a small control; opening it reveals a panel between their row and the next
one, holding a name, a one-line description, a link and a picture.

The website only ever **shows** this. Everything is written in the desktop app,
under Settings → Leaderboard → Project showcase, and is off by default. Nothing
on the website can create, edit or remove it.

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

## What counts as having a project

**The project name decides it.** A player with a name has a project; a player
without one does not, no matter what else they filled in. The name is the
panel's heading — without it there is nothing to announce a panel by, and a
visitor using a screen reader would be handed a region with nothing readable at
the top of it.

Everything else is optional and simply absent when empty:

| filled in           | what the panel shows                                 |
| ------------------- | ---------------------------------------------------- |
| name only           | the name, alone                                      |
| name + description  | both, no space reserved for a picture                |
| name + picture      | the name and the picture                             |
| all four            | all four                                             |
| picture but no name | **no marker, no panel** — the picture is never shown |

The panel never reserves an empty slot. A player with no picture gets a panel
that is simply shorter, not one with a gap in it.

## The link

Shown as the site's address — `example.com` — never as the full raw link.

Two reasons, and both are about the same thing. A full address can be made to
read like a site it is not: characters that render as Latin letters but are not,
and characters with no width at all. The other three things a player writes are
screened for those; the link is not. Showing only the address means what the
visitor reads is the part that decides where they land.

The link opens in a new tab, and search engines are told we do not vouch for it.
The leaderboard is a page with real standing; without that signal it becomes a
place people publish links to farm it.

## The picture

A fixed-size thumbnail. Whatever shape a player uploads, it is fitted inside
that box — nothing a player can upload changes the board's layout.

It loads only when a panel is opened, never before. Most visitors open none, and
the pictures are the only expensive part of this feature.

**If the picture cannot be loaded, the panel quietly shows the text alone** — the
same panel a player with no picture gets. No broken frame, no "failed to load"
notice. A picture can go missing for real reasons (a player removed it and the
removal only half-completed) and for boring ones (the visitor's connection
faltered), and in both cases the honest thing to show is what we do have.

When a player replaces their picture, the new one appears immediately. It must
not be possible to publish one picture, have it seen, and then quietly swap it
for another.

## Who does not get a panel

- **Players who filled in nothing.** No marker, no panel, no change to their row.
- **Players hidden for cheating.** They are already absent from the board
  entirely — everything they wrote goes with them. This needs no separate rule.
- **Players whose gains are being held by the anti-cheat rules.** These players
  _stay_ on the board with a reduced score, and they must not get a panel. We
  have judged their numbers untrustworthy; handing the same account a promotional
  space with a live outward link says the opposite. Their row shows no marker,
  exactly as if they had filled in nothing.

## Where it appears

The tokens leaderboard only. The other two boards — forest value and vendor
usage — are built differently and are deliberately out of scope for this
version. A visitor who finds the panel on one board will look for it on the
others; that is an accepted cost of shipping this one first.

## Moderation — must be settled before this goes live

Today the only ways to deal with a player who publishes something unacceptable
are to hide them from the board completely, or to edit the database by hand. The
admin page has no action that clears a project.

Two further problems make hand-editing unreliable:

- The word screening runs only when a player changes what they wrote. Text that
  passed when the word list was shorter stays published afterwards.
- The values live in the desktop app. Clearing them on our side may simply be
  written back on that player's next sync.

**Two things must be true before launch:** the admin page can clear one player's
project without hiding the player, and clearing it actually sticks. The second
depends on how the desktop app behaves and is not answerable from this side.

Until both hold, the only honest response to an incident is hiding the player
entirely, and the picture stays reachable by anyone who already has its address.

## Known limitations (accepted for this version)

- Which panel is open is not part of the page's address. A panel cannot be
  linked to, the browser's back button does not close one, and switching
  language or turning the page closes whatever was open. Making it addressable
  would reload the whole page on every click, and nothing on this site shows a
  loading indicator.
- The words a player writes are part of the page from the moment it loads, so
  search engines and the AI crawlers this site invites will read them and file
  them under our name. This is deliberate — the words cost nothing to include
  and help the page. Only the picture waits for a click.
- A player writes in whatever language they choose, and it sits beside text in
  the visitor's language. Nothing marks the switch for a screen reader, which
  matches how player names already behave on this site.

## Automated tests

**None.** This repository has no test runner of any kind, so there is nowhere for
an automated test to live. Every scenario below is verified by hand. Adding a
test runner is worth doing and is deliberately not bundled into this feature.

## Smoke test (manual)

Run on the deployed site, not locally — this is the first picture on the whole
site that is loaded from somewhere else, and that path has never run in
production.

1. Open the tokens leaderboard. Confirm exactly the players with a project name
   carry a marker, and no one else does.
2. Activate a marker. Confirm the panel opens directly beneath that player's row
   and pushes the rest down, and that the picture only starts loading now.
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
11. Confirm a player whose gains are being held shows no marker.
