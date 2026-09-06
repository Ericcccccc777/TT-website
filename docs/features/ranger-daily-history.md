# Ranger daily history — reading one player's record a day at a time

## Status: FINAL 2026-09-06

## 1. What this feature is for

The admin console has a page for each player that lists every score change they
have ever sent. For an active player that is hundreds of lines, arriving in
irregular bursts thirty minutes apart, each one a small number that means nothing
on its own. Nobody can read it. The question an admin actually arrives with is
never "what happened at 13:04" — it is "**what kind of day did this person have,
and is it a normal one for them**".

So the record is regrouped into days. One line per day, newest first, showing
what that day added and how fast. The individual sends are still there, one by
one, exactly as they are today — they are just folded up inside the day they
belong to, and open when you ask for them.

Two things change alongside it. The rightmost number, which used to be growth as
a percentage of the running total, is replaced by something that means something:
**how much of that day's physical ceiling the player used**. And a month picker
above the charts lets an admin narrow the whole picture — charts and the day list
together — down to a single month, and back out again.

## 2. Happy path

### 2.1 Reading the day list

1. An admin opens a player's page. Below the charts, the change history now shows
   **one line per day**, most recent day at the top.
2. Each line carries: the date and weekday; how many times the player sent that
   day; **how much the day added**; **how fast** those tokens arrived; **what
   share of the day's ceiling** that used; and a signal column that says whether
   anything that day is worth a second look.
3. The day's speed and its share of the ceiling are measured over the same
   window: from the player's previous send — or from the start of the day,
   whichever is later — to their last send of that day. The length of that window
   is printed underneath, so neither number can be read out of context.
4. Days are listed newest first by default. The admin can re-order the list by
   biggest day, or by fastest day, and can narrow it to only days that contain
   something flagged.

### 2.2 Opening a day

1. Clicking a day opens it.
2. Inside are that day's sends, one by one, in exactly the form they have today:
   the time, the interval since the previous send, the score before and after,
   what it added, how fast, and the signal — plus the same buttons that are there
   today for marking a send reviewed, withholding it, or releasing it.
3. Each individual send can still be opened one level further to see the evidence
   the player's app supplied for it, as it can today.
4. Clicking the day again closes it. Only one day is open at a time.

### 2.3 Narrowing to one month

1. Above the charts is a month picker. It starts on **All**, which is the page as
   it is today.
2. It offers only the months this player actually has records in, newest first.
3. Choosing a month redraws **all four charts and the day list** using only that
   month's records. Nothing else on the page changes.
4. A **Show all** control sits beside it and returns the page to the full record.
5. The account summary above the charts — total tracked, total gained, peak speed,
   biggest jump — deliberately does **not** follow the month picker. It is the
   player's whole-account report card, and it stays that.

### 2.4 What "share of the ceiling" means

The number replaces the old percentage-growth column, which had stopped being
readable: a player holding 27 billion tokens who adds 100 million has grown by
0.4%, which looks like nothing and tells an admin nothing.

The new number answers a question with an actual answer. For the length of time
that day's tokens arrived over, there is a most a real machine could plausibly
have produced. The column shows the day's gain as a share of that. Around a
third is a heavy, ordinary day. **Anything over 100% is not physically possible**
and is drawn in the same red the rest of the page already uses for that meaning.

This is the same measure the page's existing "how close to the ceiling" chart
already draws for individual sends. Using it here means the chart and the table
finally say the same thing in the same units.

**One send can be impossible inside an ordinary day.** A day that adds a
believable amount over a believable stretch of hours can still contain a single
send that, on its own, produced more than was possible in the minutes it covered.
Averaged over the day, that disappears — which would make the day view a place to
hide. So whenever a day contains **anything worth a second look at all** — a send
over its own ceiling, a send merely marked as worth watching, or a send an admin
has already reviewed — the day line prints the worst single send beside the day's
own figure: "38% · worst send 240%". Over 100% is red; under it, quiet grey. The
rolled-up number is never the only thing an admin sees on a day that has something
in it.

**A send the system decided not to judge is still measured.** Two kinds of send
are waved through without ever being compared against a ceiling: one where the
score went *down*, and one matching the shape of an old one-off migration that
multiplied every total by a hundred. Neither carried a ceiling at all, so neither
could ever trip the rule above — a send of five billion tokens wearing the
migration's shape would have left no mark on its day whatsoever. What was
physically possible in the elapsed time is knowable regardless of what verdict was
reached, so it is now worked out for every send, and the day line reports it.
That closes the one remaining way through.

## 3. Edge-case behavior

### 3.1 An address that asks for a month that does not exist

#### Behavior (CEO sign-off)

- When the address carries a month that is malformed, or a month this player has
  no records in
- The system shows the full record, exactly as if no month had been chosen
- The admin sees no error

A month that is offered by the picker but turns out to hold nothing after the
"only flagged" filter is applied shows an empty table with a one-line explanation
and a way back to the full record.

#### Classification

[Required automated test]

#### Smoke test procedure

**Reproduce:**

1. Open a player's page and hand-edit the address to ask for month `2026-13`.
2. Reload.

**Pass criteria:**

- The page renders normally, showing the full record.
- No error banner, no blank page.

---

### 3.2 A day that holds only the player's very first record

#### Behavior (CEO sign-off)

- When a day contains only the starting snapshot — the first record ever kept for
  a player, which has nothing before it to be compared against
- The day line shows a dash for what it added, for its speed and for its share of
  the ceiling, and is labelled as the starting point
- That day is not counted in the "how many days" total beside the filters

#### Classification

[Required automated test]

---

### 3.3 A day where the score went down

#### Behavior (CEO sign-off)

- When a day's records add up to less than zero
- The day line shows the negative figure in red
- The share of the ceiling shows a dash — a ceiling is a limit on production, and
  a loss did not produce anything

#### Classification

[Required automated test]

---

### 3.4 A day with a single send, after a long absence

#### Behavior (CEO sign-off)

- When a player has been away for days and sends once
- The day's window is measured from the start of that day, not from their last
  send days earlier
- The window length is printed under the speed, so the admin can see what the
  numbers were measured over

Reason: this is a day view. Every number on the line has to mean "inside this
day", or the line contradicts itself.

#### Classification

[Smoke test only]

---

### 3.4b The oldest day on the page, when the page cannot see the beginning

#### Behavior (CEO sign-off)

- The oldest day shown has nothing before it to measure from. That means one of two
  very different things, and the page must not guess between them
- When the record plainly starts at the player's own starting snapshot, that day
  really is their first: its window opens at their first send of the day
- When it does not — because the page stopped reading, or because the player was
  already collecting tokens before the record began — there is an earlier send the
  page cannot see. The day's speed and share of the ceiling show a dash

Reason: guessing here does not merely produce a vague number, it produces a
*fast* one. Opening the window at the day's own first send shortens it to the
slice we happen to hold, and the same honest day can read several times faster —
enough to cross a threshold and get someone looked at — purely because of where
the reading stopped. A dash is the same answer this page already gives everywhere
else it has no evidence.

This is why the busiest player's first listed day shows a dash rather than a
figure: their record begins part-way through their history, not at its start.

#### Classification

[Required automated test]

---

### 3.5 A day that contains something suspicious

#### Behavior (CEO sign-off)

- When any send inside a day is flagged as worth watching or as suspicious
- The day line carries the **highest** of those markings, plus a count — "1 of 24
  flagged" — so an admin can see it without opening the day
- Choosing "only flagged" keeps days that contain a flagged send, and opening one
  still shows **all** of that day's sends, not only the flagged one

Reason: grouping by day must not hide anything. A day view that averages a
suspicious send into a quiet day would quietly weaken the only thing this page
exists to do.

#### Classification

[Required automated test]

---

### 3.5b A day whose own figures look fine but which contains an impossible send

#### Behavior (CEO sign-off)

- When a day contains any send that is marked worth watching or suspicious, any
  send an admin has already reviewed and cleared, or any send that exceeded its own
  ceiling — whatever the day's own total did
- The day line shows both figures: the day's own share, and the worst single
  send's share. Over 100% is red; otherwise it is quiet grey
- This holds regardless of the day's own share, and regardless of the ordering or
  filter in effect
- A day with nothing marked in it shows only its own share, and stays quiet
- A day holding a reviewed-and-cleared send also says so, quietly — "1 reviewed OK"

Reason for including reviewed sends: clearing a send silences its warning, and
before this change that send still sat in the top-level list wearing its
"reviewed" badge where an admin would see it. Folded inside a collapsed day, a
cleared send would leave a day looking exactly like a day that never had one — the
regrouping would have quietly destroyed a record of a human decision.

Reason: this is the exact shape a day view could be used to hide behind. It is
the one case where the rolled-up number and the truth disagree, so the rolled-up
number is never shown alone.

#### Classification

[Required automated test]

---

### 3.6 A day that contains a withheld send

#### Behavior (CEO sign-off)

- When a day contains sends that are being withheld from the player's public total
- The day's gain still includes them, matching how the account summary above
  already counts
- The signal column notes how many were withheld and how much

#### Classification

[Required automated test]

---

### 3.7 Selecting sends for a bulk action

#### Behavior (CEO sign-off)

- Tick-boxes appear only inside a day that is open
- "Select all" therefore only ever reaches sends the admin can see

Reason: a control that selects rows nobody is looking at is how an admin
accidentally withholds a month of somebody's honest work.

#### Classification

[Smoke test only]

**Reproduce:**

1. Open a player with several days of records.
2. Open one day. Press "select all", then read the count.

**Pass criteria:**

- The count matches the number of sends visible inside the open day.
- Closing the day and pressing "select all" selects nothing.

---

### 3.8 Two admins working at once

#### Behavior (CEO sign-off)

- When one admin withholds a send while another has the same player open
- The second admin's next action or refresh shows the new state

Nothing on this page is stored between visits; every number is worked out afresh
each time the page is drawn.

#### Classification

[Smoke test only]

---

### 3.9 Going back

#### Behavior (CEO sign-off)

- Which month is chosen, which day is open, the ordering and the flagged filter
  all live in the page's address
- The browser's back button returns the admin to exactly the view they came from
- Opening or closing a day does not jump the page

#### Classification

[Smoke test only]

---

### 3.10 A player with a long record

#### Behavior (CEO sign-off)

- The page must read enough of a player's record for the month picker to be
  honest. Today it stops at 200 changes; the busiest player already has 182, so
  the picker would soon start omitting whole months that plainly exist
- The page reads up to 2000 changes
- When a player has more changes than that, the page says so in a line above the
  day list — "showing the most recent 2000 changes; anything earlier is not on
  this page" — and the month picker is understood to cover only what was read

Reason: 2000 is roughly five years of the busiest account we have, so this is a
ceiling nobody is expected to reach. But a picker that silently drops a month is
worse than a page that admits where it stops, so the admission ships with the
higher number rather than waiting for the day it is needed.

#### Classification

[Smoke test only]

**Reproduce:**

1. Open the busiest player's page.
2. Open the month picker.

**Pass criteria:**

- Every month from their first record to the current one is offered.
- Choosing the oldest month shows days in it.
- No truncation notice appears (no current player is near the limit).

---

### 3.11 The record cannot be read at all

#### Behavior (CEO sign-off)

- When the player's record cannot be loaded
- The page behaves exactly as it does today: the existing error banner, the page
  shell intact

#### Classification

[Smoke test only]

## 4. Correcting three mis-recorded entries for one player

Separate from the redesign, and to be done in the same piece of work.

The player `Ericccccc` has three entries whose **bookkeeping fields** are wrong.
They do not represent extra tokens; they represent a number written into the
wrong field. They dominate every chart on the page — two bars roughly forty times
taller than everything around them — and one of them puts a cliff down to zero
and back in the running-total curve.

| When          | What is recorded          | What actually happened                                                              |
| ------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| 18 Jul, 16:00 | a gain of 8,053,570,953   | a gain of **497,869,331** — what that entry's own evidence attests to               |
| 15 Aug, 17:34 | the total falling to zero | the player's app was reset; no tokens were lost                                     |
| 15 Aug, 17:37 | a gain of 17,433,498,018  | a gain of **213,651,085** — again exactly what that entry's own evidence attests to |

**Why the total cannot move.** Each entry stores the gain twice: a plain figure,
and a second one that the charts read. On 18 July only the **second** figure is
wrong — the plain one already says 497,869,331, and it is the plain one that
every total on the site is built from. So the 18 July correction touches nothing
any total has ever looked at. On 15 August the two entries currently cancel out
to 213,651,085 between them; afterwards one entry says 213,651,085 on its own.
The same number either way.

Above all of that: **a player's public total is a number stored on their own row,
not a sum of this record.** This record is a log of how that number moved. Editing
a log entry cannot move the number the log describes.

**One set of numbers does change, and should.** The admin page's own summary panel
— "total gained" and "biggest jump" — is added up from the very field that was
written wrongly. It therefore currently credits this player with about 24.8 billion
tokens they never gained, and reports their biggest single gain as 17.4 billion.
After the correction those read as what actually happened: the biggest real gain is
678,235,491, on 27 August. That is the panel being fixed, not broken. Nothing a
player or a visitor can see is involved.

**What is changed:** the 18 July entry's chart figure is corrected. The reset entry
is removed. The entry that follows it is restated as a normal gain from the total
that stood before the reset.

**What is not changed:** the player's total. It stays at 27,330,944,887 — the
same number, to the token. Their position on both boards is unaffected, and their
last thirty days still sum to the same figure. Because 15 August falls inside the
current thirty-day window, that last claim is not assumed — it is measured before
and after.

The two days keep the work that was really done on them, so neither day goes
blank in the new day list.

#### Behavior (CEO sign-off)

- The three original entries are written to a backup file before anything is
  changed, and that file is kept out of the repository
- After the change, the running-total curve is continuous — no cliff to zero, no
  bar that dwarfs the chart
- The player's total, their rank, and their thirty-day figure are all identical to
  what they were before

#### Classification

[Smoke test only]

**Reproduce:**

1. Note **all three** of these before the change: the player's total on the
   all-time board, their rank on it, and **the figure beside their name on the
   last-thirty-days board** together with their rank there.
2. Apply the correction.
3. Reload both boards and the player's admin page.

**Pass criteria:**

- The total on the all-time board is unchanged, to the token.
- **The last-thirty-days figure is unchanged, to the token, and so is their rank
  on that board.** This is the one that must be measured rather than assumed:
  15 August falls inside the current window.
- Their rank on the all-time board is unchanged.
- The running-total curve on their admin page rises smoothly through 18 July and
  through 15 August, with no drop to zero.
- The "what made the score go up" chart no longer has two bars that flatten
  everything else.
- 18 July and 15 August still show a gain in the day list.
- On the admin page only, "total gained" drops by 24,775,548,555 and "biggest jump"
  becomes 678,235,491 on 27 August. Both are the correction landing, not a fault.

## 4b. The automated tests

The scenarios above marked **[Required automated test]** are covered by
`lib/ranger/tests/daily-history.test.ts` — 30 tests, run by `npm test`. They need no
test framework: the runner and the TypeScript support are both already in the
Node the project runs on.

The cases were written from this document by people who were not allowed to read
the day-grouping code, so an expected value here is what the spec says it should
be, never a transcription of what the code happens to do. Every figure in them was
worked out by hand.

Still uncovered, and honestly so: everything that lives in the page's markup rather
than in a function — the truncation notice, "an opened day shows all of its sends",
"a closed day emits no tick-boxes", and the rule that changing the period clears the
open day. Those need a browser, and this project has no browser test setup. They are
covered by the manual smoke test instead.

## 5. What is deliberately not in scope

- The player-facing side of the site. This is the admin console only.
- Any change to how sends are judged, withheld, or released. The rules are
  untouched; only how they are presented changes.
- Any change to the account summary panel's contents.
- Grouping by week or by month inside the history table. Day is the unit.

## 6. Decision history

- **2026-09-06** — CEO chose "share of the physical ceiling" over "multiple of
  this player's own typical day" for the replacement column, on the grounds that
  it matches the measure the existing chart already draws and gives an absolute,
  not a relative, reading.
- **2026-09-06** — CEO chose to keep **only** the month picker above the charts,
  dropping the separately proposed time filter inside the history table. One
  control, one meaning, charts and table always in step.
- **2026-09-06** — CEO chose to correct the three mis-recorded entries rather
  than delete them, so the real work done on those two days survives in the day
  list.
- **2026-09-06** — Manager decision, CEO informed: the account summary panel does
  not follow the month picker. It is a whole-account report card.
- **2026-09-06** — After an adversarial review found thirteen defects in the first
  implementation, three rules were tightened and are recorded here because they
  change what the page shows: (a) § 3.4b — the oldest day shows a dash rather than a
  guessed window when the record does not start at the beginning; (b) § 3.5b — a
  reviewed-and-cleared send keeps its share on the day line, because folding it into
  a collapsed day would otherwise erase a human decision; (c) § 2.4 — a send the
  system waved through without judging is still measured against what was possible,
  so nothing can hide behind having been excused.
