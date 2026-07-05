-- Migration: 0004_leaderboard_trees
-- Adds the per-tree breakdown column the desktop app upserts alongside the
-- aggregate score. This documents a column that already exists in the live
-- project (added out-of-band); the IF NOT EXISTS guard makes re-applying safe.
--
-- Shape (jsonb): { "<species>": { "tokens": int, "stage": int }, … }
--   e.g. {"apple": {"tokens": 90000000, "stage": 7},
--         "cherry": {"tokens": 12000000, "stage": 3}}
--   • keys are species kinds: apple / cherry / cactus (extensible)
--   • tokens = that tree's OWN token total
--   • stage  = that tree's OWN growth stage (0–7)
--
-- Relationship to the existing columns (unchanged):
--   • score       stays the grand total tokens across ALL of the user's trees
--   • tree        stays the current/main species
--   • stage_index stays the current/main tree's stage
--
-- The website reads `trees` to show each user's trees (main first) with their
-- own token counts; it falls back to the top-level fields when `trees` is empty.

alter table public.leaderboard
  add column if not exists trees jsonb not null default '{}'::jsonb;
