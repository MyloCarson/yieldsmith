-- Migration: Enable RLS on rate_limit_events table
-- Description: Users can only view their own rate limit events
-- Created: 2026-05-07
--
-- Note: allowlist table was removed — access control is now handled via
-- users.access_status (pending | approved | rejected | suspended).
-- See 008_create_users_table.sql for the access control flow.

-- ===== RATE_LIMIT_EVENTS Table =====
-- Users can view their own rate limit events.
-- INSERT is handled by the bot via service_role — not user-initiated.
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_limit_events_select_own ON rate_limit_events
  FOR SELECT
  USING (user_id = get_current_user_id());

-- =====================================================================
-- Admin Queries (run via service_role or direct SQL)
-- =====================================================================
--
-- View recent rejections:
--   SELECT user_id, count(*) AS rejected_count
--   FROM rate_limit_events
--   WHERE event_type = 'rejected' AND created_at > NOW() - INTERVAL '1 hour'
--   GROUP BY user_id ORDER BY rejected_count DESC;
--
-- Approve a user (now on users table):
--   UPDATE users
--   SET access_status = 'approved', approved_at = NOW(), approved_by = 'seun'
--   WHERE user_id = 123456789;
--
-- View pending beta requests:
--   SELECT user_id, telegram_username, first_name, created_at
--   FROM users WHERE access_status = 'pending'
--   ORDER BY created_at;
