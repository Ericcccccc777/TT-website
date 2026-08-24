# Rolling board — a monthly race, so the standings can actually change

The token leaderboard has always ranked players on everything they have ever
collected. That number only goes up, so the order at the top stopped changing a
long time ago: measured on 2026-08-17, the player in first place holds about 64%
of every token the whole board has ever collected, the top three hold 88%, and
the bottom ten hold two tenths of one percent between them. The fifteenth player
would need roughly three thousand times their current total to reach first place.

This matters because of what the board is now being asked to do. A player who
fills in a project wants people to see it, and where their name sits decides how
many people do. "Use the app more and your work gets seen more" is a fair deal —
but on a lifetime total it is only true for the handful of players at the top. For
everyone else it is not true at all, no matter how much they use the app.

So the same players are now shown two ways: the standing order everyone is used
to, and a second one that counts only the last thirty days and starts over every
month. On the monthly view, using the app more really does move you up, and it is
true again next month.

## Happy path

1. A visitor opens the token leaderboard and sees a switch offering two views:
   the last thirty days, and all time.
2. **All time** is the same table in the same order it always was. One thing did
   change: the small triangle that used to open a project panel under a row is
   gone, and a player's name now opens their own page instead. `project-showcase.md`
   records why — nobody pressed the triangle, so the work behind it stayed
   invisible, and a table row was never wide enough to hold it anyway.
3. **Last 30 days** is a different shape: one card per player instead of a table
   row, ordered by how much they collected in the window.
4. Each card shows the player's rank, their tree, their name and flag, how much
   they collected in the last thirty days, and — smaller and quieter — their
   all-time total for context.
5. If that player has filled in a project, the card shows it in full: the picture,
   the name, the one-line description, and the link. **No clicking required.**
   This is the whole point of the card shape: a project nobody has to go looking
   for is a project that gets seen.
6. Below the cards, three numbered steps explain how to get a project onto the
   board, followed by a download button.

## Why the two views look different on purpose

The all-time table answers one question — who is ahead — and a table is the right
shape for that. The monthly view exists to make the projects visible, and a table
row cannot do it: the widest thing a row can hold before it starts sliding
sideways on a phone is a number. That is exactly why the project ended up behind
a triangle in the first place.

A card has room to show the work. The two views are meant to look like different
things, because they are doing different jobs. This is not an inconsistency to be
tidied up later.

## The cards are deliberately unequal

A player who has filled in a project gets a picture, a headline, a description
and a link. A player who has not gets a single quiet line.

That difference is the whole mechanism. Someone scrolling past can see what
filling it in would get them without being told. Making both kinds of card the
same height would remove the only argument this page makes.

## The empty-slot prompt, and why it stops after five

The first five cards, if they have no project, show a dashed outline reading that
this space could hold their work and that it is filled in inside the app.

It stops at five because the prompt says the space beside their name is worth
having. Near the top of the board that is true. Twenty places down it would be
advertising something that nobody is looking at, and the board should not tell a
player something it cannot back up.

Five is a judgement, not a measurement. It should be revisited once there is
traffic data to revisit it with.

## What counts toward the thirty-day figure

Only tokens the player collected **through the app** during the window.

The first time someone joins, the app reports everything their local records have
ever seen — often months of work from before they had ever heard of us. That
first lump is not thirty days of anything, and it does not count. Without this
rule, someone who had used an AI coding tool heavily for a year and installed our
app this morning would land in first place on a board measuring the last month,
having collected nothing in it.

The practical effect: a new player's first month counts what they collected
_after_ joining. That is the behaviour we want to reward anyway.

Two more rules follow from the same principle:

- **Withheld tokens never count.** A player is never credited with more in a
  month than they have been credited with in total. When a sudden jump is held
  back for review it stops counting toward their total, and this rule makes it
  stop counting toward the month as well.

  This one is worth stating plainly because getting it wrong was a real bug, not
  a hypothetical: the first version of this board credited a player whose gains
  were being held with 1.4 billion tokens and placed them third. Exposure on this
  board is handed out by rank, so that amounted to a held jump buying a good spot
  — the exact thing the review system exists to prevent. It is fixed, and the
  smoke test below checks it.

- **Corrections count against the window.** If a total is later reduced, the
  window figure drops too. It never goes below zero.

## Who appears

Anyone who collected something in the window. Players who collected nothing are
left out entirely rather than listed at the bottom at zero — a board about recent
activity padded with rows of nothing would look exactly like the frozen board it
exists to replace.

Everyone still excluded from the leaderboard generally — banned or hidden players
— is excluded here too, unchanged.

A player whose project has been taken down still appears with their rank and their
figures. Only the project is hidden. Taking down someone's work is not the same as
removing the person.

## Edge cases

| Situation                                          | What happens                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Nobody collected anything in the last thirty days  | The board shows the same friendly empty state the leaderboard already uses, not an error                |
| A player's project is taken down                   | Their card stays, with rank and figures; the project area is empty                                      |
| A player has a project name but no picture         | The card shows name, description and link, without a picture box                                        |
| A player has a project but is outside the top five | Card shows the project in full; the empty-slot prompt is irrelevant to them                             |
| More than fifty players were active                | Paged fifty at a time, the same way the all-time board pages                                            |
| Two players collected exactly the same amount      | Order between them stays stable from one page load to the next, so paging never skips or repeats anyone |
| The monthly figure cannot be read at all           | Only the monthly view shows an error. The all-time board keeps working — the two do not share a failure |

## Known limitations (accepted for this version)

- **~~A card cannot be linked to.~~** Resolved — clicking a name opens that
  player's own page at a fixed address. See `player-page.md`.
- **Nothing tells a player where they rank on the monthly view** except finding
  their own name.
- **The window is fixed at thirty days.** No weekly or all-year variants.
- **Which view a visitor lands on has not changed.** The leaderboard link still
  opens the all-time board; reaching the monthly one takes one click. Whether it
  should be the other way round is a decision, not an oversight — worth making
  deliberately once the board has been seen by anyone.

## Smoke test (manual)

1. Open the leaderboard. Confirm the all-time table has the same rows in the same
   order as before, that no row carries a project triangle any more, and that a
   player's name opens their own page.
2. Confirm a switch offering "Last 30 days" and "All time" appears under the
   heading, on both views, with the current one marked.
3. Switch to the last thirty days. Confirm cards appear, ordered by the monthly
   figure, highest first, and that the order is _not_ the same as the all-time
   order.
4. Find the card for the player who has a project. Confirm the picture, name,
   description and link are all visible **without clicking anything**.
5. Click that link. Confirm the leaving-the-site notice appears before the browser
   goes anywhere.
6. Confirm the first few cards without a project show the dashed "this space could
   hold your project" outline, and that cards further down do not.
7. Confirm a player who has not synced in over a month is absent from this view
   but still present on all time.
8. Find the player whose gains are being held for review. Confirm the monthly
   figure beside their name is no larger than their all-time total — if it is
   larger, held tokens are buying rank again.
9. Read the three steps at the bottom. Follow them in the app and confirm the
   words match what is actually on screen there.
10. Press the download button at the bottom. Confirm it reaches the download page.
11. Repeat steps 2–4 in each of the four languages and confirm no raw key names
    (text like `LeaderboardPage.recentTitle`) appear anywhere.
12. On a phone-width window, confirm no card slides sideways and no text is cut
    off.
