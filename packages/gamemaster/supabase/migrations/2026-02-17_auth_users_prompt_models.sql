-- AI Battles migration: users + prompt models + model runs
-- Upload this SQL manually via Supabase SQL Editor.
-- Note: Designed for MVP/test mode. Uses permissive table access so server can work with publishable key.

create extension if not exists pgcrypto;

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

create table if not exists public.auth_users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  chain_id integer not null default 97,
  last_login_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists auth_users_wallet_idx on public.auth_users (wallet_address);

create table if not exists public.user_prompt_models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.auth_users(id) on delete cascade,
  model_name text not null,
  prompt_text text not null,
  llm_model text not null default 'gpt-4.1-mini',
  symbol text not null default 'BCHUSDT',
  settings_json jsonb not null default '{}'::jsonb,
  total_runs integer not null default 0,
  total_trades integer not null default 0,
  profitable_trades integer not null default 0,
  average_roi_pct numeric not null default 0,
  best_roi_pct numeric,
  worst_roi_pct numeric,
  last_pnl numeric,
  last_roi_pct numeric,
  last_result_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, model_name)
);

create index if not exists user_prompt_models_user_idx on public.user_prompt_models (user_id);
create index if not exists user_prompt_models_updated_idx on public.user_prompt_models (updated_at desc);
create index if not exists user_prompt_models_last_roi_idx on public.user_prompt_models (last_roi_pct desc nulls last);

create table if not exists public.user_prompt_model_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null unique,
  model_id uuid not null references public.user_prompt_models(id) on delete cascade,
  user_id uuid not null references public.auth_users(id) on delete cascade,
  source text not null default 'solo',
  pnl numeric not null,
  roi_pct numeric not null,
  trades_count integer not null default 0,
  profitable_trades integer not null default 0,
  win_rate_pct numeric not null default 0,
  cycles integer not null default 0,
  interval_ms integer not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_prompt_model_runs_user_idx on public.user_prompt_model_runs (user_id);
create index if not exists user_prompt_model_runs_model_idx on public.user_prompt_model_runs (model_id);
create index if not exists user_prompt_model_runs_ended_idx on public.user_prompt_model_runs (ended_at desc);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_prompt_models_updated_at on public.user_prompt_models;
create trigger trg_user_prompt_models_updated_at
before update on public.user_prompt_models
for each row
execute procedure public.set_current_timestamp_updated_at();

-- MVP permissions: allow server access even with publishable key
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.leaderboard_scores to anon, authenticated, service_role;
grant select, insert, update, delete on public.auth_users to anon, authenticated, service_role;
grant select, insert, update, delete on public.user_prompt_models to anon, authenticated, service_role;
grant select, insert, update, delete on public.user_prompt_model_runs to anon, authenticated, service_role;

alter table public.leaderboard_scores disable row level security;
alter table public.auth_users disable row level security;
alter table public.user_prompt_models disable row level security;
alter table public.user_prompt_model_runs disable row level security;
