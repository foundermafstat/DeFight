-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.auth_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE,
  chain_id integer NOT NULL DEFAULT 10001,
  last_login_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT auth_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.leaderboard_scores (
  player_address text NOT NULL,
  agent_name text NOT NULL,
  pnl numeric NOT NULL DEFAULT 0,
  updated_at bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT leaderboard_scores_pkey PRIMARY KEY (player_address)
);
CREATE TABLE public.user_prompt_model_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  run_id text NOT NULL UNIQUE,
  model_id uuid NOT NULL,
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'solo'::text,
  pnl numeric NOT NULL,
  roi_pct numeric NOT NULL,
  trades_count integer NOT NULL DEFAULT 0,
  profitable_trades integer NOT NULL DEFAULT 0,
  win_rate_pct numeric NOT NULL DEFAULT 0,
  cycles integer NOT NULL DEFAULT 0,
  interval_ms integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_prompt_model_runs_pkey PRIMARY KEY (id),
  CONSTRAINT user_prompt_model_runs_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.user_prompt_models(id),
  CONSTRAINT user_prompt_model_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);
CREATE TABLE public.user_prompt_models (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model_name text NOT NULL,
  prompt_text text NOT NULL,
  llm_model text NOT NULL DEFAULT 'gpt-4.1-mini'::text,
  symbol text NOT NULL DEFAULT 'BCHUSDT'::text,
  settings_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_runs integer NOT NULL DEFAULT 0,
  total_trades integer NOT NULL DEFAULT 0,
  profitable_trades integer NOT NULL DEFAULT 0,
  average_roi_pct numeric NOT NULL DEFAULT 0,
  best_roi_pct numeric,
  worst_roi_pct numeric,
  last_pnl numeric,
  last_roi_pct numeric,
  last_result_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_prompt_models_pkey PRIMARY KEY (id),
  CONSTRAINT user_prompt_models_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
);