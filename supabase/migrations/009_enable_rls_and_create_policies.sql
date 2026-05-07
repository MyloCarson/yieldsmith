-- Migration: Enable Row-Level Security (RLS) and create policies
-- Description: Enforce user data isolation - each user can only access their own data
-- Created: 2026-05-07
--
-- NOTE: RLS Enforcement Strategy
-- ============================
-- Since Yieldsmith uses Telegram authentication (no traditional Supabase auth),
-- the application layer (Node.js bot) is responsible for setting the request context.
--
-- When the bot receives a request from Telegram user 123456789:
-- 1. Bot creates a JWT with custom claim: { user_id: 123456789 }
-- 2. Bot sends request to Supabase with this JWT
-- 3. RLS policies check: current_setting('request.jwt.claims')::jsonb->>'user_id' = user_id::text
--
-- Alternatively, for simple app-level enforcement:
-- - Use (SELECT user_id FROM users WHERE is_active = TRUE LIMIT 1) in tests
-- - App layer validates user_id before querying
-- - RLS provides defense-in-depth, not primary enforcement

-- =====================================================================
-- Step 1: Create helper function to get current user's Telegram ID
-- =====================================================================
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS BIGINT AS $$
DECLARE
  current_user_id BIGINT;
BEGIN
  -- Try to get user_id from JWT claims (primary method)
  current_user_id := (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::BIGINT;

  IF current_user_id IS NULL THEN
    -- Fallback: app-set variable for local development and manual SQL queries ONLY.
    -- NEVER rely on this in production — it is bypassable by anyone who can run SQL.
    -- In production all requests must carry a valid JWT with the user_id claim.
    current_user_id := current_setting('app.current_user_id', true)::BIGINT;
  END IF;

  RETURN current_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_current_user_id() IS
'Returns the current Telegram user ID from JWT claims or app context. Used by RLS policies.';


-- =====================================================================
-- Step 2: Enable RLS on all tables
-- =====================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividend_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_criteria ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- Step 3: Create RLS Policies
-- =====================================================================

-- ===== USERS Table =====
-- Only the user themselves can view their own record
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

-- Note: DELETE is intentionally not allowed - soft-delete via is_active = FALSE


-- ===== PORTFOLIOS Table =====
-- Users can only see/manage their own portfolio
CREATE POLICY portfolios_select_own ON portfolios
  FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY portfolios_insert_own ON portfolios
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY portfolios_update_own ON portfolios
  FOR UPDATE
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY portfolios_delete_own ON portfolios
  FOR DELETE
  USING (user_id = get_current_user_id());


-- ===== PRICE_HISTORY Table =====
-- Read-only: All users can view all price data (it's market data, not personal)
-- No write access from users (bot updates via service role)
CREATE POLICY price_history_select_all ON price_history
  FOR SELECT
  USING (true);

-- Bot (service role) will insert price data directly, bypassing RLS


-- ===== DIVIDEND_HISTORY Table =====
-- Read-only: All users can view all dividend data (it's market data)
-- No write access from users (bot updates via service role)
CREATE POLICY dividend_history_select_all ON dividend_history
  FOR SELECT
  USING (true);


-- ===== ALERTS Table =====
-- Users can only see/manage their own alerts
CREATE POLICY alerts_select_own ON alerts
  FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY alerts_insert_own ON alerts
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY alerts_update_own ON alerts
  FOR UPDATE
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY alerts_delete_own ON alerts
  FOR DELETE
  USING (user_id = get_current_user_id());


-- ===== USER_SETTINGS Table =====
-- Users can only access their own settings
CREATE POLICY user_settings_select_own ON user_settings
  FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY user_settings_insert_own ON user_settings
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY user_settings_update_own ON user_settings
  FOR UPDATE
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());


-- ===== RECOMMENDATIONS Table =====
-- Users can only view/manage their own recommendations
CREATE POLICY recommendations_select_own ON recommendations
  FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY recommendations_insert_own ON recommendations
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY recommendations_update_own ON recommendations
  FOR UPDATE
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());


-- ===== RECOMMENDATION_CRITERIA Table =====
-- Users can view criteria for their own recommendations
-- Join through recommendations table ensures this
CREATE POLICY recommendation_criteria_select_own ON recommendation_criteria
  FOR SELECT
  USING (
    recommendation_id IN (
      SELECT id FROM recommendations WHERE user_id = get_current_user_id()
    )
  );

-- Note: criteria are typically updated by bot via service role, not users


-- =====================================================================
-- Step 4: Grant appropriate permissions
-- =====================================================================

-- Users can execute the helper function
-- Grant to authenticated only — anon must not be able to call this function,
-- as the app.current_user_id fallback would let unauthenticated callers
-- impersonate any user by setting that config variable.
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;


-- =====================================================================
-- Documentation & Setup Notes
-- =====================================================================

COMMENT ON POLICY users_select_own ON users IS
'Each user can only view their own record';

COMMENT ON POLICY portfolios_select_own ON portfolios IS
'Each user can only view/manage their own portfolio holdings';

COMMENT ON POLICY alerts_select_own ON alerts IS
'Each user can only view/manage their own alerts';

COMMENT ON POLICY recommendations_select_own ON recommendations IS
'Each user can only view recommendations made for them';

-- =====================================================================
-- Testing RLS Policies (Manual)
-- =====================================================================
--
-- To test RLS in Supabase Studio or via psql:
--
-- 1. Set the user context:
--    SELECT set_config('app.current_user_id', '123456789', false);
--
-- 2. Query should return only that user's data:
--    SELECT * FROM portfolios;  -- Only rows where user_id = 123456789
--
-- 3. Verify isolation works:
--    SELECT set_config('app.current_user_id', '999999999', false);
--    SELECT * FROM portfolios;  -- Should return empty (different user)
--
-- In production, JWT claims will be set automatically by Supabase on each request.
--
