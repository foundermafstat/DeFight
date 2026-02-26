-- Supabase Migration: Chipnet Integration
-- To be executed in the Supabase SQL Editor or CLI

-- 1. auth_users defaults to Chipnet (10001) instead of BCH Testnet (97)
ALTER TABLE public.auth_users 
ALTER COLUMN chain_id SET DEFAULT 10001;

-- 2. user_prompt_models defaults to BCHUSDT instead of BCHUSDT
ALTER TABLE public.user_prompt_models 
ALTER COLUMN symbol SET DEFAULT 'BCHUSDT'::text;

-- 3. Run a data conversion for existing test rows
UPDATE public.user_prompt_models 
SET symbol = 'BCHUSDT' 
WHERE symbol = 'BCHUSDT';
