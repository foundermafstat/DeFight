-- AI Battles / GameMaster
-- Run this in Supabase SQL Editor

create table if not exists public.leaderboard_scores (
  player_address text primary key,
  agent_name text not null,
  pnl numeric not null default 0,
  updated_at bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists leaderboard_scores_pnl_idx
  on public.leaderboard_scores (pnl desc);

create index if not exists leaderboard_scores_updated_at_idx
  on public.leaderboard_scores (updated_at desc);

