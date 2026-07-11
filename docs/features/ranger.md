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
