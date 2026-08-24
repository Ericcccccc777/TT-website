# Feature: The island — a place that fills in as you grow

## Status: FINALIZED 2026-08-24 — CEO smoke test passed

## 1. What this feature is for

A player's page currently shows their trees as four boxes in a row. It is
accurate and it is dead. Nothing about it says the trees belong to a place, and
nothing about it changes in a way you would want to come back and look at.

This turns that row into **an island** — a small elevated piece of land, seen
from above and slightly to the side, with the player's actual trees standing on
it. A player with one young tree gets a mostly empty island. A player with four
grown ones gets a pond, a path, a lantern, a fence, a swing, a waterfall and a
third ridge of hills behind it.

Nothing is decorative-at-random. **Every single thing on that island is there
because the player's own trees put it there** — nothing is sprinkled on to fill
space, and the same player's island looks the same way every time it is drawn.
(What the island reads off those trees is how far they have grown; § 3.2 is
exact about where that falls short of what a player actually owns.)

## 2. Happy path

### 2.1 A player with nothing yet

1. A visitor opens the page of a player who has not grown anything.
2. The island is there — bare soil, a broken fence, warm haze around the edges.
3. It reads as a place waiting for something, not as a page that failed to load.

### 2.2 A player with one young tree

1. Their tree stands on a patch of turned soil.
2. Nothing else. No path leading anywhere, no water, no light.
3. The emptiness is the point: it is the same island the four-tree player has,
   with everything not yet earned simply absent.

### 2.3 A player who has grown

1. Each species they have grown stands on its own plot.
2. Between the plots, a path. Beside the low corner, a pond. Off the cliff, a
   waterfall. Somewhere near the middle, a stone lantern.
3. The fuller island is not a different picture — it is the same island with
   more of it switched on.

### 2.4 What decides it

Two numbers, both already collected:

- **How many kinds of tree** the player has grown.
- **How far along they are altogether** — every tree's stage, added up.

Breadth unlocks _ground_: more plots. Depth unlocks _life_: water, light,
crossings, distance.

## 3. Edge-case behavior

### 3.1 The unlock ladder

#### Behavior (CEO sign-off)

Read top to bottom. Everything below the player's line is absent — not greyed
out, not shown locked, not hinted at. **Absent.**

This ladder is the **island itself** — the land and the things standing on it.
What each individual tree wears is a separate ladder, in § 3.2, because it
follows that one tree rather than the whole island.

| Appears                         | When                         |
| ------------------------------- | ---------------------------- |
| Island, mist sea, distant hills | always                       |
| Bare soil, broken fence         | the player has grown nothing |
| First plot + tree               | 1 kind                       |
| Path                            | growth total 4               |
| Second plot                     | 2 kinds                      |
| Pond, with reeds at its edge    | 2 kinds, or growth total 8   |
| A worked field, planted in rows | growth total 10, apple tree present |
| Third plot                      | 3 kinds                      |
| Waterfall, off the pond's edge  | growth total 16              |
| Fourth plot                     | 4 kinds                      |
| A third ridge of hills          | growth total 26              |

"Growth total" is every tree's stage added together, so a single tree can carry
the island to stage 8 of 32 on its own, and four grown trees reach the top.

**Nothing here is a locked slot with a padlock on it.** A player who has not
earned the pond does not see a pond-shaped hole; they see an island that simply
does not have a pond, and it looks complete at every rung.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Open the pages of four players at visibly different sizes — someone with one
   young tree, someone mid-way, someone near the top of the board.

**Pass criteria:**

- Each island looks deliberate and finished, not like a bigger one with holes.
- The larger player's island is visibly richer without being cluttered.

### 3.2 Each tree carries the things it has earned

#### Behavior (CEO sign-off)

The desktop app gives a player things for each tree — a fence, a basket, a
swing, a lantern, a hat, a snowman, a road sign. The island shows those things
**in the same places the app puts them**: a swing hangs from the branch it
hangs from on their desktop, a hat sits on the arm it sits on.

**What decides whether a thing is there is how far things have grown** — never
the player's own list of what they have bought and put out. The website is not
told that list today, and § 6 records what closing that would take.

The ladder splits in two, and the split is deliberate:

| On or beside the tree             | Appears when                |
| --------------------------------- | --------------------------- |
| Its own fence, in front of it     | that tree reaches stage 4   |
| The cactus's broken fence         | that tree reaches stage 3   |
| A basket of fruit                 | that tree reaches stage 5   |
| Presents under the christmas tree | that tree reaches stage 5   |
| A hat on the cactus               | that tree reaches stage 5   |
| A swing on the apple's branch     | that tree reaches stage 6   |
| A stone lantern beside the cherry | growth total 14             |
| A mine cart beside the cactus     | growth total 16             |
| A snowman beside the christmas    | growth total 18             |
| A road sign out past the cactus   | growth total 20             |
| A red gate behind the cherry      | growth total 24             |
| Petals drifting off the cherry    | that tree reaches stage 4   |
| Snow over the christmas tree      | as soon as that tree is there |

**The small things a tree wears follow that tree; the landmarks around it follow
the whole island.** A hat belongs to the cactus and appears when the cactus is
big enough to wear one, whoever else the player is growing. A road sign is not
the cactus's — it is the island saying somebody lives here — so it waits until
the island as a whole has got that far.

Two things follow:

- **This is a guess, and it can differ from what a player actually has** — in
  either direction. In the app these things are bought, one at a time, with a
  currency each tree earns; there is no growth level at which the app hands one
  over. So a player who bought a swing early does not see it here until their
  tree is big enough, and a player who bought nothing still gets the fence once
  their tree is. What the guess does guarantee is that nothing ever appears on a
  tree too young to carry it — no basket on a seedling. § 6 records what closing
  the gap would take.
- Nothing is placed by eye. Each anchor is measured against the tree's own
  artwork, which is why nothing floats beside the thing it belongs to.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Open a page for a player with a grown tree of each kind.
2. Then open a page for a player whose trees are young.

**Pass criteria:**

- Everything touches what it belongs to: the swing hangs from a branch, the hat
  sits on the cactus, the fence stands in front of its tree.
- The young player's trees carry fewer things than the grown player's, and
  nothing is drawn as an empty or locked slot.

### 3.3 Each tree lives in its own climate

#### Behavior (CEO sign-off)

The island is not four identical plots. It has weather, and each kind of tree
lives where that kind of tree belongs — which is why the picture reads as a
place rather than as a shelf of trophies.

| Tree      | Where it lives            | What the ground around it is                        |
| --------- | ------------------------- | --------------------------------------------------- |
| Christmas | the far northern rim      | frozen ground, snow patches, bare twigs, dark stones |
| Cactus    | the far eastern coast     | sand and stones, running out to the cliff            |
| Cherry    | the west, above the water | pale earth, petals drifting and settled              |
| Apple     | the middle — the homestead| turned earth, a low fence, a basket, a swing         |

The weather only exists where its tree does: a player with no cactus has no
desert sitting empty, waiting for one.

The desert sits at the island's eastern edge on purpose. It is the one ground
that has a natural end — sand does not fade into grass, it stops where the rock
does — so it runs out to the coast rather than sitting in a ring of green with
sea beyond it. Everything that belongs to the cactus goes with it: the hat on
its head, the cart, the broken fence and the road sign all keep their places
against the plant.

The apple tree's furniture belongs to the tree, not to the ground beside it —
**the swing hangs from its own branch**, the fence stands in front of it, and
the basket in front of the fence.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Find a page for each of the four kinds of tree.

**Pass criteria:**

- The ground under each reads as belonging to that tree, not as the same patch
  recoloured.

### 3.4 A tree species we have never heard of

The desktop app can add a species before the website knows about it.

#### Behavior (CEO sign-off)

- It stands on the plain default plot and its tree falls back to the apple
  sprite, exactly as the rest of the site already does.
- No blank space, no error, no missing picture.

#### Classification

[Required automated test]

#### Smoke test procedure

**Reproduce:**

1. There is no way to cause this from the website — what a species is called is
   the desktop app's decision. An automated check stands in for the CEO here,
   which is why this case is marked as one.
2. The part that can be checked by hand: on any player's page, every kind named
   in the list under the island is also standing on the island (up to its four
   plots).

**Pass criteria:**

- No plot is ever empty and no tree is ever missing its picture.
- Nothing on the page reports an error, and the page itself still loads.

### 3.5 The same player, drawn twice

#### Behavior (CEO sign-off)

- The island is **identical** every time it is drawn for the same player. Trees
  stand in the same spots, the lantern is in the same place, petals drift from
  the same branch.
- Nothing about it is random per page load. Where variety is wanted, it comes
  from the player's own facts, never from chance — an island that rearranges
  itself between visits is a decoration, not a place.

#### Classification

[Required automated test]

#### Smoke test procedure

**Reproduce:**

1. Open a player's page, then reload it several times.

**Pass criteria:**

- Nothing moves.

### 3.6 A player with more kinds than the island has plots

#### Behavior (CEO sign-off)

- The island has four plots. A player with more kinds than that shows their four
  largest, biggest first.
- The full list stays readable underneath, where every kind is listed with its
  stage and its total.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Open the page of a player with four or more kinds.

**Pass criteria:**

- Four trees on the island, every kind still listed below it.

### 3.7 A narrow screen

#### Behavior (CEO sign-off)

- The island keeps its shape and scales down **whole**. It is never cropped to
  a strip, it never reflows into a column, and **nothing is dropped from it** —
  a narrow screen gets the same island, smaller.
- That is a deliberate choice over hiding details on small screens. The trees
  are the only thing on the picture that is actually the player's, and they are
  the largest things on it, so shrinking keeps them readable longest without
  anyone having to decide what is expendable.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Open a rich player's page and narrow the window to phone width.

**Pass criteria:**

- The island stays whole and legible; the trees stay visible at every width.
- Nothing disappears as the window narrows — the same things are there, smaller.

### 3.8 Each climate has its own weather

#### Behavior (CEO sign-off)

- **Blossom** drifts off the cherry tree — each petal on its own path, its own
  speed and its own spin, so they never move as a block.
- **Snow** falls over the christmas tree's field. Deliberately unlike the
  blossom: slower, straighter, denser, and it does not spin. A flake that
  tumbles like a leaf reads as ash.

The two start at different moments, and the reason is the same both times — the
weather has to be true of the tree under it. Blossom waits until the cherry has
reached stage 4, because a bare sapling has nothing to shed. Snow starts as soon
as the christmas tree is on the island, because its ground is already a
snowfield and a snowfield with no snow falling on it reads as grey mud.
There is deliberately **no weather on the desert.** Angled sunbeams were tried
and cut: on a small picture they read as a pale wash over the sand rather than
as light, and the cactus already says "dry" without help.

Weather exists only where its tree does, and **only over that tree's own
ground**. Each falling thing's distance is derived from where it starts, so it
lands on the bed it fell from; on top of that, each weather is clipped to its
own zone — the tuning keeps it in place, and the clip guarantees no future tweak
to a duration or a drift can quietly put blossom on somebody else's ground.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Open a page for a player who has all four trees, and one who has none of the
   cherry, cactus or christmas.

**Pass criteria:**

- Each weather appears only over its own ground.
- Nothing pulses in step with anything else.

### 3.9 A visitor who has asked for less motion

#### Behavior (CEO sign-off)

- Drifting petals, moving water and any drifting haze stop. The island is drawn
  once, complete and still.
- Nothing is lost but the movement.

**The falling water never jumps.** It is drawn as evenly spaced streaks that
travel exactly one gap per cycle, so the end of a loop is identical to its
start and the restart cannot be seen. Three sets of streaks run at different
speeds, which is what stops it reading as one sliding block. An earlier version
slid a single highlight a fixed distance and snapped it back, and the snap was
visible as a hop upward every second.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Turn on the system setting for reduced motion, then open a cherry player's page.

**Pass criteria:**

- No petals move, nothing drifts, the page is otherwise unchanged.

### 3.10 Someone who cannot see the picture

#### Behavior (CEO sign-off)

- The island is decoration and is skipped entirely by a screen reader.
- Everything it depicts — which trees, what stage, how many tokens — is written
  out underneath it as ordinary text. The picture never carries information that
  exists nowhere else.

#### Classification

[Required automated test]

#### Smoke test procedure

**Reproduce:**

1. Read the page with the picture turned off.

**Pass criteria:**

- Nothing about the player's forest has become unknowable.

## 4. Who can use this

Everyone. It is drawn on the page of any player who has one. No sign-in,
nothing to enable, nothing anyone can edit from the website.

**The island shows nothing that the player's own page does not already show a
stranger.** It is drawn from the same public facts the board is — which kinds
of tree, how far each has grown — and from nothing else. A player who is hidden
or banned has no page for it to appear on, so there is no island for them
either; and a project held back from the site stays held back, because the
island never carries project words or pictures at all.

## 5. External dependencies (plain language)

- **The tree and prop artwork we already ship.** The island uses the same
  pictures the desktop app uses, at their real size, unsmoothed. Nothing new is
  fetched from anywhere.

## 6. Deferred / unresolved

- **Which decorations a player has actually put out.** The desktop app knows,
  per tree, what a player owns and what they currently have on display. The
  board does not carry that, so the island cannot use it, and § 3.2 falls back
  to how far the tree has grown instead.

  The gap a player would notice runs both ways, because in the app these things
  are bought rather than reached: someone who has bought nothing still sees a
  fence once their tree is old enough, and someone who bought a swing early does
  not see it until theirs is. Neither is a picture of what they own.

  Closing this needs the desktop app to start reporting that list alongside the
  rest of what it sends to the board. That is a decision on the app's side and
  is not part of this feature.

- **Seasons and time of day.** The island is one fixed warm afternoon. Making it
  match the visitor's clock or the season is a good idea and a separate one.
- **Anything a visitor can click on the island.** It is a picture, not a map.
  Making the trees openable is worth considering once there is something behind
  them worth opening.
- **The island on the share card.** The card keeps its current layout for now;
  redrawing it as a small island is worth doing after this one is settled.
- **A fifth plot.** Four is what the app grows today.

## 7. Out of scope

- Any change to what the desktop app does or to how trees grow.
- Any change to ranking, projects, or the boards.
- Repainting the tree sprites. They stay exactly as the app draws them.

## 8. Decision history

- **The island is drawn by us, not fetched as a picture.** It has to reflect one
  particular player's facts, and a fixed illustration cannot. — Tech Lead,
  pending CEO confirmation
- **Everything on it is earned; nothing is a locked slot.** A padlock says "you
  are missing things". An absent pond says "this is your island". The second one
  is the one worth coming back to. — Tech Lead, pending CEO confirmation
- **The props are the app's own props.** Fence, basket, lantern, swing and soil
  already exist in the product's world and already match the trees exactly.
  Drawing new ones would have introduced a second visual language for no gain.
  — Tech Lead, pending CEO confirmation
- **Nothing is random.** Randomness per load would make the island a screensaver.
  Every position is derived from the player. — Tech Lead, pending CEO confirmation
- **Species live in climates; they do not fill numbered slots.** Sorting trees
  by size into four generic plots let a christmas tree stand in the sun and a
  cactus stand by the pond. Giving each kind a home — cold in the north, dry in
  the east, water in the west, the homestead in the middle — is what turned a
  shelf of trophies into a landscape. — CEO direction, 2026-08-22
- **Furniture belongs to what it serves.** A swing at a fixed map coordinate was
  floating in open sky; hung from the apple tree's own branch it needs no
  explanation. Same for the fence in front of its tree and the basket in front
  of the fence. — CEO direction, 2026-08-22
- **The picture is wider than the text column.** It is the one thing on this
  page meant to be looked at rather than read, and at column width it was small
  with wasted air above and below. It now sizes itself from the viewport.
  — CEO direction, 2026-08-22
- **Redesigned after CEO review of the first build (2026-08-22).** Three faults
  named: it floated, most ground meant nothing, things clipped. Three structural
  answers: the island became a mountain top standing in a sea of mist with
  neighbouring peaks; the ground zoned itself into worked places — beds, field,
  pond, brook, paths — with quiet grass between; and everything standing went
  through one depth order with its own ground and its own shadow. — CEO
  direction, carried out same day
- **The hill is part of the ladder.** An empty raised terrace on a beginner's
  island read as a rendering fault, not as land. Ground that rises once there is
  something to stand on it is both truer and better looking. — Tech Lead,
  2026-08-22
- **The ground is drawn as tiles rather than as a few large shapes.** The first
  attempt used four polygons and read as a paper cut-out: one dead green field,
  no thickness under it. Tiles give the turf real variation, a ragged coast, and
  a cliff that can be extruded — the three things that make it read as land seen
  from above. — Tech Lead, 2026-08-22
- **The frame is measured from the island, not chosen.** Hand-picked framing
  drifted every time the island's size changed, three times in a row. — Tech
  Lead, 2026-08-22
