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

Prices come from `Token-Forest/src/dashboard/pricing.json`, the same file the
desktop app uses, seeded into `public.model_prices` by migration 0018.

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

## ⚠️ Prices have two consumers

`pricing.json` feeds both the hosted file the desktop app pulls daily **and**
this table. Updating prices is two acts:

1. publish the new `pricing.json` on the website;
2. re-run `Token-Forest/tools/gen_model_prices_sql.py` and apply the regenerated
   `0018_model_prices_seed.sql`.

Do only the first and every tree shows today's rates while the board still ranks
on yesterday's.
