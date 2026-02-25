-- Seed 4 additional models with interesting runs/graphs for user 6a5b1ed7-6309-4075-8cf6-64624a0c8562
-- Starting balance 1000, with intermediate fluctuations

BEGIN;

-- 1. Volatile Trend Hunter (Positive)
DO $$
DECLARE
    m_id uuid;
    u_id uuid := '6a5b1ed7-6309-4075-8cf6-64624a0c8562';
BEGIN
    INSERT INTO public.user_prompt_models (user_id, model_name, prompt_text, llm_model, symbol, total_runs, last_pnl, last_roi_pct, last_result_at)
    VALUES (u_id, 'Volatile Trend Hunter', 'Focus on high-volatility breakouts on 5m chart with tight trailing stop.', 'gpt-4.1-mini', 'SOLUSDT', 6, 1420, 42.0, NOW())
    ON CONFLICT (user_id, model_name) DO UPDATE
    SET prompt_text = EXCLUDED.prompt_text, 
        last_pnl = EXCLUDED.last_pnl, 
        last_roi_pct = EXCLUDED.last_roi_pct, 
        last_result_at = EXCLUDED.last_result_at,
        total_runs = EXCLUDED.total_runs
    RETURNING id INTO m_id;

    -- Upsert runs
    INSERT INTO public.user_prompt_model_runs (run_id, model_id, user_id, pnl, roi_pct, started_at, ended_at) VALUES
    ('vth-r1', m_id, u_id, 1000, 0, NOW() - interval '6 days', NOW() - interval '6 days'),
    ('vth-r2', m_id, u_id, 1150, 15.0, NOW() - interval '5 days', NOW() - interval '5 days'),
    ('vth-r3', m_id, u_id, 1080, 8.0, NOW() - interval '4 days', NOW() - interval '4 days'),
    ('vth-r4', m_id, u_id, 1250, 25.0, NOW() - interval '3 days', NOW() - interval '3 days'),
    ('vth-r5', m_id, u_id, 1190, 19.0, NOW() - interval '2 days', NOW() - interval '2 days'),
    ('vth-r6', m_id, u_id, 1420, 42.0, NOW() - interval '1 day', NOW() - interval '1 day')
    ON CONFLICT (run_id) DO UPDATE SET model_id = m_id, pnl = EXCLUDED.pnl, roi_pct = EXCLUDED.roi_pct;
END $$;

-- 2. Steady Climber (Positive)
DO $$
DECLARE
    m_id uuid;
    u_id uuid := '6a5b1ed7-6309-4075-8cf6-64624a0c8562';
BEGIN
    INSERT INTO public.user_prompt_models (user_id, model_name, prompt_text, llm_model, symbol, total_runs, last_pnl, last_roi_pct, last_result_at)
    VALUES (u_id, 'Steady Climber', 'Low risk market neutral strategy targeting small inefficiencies.', 'gpt-4.1-mini', 'ETHUSDT', 7, 1085, 8.5, NOW())
    ON CONFLICT (user_id, model_name) DO UPDATE
    SET prompt_text = EXCLUDED.prompt_text, 
        last_pnl = EXCLUDED.last_pnl, 
        last_roi_pct = EXCLUDED.last_roi_pct, 
        last_result_at = EXCLUDED.last_result_at,
        total_runs = EXCLUDED.total_runs
    RETURNING id INTO m_id;

    INSERT INTO public.user_prompt_model_runs (run_id, model_id, user_id, pnl, roi_pct, started_at, ended_at) VALUES
    ('sc-r1', m_id, u_id, 1000, 0, NOW() - interval '7 days', NOW() - interval '7 days'),
    ('sc-r2', m_id, u_id, 1015, 1.5, NOW() - interval '6 days', NOW() - interval '6 days'),
    ('sc-r3', m_id, u_id, 1030, 3.0, NOW() - interval '5 days', NOW() - interval '5 days'),
    ('sc-r4', m_id, u_id, 1025, 2.5, NOW() - interval '4 days', NOW() - interval '4 days'),
    ('sc-r5', m_id, u_id, 1045, 4.5, NOW() - interval '3 days', NOW() - interval '3 days'),
    ('sc-r6', m_id, u_id, 1060, 6.0, NOW() - interval '2 days', NOW() - interval '2 days'),
    ('sc-r7', m_id, u_id, 1085, 8.5, NOW() - interval '1 day', NOW() - interval '1 day')
    ON CONFLICT (run_id) DO UPDATE SET model_id = m_id, pnl = EXCLUDED.pnl, roi_pct = EXCLUDED.roi_pct;
END $$;

-- 3. The Whale Trap (Negative)
DO $$
DECLARE
    m_id uuid;
    u_id uuid := '6a5b1ed7-6309-4075-8cf6-64624a0c8562';
BEGIN
    INSERT INTO public.user_prompt_models (user_id, model_name, prompt_text, llm_model, symbol, total_runs, last_pnl, last_roi_pct, last_result_at)
    VALUES (u_id, 'The Whale Trap', 'Aggressive long on any 1% green candle, ignoring overall trend.', 'gpt-4.1-mini', 'BTCUSDT', 6, 500, -50.0, NOW())
    ON CONFLICT (user_id, model_name) DO UPDATE
    SET prompt_text = EXCLUDED.prompt_text, 
        last_pnl = EXCLUDED.last_pnl, 
        last_roi_pct = EXCLUDED.last_roi_pct, 
        last_result_at = EXCLUDED.last_result_at,
        total_runs = EXCLUDED.total_runs
    RETURNING id INTO m_id;

    INSERT INTO public.user_prompt_model_runs (run_id, model_id, user_id, pnl, roi_pct, started_at, ended_at) VALUES
    ('wt-r1', m_id, u_id, 1000, 0, NOW() - interval '6 days', NOW() - interval '6 days'),
    ('wt-r2', m_id, u_id, 1300, 30.0, NOW() - interval '5 days', NOW() - interval '5 days'),
    ('wt-r3', m_id, u_id, 1100, 10.0, NOW() - interval '4 days', NOW() - interval '4 days'),
    ('wt-r4', m_id, u_id, 950, -5.0, NOW() - interval '3 days', NOW() - interval '3 days'),
    ('wt-r5', m_id, u_id, 800, -20.0, NOW() - interval '2 days', NOW() - interval '2 days'),
    ('wt-r6', m_id, u_id, 500, -50.0, NOW() - interval '1 day', NOW() - interval '1 day')
    ON CONFLICT (run_id) DO UPDATE SET model_id = m_id, pnl = EXCLUDED.pnl, roi_pct = EXCLUDED.roi_pct;
END $$;

-- 4. Death by 1000 Cuts (Negative)
DO $$
DECLARE
    m_id uuid;
    u_id uuid := '6a5b1ed7-6309-4075-8cf6-64624a0c8562';
BEGIN
    INSERT INTO public.user_prompt_models (user_id, model_name, prompt_text, llm_model, symbol, total_runs, last_pnl, last_roi_pct, last_result_at)
    VALUES (u_id, 'Death by 1000 Cuts', 'Scalping 0.1% moves with high frequency, paying high commissions.', 'gpt-4.1-mini', 'BNBUSDT', 7, 880, -12.0, NOW())
    ON CONFLICT (user_id, model_name) DO UPDATE
    SET prompt_text = EXCLUDED.prompt_text, 
        last_pnl = EXCLUDED.last_pnl, 
        last_roi_pct = EXCLUDED.last_roi_pct, 
        last_result_at = EXCLUDED.last_result_at,
        total_runs = EXCLUDED.total_runs
    RETURNING id INTO m_id;

    INSERT INTO public.user_prompt_model_runs (run_id, model_id, user_id, pnl, roi_pct, started_at, ended_at) VALUES
    ('dbc-r1', m_id, u_id, 1000, 0, NOW() - interval '7 days', NOW() - interval '7 days'),
    ('dbc-r2', m_id, u_id, 980, -2.0, NOW() - interval '6 days', NOW() - interval '6 days'),
    ('dbc-r3', m_id, u_id, 960, -4.0, NOW() - interval '5 days', NOW() - interval '5 days'),
    ('dbc-r4', m_id, u_id, 970, -3.0, NOW() - interval '4 days', NOW() - interval '4 days'),
    ('dbc-r5', m_id, u_id, 940, -6.0, NOW() - interval '3 days', NOW() - interval '3 days'),
    ('dbc-r6', m_id, u_id, 920, -8.0, NOW() - interval '2 days', NOW() - interval '2 days'),
    ('dbc-r7', m_id, u_id, 880, -12.0, NOW() - interval '1 day', NOW() - interval '1 day')
    ON CONFLICT (run_id) DO UPDATE SET model_id = m_id, pnl = EXCLUDED.pnl, roi_pct = EXCLUDED.roi_pct;
END $$;

COMMIT;
