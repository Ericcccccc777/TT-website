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

**The server multiplies; the client never sends money.** A dollar figure computed
on the client would be a forgeable field that nothing checks — 100 tokens paired
with $99999 walks past all five rules in migration 0016, because those measure
token throughput and none of them looks at money. Keeping the multiplication on
the server also means no new field leaves the machine, so the privacy notice and
consent dialog are unaffected.

It is worth being exact about how much this buys, because an earlier draft of
this document overstated it. Moving the arithmetic server-side removes the
*unbounded* lie. It does not make value as trustworthy as tokens: the client
still chooses which model and which rate tier each token is filed under, and
those are the multiplicands. See "What this does and does not buy" below for the
measured size of that gap.

**Current prices for everyone, not each user's historical rates.** Freezing each
gain at the price on the day it was collected sounds fairer and is not: two
people with identical usage would rank differently because one of them happened
to collect before a price cut. The cost of this choice is real — when a vendor
cuts prices, every tree is worth less that day — and the alternative costs more,
because a model with no price row would be worth $0 permanently and new models
appear constantly.

**An unpriced version borrows the previous one's rate; an unpriced family gets
nothing.** Lookup runs three ways: exact, then with version/date suffixes
stripped, then the newest *lower* version in the same family — so
`claude-opus-5` is valued at `claude-opus-4-8`'s rate until the table catches up.

This is load-bearing, not a nicety. On the largest live account, 445M collected
tokens — 98% of that tree — sat under `claude-opus-5` while the table stopped at
4-8, making the whole tree worth **$7.44**. With the fallback it is **$582.21**
and nothing is unpriced. Vendors ship faster than price tables get updated, so
without this the board is mostly noise.

The fallback only walks backwards. A genuinely new family has no trustworthy
reference and stays unpriced.

A digit run counts as a version only if **nothing alphanumeric follows it**. That
one-sided rule was tuned against the 96 real model names. Requiring a clean
character *after* is what keeps parameter counts and context lengths out —
`ministral-3b`, `command-r7b` and `glm-32b-128k` carry no version at all, so
`ministral-12b` can never inherit `8b`'s rate. Requiring one *before* would be a
mistake: half the industry glues the version to a letter (`minimax-m3`,
`kimi-k3`, `deepseek-v4-flash`, `qwen3-max`), and under that rule `minimax-m4`
would not recognise `minimax-m3` as its predecessor — the fallback would fail in
exactly the situation it exists for. Context variants stay separate either way,
because `moonshot-v1-8k` and `moonshot-v1-128k` differ in the part that survives.

A unique index enforces one row per (family, version). `foo-4-8` and `foo-4.8`
have different primary keys and different `price_key`s, yet they normalise to the
same family and version — a later `foo-5` would then have two tied candidates,
and the client (which keeps the first it sees) and the server (whose `ORDER BY`
has no tie-breaker) could pick different rates. An index makes that table
unstorable rather than arbitrating between them; `publish_pricing.py` rejects the
same shape before it is ever deployed.

Version segments parse as arbitrary-precision numbers, not machine integers.
Model IDs may run to 64 characters, so `claude-opus-999999999999999999999` is a
legal upload; an `int[]` cast raises *integer out of range*, and because
`leaderboard_value` is public, one such row would fail the entire board's queries
for every visitor.

Because `unpriced_tokens` now sits near zero for most accounts, the view reports
`estimated_usd` alongside `value_usd` — the share of the money that came from a
borrowed rate. Without it, "this number is an estimate" would be invisible.

## What the database will accept as model usage

Migration 0019 enforces two invariants on `leaderboard_models`. A write that
breaks either is rejected outright — the client sees an error and retries on the
next sync; nothing partial is stored.

| invariant | enforced by |
|---|---|
| `input + output + cache_read + cache_write_5m + cache_write_1h = tokens` | `CHECK` constraint |
| Σ `tokens` over an account's rows ≤ that account's `raw_score` | deferred constraint trigger |

**Why this exists.** The claim that "the server multiplies, so cheating stays on
the token surface 0016 already watches" was false as originally shipped. 0015
grants a player `UPDATE` on their own rows, nothing tied the component columns to
`tokens` or to any score, and `leaderboard_value` prices those columns directly.
So `update leaderboard_models set input = 10^15` bought an arbitrary public dollar
figure **with the score untouched** — and all five rules in 0016 read score
deltas, so none of them fire. That is the rejected "client sends money" design
re-entering through a side door: the client wasn't sending dollars, it was
sending the multiplicands, unbounded.

The cap uses `raw_score`, not `score`: the view already scales by
`hold_ratio = score / raw_score`, so capping on `score` would punish one
withholding twice. An account with no `leaderboard` row caps at zero — otherwise
"write model rows, never write a score row" is a path around every audit.

**What this does and does not buy.** These constraints bind the *quantity* of
tokens. They do not bind their *attribution*, and that distinction decides
whether a public value board is meaningful at all.

An earlier version of this document claimed that inflating value is never easier
than inflating score. **That was wrong.** Holding the total fixed, a player may
relabel a row to a costlier model and shift its tokens into the costliest slot —
RLS permits it, the sanitizer permits it, both constraints above permit it, and
the view prices those columns directly.

The spread in the shipped table runs from `$0.0028/M` (deepseek-chat cache reads)
to `$180/M` (gpt-5.5-pro output): a factor of **64,286**. Measured against the
largest real account: its public value today is `$7.44`; relabelled to the
costliest tier, within every constraint and with the score untouched, it becomes
`$2,132,427`.

So while cheating the token board is worth one point per point, cheating the
value board is worth up to sixty thousand. No database constraint fixes this —
attribution comes from the client and there is nothing to check it against. The
honest options are to keep valuation private to each player (where lying to
yourself earns nothing) or to publish it while stating plainly that it is
self-reported. What 0019 still buys is real but narrower: the crudest forgery —
`set input = 10^15` — is gone, and no account can claim more tokens than the
score it was audited on.

**Two details that are load-bearing.**

The trigger is `DEFERRABLE INITIALLY DEFERRED`. A client upsert carries up to 30
rows and the trigger fires per row; an immediate trigger would see a half-applied
snapshot and reject a legal one — moving usage from model A to model B looks like
double-counting until both rows land.

It locks the account's `leaderboard` row before aggregating. Without the lock two
concurrent writes for different models each see only their own row, both pass,
and the committed total exceeds the cap — parallel requests would be a way
straight through it.

**A falling score is left to heal itself.** Scores do fall legitimately — an older
save restored, a model ledger cleared by the corruption guard — and for one sync
interval the old model rows can add up to more than the new ceiling.

The obvious fix is a trigger that clears the model rows when `raw_score` drops.
That version was written, and it deadlocks. It makes the score transaction lock
the parent row and then the model rows, while a model transaction locks model
rows and takes the parent lock at commit — opposite orders, one cycle, and
PostgreSQL kills a legitimate sync. Moving the model side's parent lock into a
`BEFORE` trigger does not help: an `UPDATE` locks the target row before `BEFORE
ROW` triggers run, so the order cannot be inverted from there. Both shapes
reproduce locally.

It is unnecessary anyway. Because the client deletes stale rows before writing
new ones, the surviving rows are exactly the new snapshot and the insert sets
them to the new values — the total at commit *is* the new snapshot's total, which
is bounded by the new score. The next sync always converges; there is no state
where the ceiling drops and uploads are wedged forever. The cost is a window of
at most one sync interval where the value board reads slightly high, on an event
that is already rare. That is a better trade than a guaranteed deadlock.

**The client uploads in a specific order because of this**: stale rows are
deleted *before* new ones are written. The reverse order makes the outgoing rows
and the incoming rows coexist for an instant, doubling the total and bouncing a
perfectly legal snapshot. That DELETE also filters on `cache_write_1h`, a
no-op predicate whose only job is to make the statement fail on a pre-0017
schema — otherwise the delete succeeds, the following insert degrades on the
missing column, and the rows are gone with no way to put them back.

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
| two models share a family *and* version (0020) | the fallback would pick between them arbitrarily |

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
