-- ══════════════════════════════════════════════════════════════
-- Curse of Os — game_events table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ══════════════════════════════════════════════════════════════

create table if not exists game_events (
  id          uuid        primary key default gen_random_uuid(),
  event_name  text        not null,
  player_id   text        not null,
  properties  jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Fast lookups for dashboard queries
create index if not exists idx_game_events_event_name on game_events (event_name);
create index if not exists idx_game_events_player_id  on game_events (player_id);
create index if not exists idx_game_events_created_at on game_events (created_at desc);

-- Row-level security: anon can insert only, nobody can read through anon key
alter table game_events enable row level security;

create policy "allow anon insert"
  on game_events
  for insert
  to anon
  with check (true);

-- ⚠ Required for projects created after 2026-05-30
-- Supabase no longer grants table-level privileges automatically.
grant insert on game_events to anon;

-- ══════════════════════════════════════════════════════════════
-- Useful dashboard queries (run manually as needed):
-- ══════════════════════════════════════════════════════════════

-- Total unique players
-- select count(distinct player_id) from game_events where event_name = 'player_registered';

-- Completion rate per day
-- select properties->>'puzzle_id' as puzzle, count(*) as completions
--   from game_events where event_name = 'puzzle_progress'
--   and (properties->>'completed')::boolean = true
--   group by 1 order by 1;

-- Decision breakdown (betray vs cooperate)
-- select properties->>'decision_type' as type, count(*) as total
--   from game_events where event_name = 'decision_made'
--   group by 1;

-- Average session duration (seconds)
-- select round(avg((properties->>'duration_seconds')::numeric)) as avg_seconds
--   from game_events where event_name = 'session_ended';
