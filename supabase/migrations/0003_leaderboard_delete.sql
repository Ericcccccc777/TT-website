-- Migration: 0003_leaderboard_delete
-- Lets a user REMOVE their own leaderboard row when they opt out (撤榜).
-- The desktop app calls DELETE /rest/v1/leaderboard?user_id=eq.<uid> when the
-- user turns the leaderboard OFF. RLS scopes the delete to the row owner only.
--
-- Idempotent: policy is dropped before recreation; GRANT is a no-op if present.
-- Assumes 0001 + 0002 already applied.

drop policy if exists "leaderboard_delete_own" on public.leaderboard;

create policy "leaderboard_delete_own"
  on public.leaderboard
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant delete on public.leaderboard to authenticated;
