# Vendor usage board — what the forest actually runs on

`/leaderboard/usage` ranks AI vendors, and the models under them, by tokens
collected across every player. Vendors compete with each other here; players do
not appear at all.

## The three views

Migration 0021 adds them, all `security_invoker` so the base tables' RLS — bans
included — carries over without being restated:

| view | one row per | columns |
|---|---|---|
| `leaderboard_provider_usage` | vendor | `tokens`, `models`, `players` |
| `leaderboard_model_usage` | (vendor, model) | `tokens`, `players` |
| `private.model_vendor` | model name | `provider` resolved from `model_prices` |
| `leaderboard_attribution` | *(single row)* | `attributed_tokens`, `counted_tokens`, `lifetime_tokens`, `players_attributed`, `players_total` |

Models group on `(provider, model)`, not `model`. A model *name* is copied
verbatim out of a user's local logs — 0015 constrains the character set, nothing
more — so the same string can legitimately appear under two vendors. Grouping on
the name alone would merge them and the two boards would stop adding up.

## The vendor a row counts for is ours to decide, not the client's

`leaderboard_models.provider` is written by the desktop app and 0015 only checks
its character set. Left as-is, any participant could set their own rows to
`claude` and move that usage into Claude's public total — no score change, no
violation of 0019's cap, and the vendor ranking is theirs to write.

So the views ignore that column when they can. `private.model_vendor` looks each
distinct model name up in `model_prices` — a table the server controls, synced
daily from our own published file — and the boards group on the vendor found
there. The lookup runs over distinct model names (a few hundred), not over every
row.

A model that is not in the price table falls back to the client's claim, because
there is nothing to check it against. That is the same trust level the model
board already has, and such rows earn no money on the value board either.

## Nothing here is scaled by the withholding ratio

`leaderboard_value` scales each player by `hold_ratio`, so the obvious move was
to do the same here. It is wrong, and the reason is worth keeping.

A published figure of `floor(raw × ratio)` gives away `ratio` to anyone who can
read `raw` — and anonymous callers can: `leaderboard_models.tokens` is in the
public column grant. Dividing recovers the ratio exactly, and from there
`raw_score`, which is precisely the number 0017 refuses to publish because
`raw_score - score` *is* the withholding decision.

Aggregation does not save it. A bucket with one contributor is the same division
in disguise, and model IDs are user-controlled: a player can mint a unique model
name and guarantee they are alone in their bucket. Suppressing small buckets does
not work either — with a handful of attributed players almost every bucket is a
singleton, and the board would be mostly hidden without saying so.

So these views sum raw tokens and publish no scaled quantity at all. The output
is a sum of already-public numbers and carries no new information.

**The cost, stated plainly:** usage withheld by 0016 still counts toward its
vendor's total. That is acceptable here because this board answers "whose models
is this community running on", not "who is ahead of whom" — withholding is a
per-player fairness mechanism, one account's held share barely moves a global
total, and 0019 already caps any account's model tokens at its own score.

It also makes the arithmetic exact. Scaling floors every bucket independently, so
the finer the grouping the more is lost: the vendor totals would come out *below*
`attributed_tokens` and the reconciliation query at the end of the migration —
which asserts all three agree — would fail. Measured on a two-player fixture with
one held account: 1499 by vendor against 1500 by coverage.

## Two token columns, two accounting bases

`attributed_tokens` is the raw sum and matches the vendor and model boards
exactly — it is what the migration's reconciliation query checks.

`counted_tokens` caps each account's contribution at that account's own `score`
before summing, and it is the one the coverage percentage divides by
`lifetime_tokens`.

They differ because dropping the scaling left the two sides on different bases:
model rows are raw, `score` is what survives 0016's withholding. Dividing one by
the other lets a heavily-held account push the label past 100% — on a figure
whose entire purpose is to look trustworthy. Measured on a two-account fixture
with one account held to 10%: **127.3%** before the cap, **54.5%** after.

The cap reads only public values (an account's model total, and its score), so it
adds no disclosure, and it puts the ratio in 0–1 by construction rather than by
clamping after the fact.

## The page says how little it covers

Per-model attribution shipped on 2026-07-29 and counts only bubbles popped after
that. Older tokens were banked with no model name and cannot be back-filled —
that would mean reading logs from before the app was installed, which was
rejected on privacy grounds.

The window is currently a few percent of all tokens ever counted, and it is not a
random sample. On a real account, 71% of lifetime tokens were Opus 4.8 while 96.6%
of the attributed window was Opus 5 — the window says the opposite of the
lifetime. A visitor who reads this board as "what people use" gets a confident,
wrong answer.

So the coverage ratio is a gold-edged band above the board, computed live rather
than hard-coded, and:

**When the coverage figure cannot be read, the board does not render.**
`getAttribution()` returns `null` on failure, never `ratio: 0` — a zero renders as
a perfectly plausible "0% covered" that is indistinguishable from the truth. The
page shows a distinct "board unavailable" notice, which is deliberately *not* the
same as the empty state.

## Routing

Three sibling routes, three `<Link>`s, `aria-current` — not a client-side tab
widget. The board is the URL, so it is shareable, survives the back button and
works without JavaScript. `role="tab"` is avoided on purpose: it promises
assistive tech a panel swap that never happens.

Filtering to one vendor is `?p=<provider>`, validated against the vendors
actually on the board — an arbitrary string falls back to the unfiltered view
rather than rendering an empty list that looks broken. Filtered views are
`noindex, follow` with a self-canonical, the same treatment `?page` already gets
on the token board: the vendor string derives from user-supplied model names and
is not something to let a crawler enumerate.

## The model list is capped, and says so

`getModelUsage` takes the top 100 and also asks for the exact count. When there
are more, the heading reads "showing the top 100 of 340". Model IDs are
open-ended user input, so this list grows without bound; a silent cut would read
as "that is all of them".

## Colour

Vendors are open-ended, so hand-picking a brand colour per vendor does not scale.
`claude` and `codex` keep the two colours the app has always used; everything
else takes a slot from the existing palette by position. Colour never carries
meaning alone — every bar sits beside its vendor name — so a repeat further down
the list costs nothing.
