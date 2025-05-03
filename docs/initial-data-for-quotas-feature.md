-- Step 1: Add the new feature type to the enum
-- Note: Run this command separately, as ALTER TYPE cannot run inside a transaction block
--       with certain other commands in some PostgreSQL versions/contexts.
ALTER TYPE feature_enum ADD VALUE 'active_wizard';

-- Step 2: Define limits for concurrently active wizards per plan
-- Assuming plan IDs: 1 for 'free', 2 for 'pro' (Verify with SELECT id, code FROM plans;)
INSERT INTO plan_limits (plan_id, feature, time_window, hard_limit) VALUES
  -- Free Plan: Limit of 3 active wizards
  ( (SELECT id FROM plans WHERE code = 'free'), 'active_wizard', '0 seconds'::interval, 3),

  -- Pro Plan: Limit of 10 active wizards
  ( (SELECT id FROM plans WHERE code = 'pro'), 'active_wizard', '0 seconds'::interval, 10)

ON CONFLICT (plan_id, feature, time_window) DO NOTHING; -- Avoid errors if run multiple times

-- Verify the insertion (optional)
SELECT p.code as plan_code, pl.feature, pl.time_window, pl.hard_limit
FROM plan_limits pl
JOIN plans p ON pl.plan_id = p.id
WHERE pl.feature = 'active_wizard';