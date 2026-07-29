# Ranger — leaderboard moderation (admin)

An admin-only page at **/ranger** for keeping cheaters off the public leaderboard.

## Happy path

1. An authorized admin opens `/ranger` and signs in with an email and password.
2. They see the full leaderboard, including entries and identities that visitors
   never see.
3. Next to a cheating entry they click **Hide**. That person immediately
   disappears from the public leaderboard and from the global "trees / tokens"
   counts on the site.
4. **Unhide** reverses it and the entry reappears publicly.

## How hiding behaves

- Hiding is tied to the player's **account identity**, not their name or
  country. If the cheater renames themselves or changes their region, they stay
  hidden.
- The hidden player's app keeps working normally; their data is simply filtered
  out of everything the public sees.
- Only the one authorized admin address can sign in. Any other account — even a
  valid one — is refused.

## Holding suspicious gains (migration 0016)

Hide/Unhide above removes a whole player. Alongside it, the database judges each
individual score increase and simply stops counting the ones it distrusts. The
player **stays on the board**; only those gains are missing from their total.

```
raw_score    what the client says its total is
held_tokens  the increases we are not counting
score        raw_score − held_tokens   ← what the board, badge and stats show
```

Nothing downstream changed: everything still reads `score`, which is now the
public figure. Held tokens are not destroyed — they stay in `raw_score`, so the
player's own progress is untouched and releasing a gain restores it in full.

On a player's page each increase carries two buttons:

- **Release** — count it after all; the score goes up immediately.
- **Hold** — stop counting one the rules let through.

Both are sticky (`decided_by`), and re-evaluation never overrides a human.

Why: an authorised red-team run showed the existing evidence layer does not
defend the attack that works — a fake AI endpoint fed to Claude Code in a loop,
which writes fabricated usage into a genuine, well-formed log. Every consistency
check passed for a run that spent zero real tokens. The rules, the thresholds,
the four candidate signals that were tested and discarded, and the live-board
calibration are all in the header of
`supabase/migrations/0016_leaderboard_quarantine.sql`.

The load-bearing rule is the wall-clock ceiling — increase divided by seconds
elapsed on the *server's* clock. Every other signal reads numbers the client
supplies and can therefore be switched off by simply not supplying them; this
one cannot, and it is what makes cheating slow rather than free.

Players are never told. Their row stays, their uploads keep succeeding, and no
error is returned.

## Reading a hold, and spotting a throttled run

Each held gain carries the machine's reasons as codes — `peak`, `rate`,
`wallclock`, `impossible_windows`, `relaunder`. The player page spells each one
out in a sentence: what the rule measured, and how it compares to the heaviest
honest account on the board, so the verdict can be judged without opening the
migration.

Separately, the page may show **Possible throttling — nothing was held**. A cheat
that paces itself just under every ceiling trips no rule, so it produces no held
rows and the page would otherwise look clean. This reports the shape across
events instead: what share of gains sat at or above 60% of a limit. Real work is
bursty and rarely comes close; a governed loop parks near the line and stays
there. It needs at least four measurable events with over half of them hugging,
it ignores gains that were already held, and **it holds nothing** — it exists
only to point a human at an account. Treat it as a shape, not as proof.

## Known limitation (accepted for this version)

If a cheater completely reinstalls the app and re-registers, they receive a
brand-new identity, so they would need to be hidden again. Catching that would
require a device fingerprint from the desktop app (a larger change with privacy
implications) and is intentionally out of scope for now.

## Smoke test (manual)

1. In Supabase, create the admin account (email + password, Auto Confirm).
2. Apply the database migration and set the server key (see the implementation
   note).
3. Open `/ranger`, sign in. Confirm a wrong password and a non-admin account are
   both refused.
4. Hide a test entry → confirm it vanishes from `/leaderboard` and the homepage
   counts. Unhide it → confirm it returns.
