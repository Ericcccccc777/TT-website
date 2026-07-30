# Forest value — what a tree is worth in dollars

A second way to rank the same trees: not how many tokens they hold, but what
those tokens would have cost.

## What the number means

Every tree already reports which models burned its tokens (migration 0015). The
value board multiplies those counts by a price table kept in the database, and
`public.leaderboard_value` gives one row per account:

| column | meaning |
|---|---|
| `value_usd` | the tokens on that tree priced at the **current** table |
| `unpriced_tokens` | tokens whose model has no price row yet |

Prices come from `https://www.tokenforest.com.au/pricing.json` — the same file
the desktop app downloads — synced into `public.model_prices` once a day by
migration 0018.

**It is an estimate, not a bill.** Someone on a Claude Pro or Max subscription
pays a monthly fee that has nothing to do with per-token rates. Any page showing
this must say so, the way the dashboard footer already does.

## Three decisions worth knowing

**The server multiplies; the client never sends money.** Money computed on the
client would be one more forgeable field, and an easier one than tokens — 100
tokens paired with $99999 walks past all five rules in migration 0016, because
those measure token throughput and none of them looks at a dollar figure.
Uploading tokens alone keeps cheating on the surface that is already watched, and
adds no new field, so the privacy notice and consent dialog are unaffected.

**Current prices for everyone, not each user's historical rates.** Freezing each
gain at the price on the day it was collected sounds fairer and is not: two
people with identical usage would rank differently because one of them happened
to collect before a price cut. The cost of this choice is real — when a vendor
cuts prices, every tree is worth less that day — and the alternative costs more,
because a model with no price row would be worth $0 permanently and new models
appear constantly.

**Unpriced models count tokens, not money.** A day spent on a brand-new model
moves the token board and leaves the value board alone. `unpriced_tokens` says
how much is in that state, so a page can render `≥ $X` rather than implying
precision. Nothing is stored, so when the price finally lands, that history
becomes valuable on its own.

## How held gains are handled

Migration 0016 withholds suspicious gains by reducing `leaderboard.score` while
`leaderboard_models` keeps the client's untouched snapshot. Without a correction
an account with 99% of its gains held would rank at 100% of its value, so the
view scales by `score / raw_score` via `private.hold_ratio`.

This is an approximation: history records no model breakdown, so which models the
held tokens belonged to is unknowable. Honest accounts sit at a ratio of 1 and are
untouched, and a missing row or a zero `raw_score` falls back to 1 — refusing to
scale beats zeroing out an account because a lookup came up empty.

The ratio goes through a definer function rather than the view reading
`raw_score` itself: `raw_score` minus `score` **is** the withholding decision, and
publishing it would tell a held player exactly how much was taken.

## Reading it

```sql
select l.username, v.value_usd, v.unpriced_tokens
from leaderboard_value v
join leaderboard l using (user_id)
order by v.value_usd desc;
```

Bans (0005) and hidden rows (0016) are filtered by the base tables' own policies
— the view is `security_invoker`, so it inherits them rather than restating them.

## Keeping prices current

`pricing.json` has two consumers — the desktop app downloads it, and this table
syncs from it. Both read the same URL, so updating prices is one act:

```bash
# in Token-Forest, after editing src/dashboard/pricing.json
python tools/publish_pricing.py     # writes TT-website/public/pricing.json
```

Commit and push; Netlify deploys; Supabase picks it up at 04:17 UTC. To skip the
wait, run `select public.sync_model_prices();` in the SQL Editor.

### Why it is worth the machinery

The first design generated a `0018_model_prices_seed.sql` to be re-run by hand
after every price change. It was never run once. By the time anyone looked:

| | models | `_updated` |
|---|---|---|
| app bundled table | 96 | 2026-07-22 |
| website `pricing.json` | 77 | 2026-07-21 |
| `public.model_prices` | 0 | — |

Worse, the drift was silently breaking in-app price updates too: the client skips
a downloaded table whose `_updated` is older than the one it ships with
(`pricing.stale_overlay`), so a website file stuck a day behind meant every
installed copy ignored it entirely. `publish_pricing.py` refuses to publish a
table older than what is already up, which is what closes that hole.

### What the sync will not do

`apply_model_prices` replaces the table wholesale — a model dropped by its vendor
has to disappear, or the board keeps pricing a product that no longer exists. A
wholesale replace is also how a truncated or half-deployed file could zero out
every price at once, so a payload is rejected outright — old prices untouched,
reason in `model_prices_sync.last_error` — if any of these hold:

| rejected when | because |
|---|---|
| fewer than 20 models | file truncated or replaced by a placeholder |
| a vendor is not an object, or is `{}` | that vendor's prices vanish, silently |
| a rate is not an object | that model's price vanishes, silently |
| `input` or `output` missing | coerced to 0 — see below |
| any rate non-numeric or negative | nonsense prices |
| two models collide under `private.price_key` | one usage row joins twice |

Nothing malformed is skipped over, and that is the point. Filtering a broken
vendor out rather than refusing the file would drop every Claude price while the
remaining seventy-odd models still clear the floor of 20 — a wholesale replace
executes, and the status row reads *success*. A price table has to fail loudly.

Missing `input`/`output` is worth its own rule because **a price of zero is worse
than no price at all**. A model absent from the table lands in `unpriced_tokens`
and the page can render `≥ $X`; a model present at $0 is *priced*, and its tokens
are quietly worth nothing with no indicator anywhere. Cache rates stay optional —
19 of the 96 models carry only `input` and `output`, and no Codex model has a
`cache_write` tier.

The collision rule is not about the primary key. The view joins on the
*normalized* name, so `claude-opus-5` and `claude-opus-5-latest` are two legal
rows that both match the same usage row — every token billed twice, for one
account, silently. Vendors publish `-latest` aliases routinely; the
suffix-stripping rule exists precisely because those names show up.

`publish_pricing.py` applies the vendor, missing-rate and collision checks before
the file is ever deployed, which is where you actually want to hear about them —
a failure at 04:17 UTC only reaches `last_error`.

The fetch never raises. Raising would roll back the transaction that records
*why* it failed, leaving a silent daily failure and an empty status row.

```sql
select last_success_at, source_updated, model_count, last_error
from model_prices_sync;
```

`last_success_at`, `source_updated` and `model_count` are readable by anyone — a
page can render "prices as of …". `last_error` and `last_attempt_at` are not:
one can carry upstream detail, the other exposes the job's schedule.
