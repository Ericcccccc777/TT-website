-- Migration: 0001_leaderboard
-- Creates the leaderboard table with RLS enabled and a public read policy.
-- This is a starting-point schema — extend columns as needed.

create table if not exists public.leaderboard (
  id          uuid primary key default gen_random_uuid(),
  username    text not null,
  score       integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.leaderboard enable row level security;

-- Allow anyone (including unauthenticated visitors) to read leaderboard entries.
create policy "Public read access"
  on public.leaderboard
  for select
  to anon, authenticated
  using (true);

-- Only authenticated users (or service-role) can insert/update entries.
-- Adjust or add more policies to match your write access model.
create policy "Authenticated insert"
  on public.leaderboard
  for insert
  to authenticated
  with check (true);

-- Table-level grants for the Data API roles.
-- Required because the project has "Automatically expose new tables" turned OFF:
-- RLS policies above decide WHICH ROWS are visible, but the API roles still need
-- table-level privileges to reach the table at all. RLS remains the access gate.
grant select on public.leaderboard to anon, authenticated;
grant insert on public.leaderboard to authenticated;
