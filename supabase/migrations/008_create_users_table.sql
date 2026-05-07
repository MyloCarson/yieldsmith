-- Migration: Create users table
-- Description: Stores Telegram user accounts, authentication metadata, and beta access control
-- Created: 2026-05-07
--
-- Access control flow:
--   1. User sends /start → bot upserts a users row with access_status = 'pending'
--   2. Bot checks access_status before processing any command
--   3. If 'pending' or 'rejected' → "You're on the waitlist"
--   4. If 'approved' → proceed normally
--   5. Admin approves via: UPDATE users SET access_status = 'approved', approved_at = NOW(), approved_by = 'seun' WHERE user_id = $1

CREATE TABLE users (
  user_id BIGINT PRIMARY KEY,
  telegram_username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),

  -- Beta Access Control
  access_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by VARCHAR(100),
  approval_reason TEXT,
  rejection_reason TEXT,

  -- Subscription & Account Status
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,

  -- Activity Tracking
  first_usage_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  total_messages_sent BIGINT DEFAULT 0,

  -- Admin Notes
  notes TEXT,

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT users_access_status_valid CHECK (access_status IN ('pending', 'approved', 'rejected', 'suspended')),
  CONSTRAINT users_approval_requires_approved_at CHECK (
    (access_status = 'approved' AND approved_at IS NOT NULL) OR access_status != 'approved'
  ),
  CONSTRAINT users_subscription_tier_valid CHECK (subscription_tier IN ('free', 'premium', 'trial')),
  CONSTRAINT users_email_format CHECK (email IS NULL OR email ~* '^[^@]+@[^@]+\.[^@]+$'),
  CONSTRAINT users_total_messages_non_negative CHECK (total_messages_sent >= 0)
);

CREATE TRIGGER users_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Note: no index on user_id — it is the PRIMARY KEY, index is automatic
CREATE INDEX IF NOT EXISTS idx_users_telegram_username ON users(telegram_username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_access_status ON users(access_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Partial indexes for common admin queries
CREATE INDEX IF NOT EXISTS idx_users_pending ON users(created_at DESC)
  WHERE access_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_users_active ON users(user_id)
  WHERE is_active = TRUE AND access_status = 'approved';

COMMENT ON TABLE users IS 'Telegram user accounts with beta access control';
COMMENT ON COLUMN users.user_id IS 'Telegram user ID (primary identifier, from Telegram)';
COMMENT ON COLUMN users.telegram_username IS 'Telegram @username (optional, may be NULL)';
COMMENT ON COLUMN users.access_status IS 'pending | approved | rejected | suspended — gate for beta access';
COMMENT ON COLUMN users.approved_at IS 'When admin approved this user';
COMMENT ON COLUMN users.approved_by IS 'Admin username who approved (e.g. "seun")';
COMMENT ON COLUMN users.subscription_tier IS 'free | premium | trial';
COMMENT ON COLUMN users.is_active IS 'FALSE to soft-delete user without losing data';
COMMENT ON COLUMN users.first_usage_at IS 'When user first successfully used the bot (after approval)';
COMMENT ON COLUMN users.last_active_at IS 'Timestamp of last bot interaction';
COMMENT ON COLUMN users.total_messages_sent IS 'Cumulative count of bot interactions for analytics';
