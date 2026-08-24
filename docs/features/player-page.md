# Player page — the thing a player can actually send someone

Until now, filling in a project produced nothing a player could point at. The
board is one long page; a row cannot be linked to. So a player who wrote a name,
a line about their work and a link got a small triangle on a table, and no way to
say "here, look at this" to anybody.

Every player now has their own page. Clicking a name on either board opens it, and
the address stays put — it can go in a message, on a CV, in a README.

## Happy path

1. A visitor clicks a player's name on either board.
2. The page opens with that player's current tree, their name, their flag, the
   date they joined, and a **share control** beside the name.
3. The share control is what makes the rest of this page mean anything: a page
   nobody is told they can send is a page nobody sends. Pressing it offers the
   phone's own sharing panel, or copies the address on a computer. It is
   specified in `share-card.md`.
4. When the address is pasted somewhere, the picture that travels with it is
   **this player's own** — their tree, their name, their standing — rather than
   the same site picture every other page sends. Also `share-card.md`.
5. Two cards show where they stand: their all-time position with their total, and
   their position on the last-30-days board with what they collected in it. A
   player who collected nothing this month sees a dash instead of a position.
6. **Their island** — their forest drawn as a small piece of land seen from
   above, with their real trees standing on it and the ground around each one
   matching the tree. It fills in as they grow. It is specified in
   `forest-island.md`.
7. **Their forest, in words** — under the island, every species they have
   actually grown, biggest first. Each one shows the tree at its real stage, the
   species name, an eight-block bar showing how far along it is, and its own
   token total. This list is not a caption for the island: it is the same facts
   in a form that survives the picture not loading, and it is where a player
   with more kinds than the island has room for still sees all of them.
8. **What they are building** — the project in full: picture, name, description
   and link. A player with no project gets a quiet line saying so instead.
9. A closing note explaining what Token Forest is, and a download button.

## Why the forest is the main thing on the page

The app already tells us, for every player, each species they grow, what stage it
has reached and how many tokens went into it. Four trees for most players, each
with its own history.

All of that already existed and the website only ever showed it inside a pop-up on
the board. On this page it is the centre: it is the most personal thing we hold
about someone, it is the part they are actually proud of, and it costs nothing new
to display.

It is shown twice on purpose — once as the island and once as a list — and the
two are not a picture with a caption under it. The island is the reason anyone
looks; the list is the reason nobody is left out by it. The list works with the
picture turned off, it holds every species when the island has room for four,
and it carries the exact numbers the island only implies.

## Which pages search engines are told about

**Only the pages that have a project on them.**

- A page with just a name and a number is thin. A few hundred of those would
  dilute the handful of guide pages that actually bring in search traffic.
- A page with a project is real content — and being findable is the one concrete
  thing a player gets back for filling the form in. Their page is listed in our
  sitemap and carries a link to their work.

So the rule is one sentence: **fill in your project and your page becomes
something we tell Google about.** Leave it empty and the page still works, still
opens, and can still be sent to anyone — it just is not advertised.

The listing refreshes about once an hour, so a player who fills their project in
does not have to wait for unrelated work to be released before being found.

If the list cannot be read at the moment it is rebuilt, we publish the rest of
the sitemap without the player pages rather than publishing nothing. It is the
cheapest failure available: being left out of the list for an hour is not being
removed from anywhere, the pages stay linked from the board, and the alternative
would be letting a momentary database hiccup hold up a release.

We announce the project-bearing pages down to a few hundred players, not all of
them without limit. Being announced and being allowed to be found are different
things: a player past that mark is still a page a search engine may index, and
it is still linked from the board, which is how a crawler would reach it anyway.
The line exists so this list stays a short, useful hint rather than a growing
file whose tail gets discarded.

## Who has a page

Every player visible on the leaderboard. Players who are banned or hidden do not,
and neither do addresses that never existed — all of them show the ordinary
not-found page. **They are deliberately indistinguishable:** a different response
for a banned player would confirm to a stranger that a particular banned player
exists.

## Edge cases

| Situation                                          | What happens                                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A player has no project                            | Page opens normally; the project area shows a quiet line; search engines are not told about it |
| A player has a project but no picture              | Name, description and link, no picture box                                                     |
| A player collected nothing in the last thirty days | The monthly card shows a dash instead of a position                                            |
| A player has only ever grown one tree              | The forest shows one tree; nothing is padded                                                   |
| A player's project is taken down                   | Their page still works, with their trees and standing; the project area is empty               |
| The address does not match any player              | Ordinary not-found page                                                                        |
| We know the player but cannot read their standing  | Ordinary not-found page — a standing we could not read is never guessed at                     |
| A player's picture fails to load                   | The rest of the project still shows                                                            |

## What is deliberately not here yet

- **More than one picture per project.** Storage and bandwidth are on a free tier
  where running out pauses the entire site; one picture per player is already the
  largest thing we serve. Revisit when somebody actually asks.
- **A chart of tokens over time.** Doable at weekly granularity and worth doing
  later. **A day-by-day chart is refused outright** — for a board this small it
  amounts to publishing when a named person works and sleeps, which our own
  privacy notice promises never to reveal.
- **A vendor or model breakdown per player.** This would publish something we have
  never published about an individual, so it needs the privacy notice updated
  first. Not a small change; not done quietly.
- **A "copy my badge" button.** There is no sign-in on the website, so the page
  cannot know it is being read by the person it is about. Badges stay in the app,
  where identity is implicit.

## Smoke test (manual)

1. On the last-30-days board, click a player's name. Confirm their page opens.
2. Confirm the tree beside their name matches the tree shown for them on the
   board, at the same stage.
3. Confirm the island appears above the list, with a tree on it for each species
   they have grown, and that the list below shows every species with eight-block
   bars matching the stages. `forest-island.md` has the island's own checks.
4. Confirm both standing cards agree with where that player actually sits on the
   two boards.
5. Open the page of the player who has a project. Confirm picture, name,
   description and link all appear, and that clicking the link shows the
   leaving-the-site notice first.
6. Open the page of a player with no project. Confirm it still renders and says so
   plainly.
7. Copy the address, open it in a fresh private window. Confirm it opens the same
   page — this is the entire point of the feature.
8. Change the address to something that is not a player. Confirm an ordinary
   not-found page.
9. Confirm the tree pop-up on the board still opens from the sprite beside the
   name, and that the name itself now navigates instead.
10. Repeat 1–5 in each of the four languages; confirm no raw key names appear.
11. On a phone-width window, confirm the island scales down whole rather than
    being cut off at the side, the list below it wraps to two columns, and no
    text is clipped.
