-- Migration: Create alerts table
-- Description: Stores user alerts and notifications
-- Created: 2026-05-07

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  symbol VARCHAR(20),
  market_id VARCHAR(50),

  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  alert_data JSONB,

  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  severity VARCHAR(20) DEFAULT 'info',

  notification_sent_at TIMESTAMPTZ,
  notification_provider VARCHAR(50),
  notification_message_id VARCHAR(255),
  send_attempts INTEGER DEFAULT 0,
  last_send_error TEXT,

  -- Dismissal derived from dismissed_at: NULL = not dismissed, non-NULL = dismissed
  dismissed_at TIMESTAMPTZ,
  action_taken BOOLEAN DEFAULT FALSE,
  action_description TEXT,

  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT alerts_title_not_empty CHECK (length(title) > 0),
  CONSTRAINT alerts_message_not_empty CHECK (length(message) > 0),
  CONSTRAINT alerts_status_valid CHECK (status IN ('pending', 'sent', 'dismissed', 'failed')),
  CONSTRAINT alerts_priority_valid CHECK (priority IN ('low', 'medium', 'high')),
  CONSTRAINT alerts_severity_valid CHECK (severity IN ('info', 'warning', 'critical')),
  CONSTRAINT alerts_notification_provider_valid CHECK (notification_provider IS NULL OR notification_provider IN ('telegram', 'slack', 'discord', 'email')),
  CONSTRAINT alerts_max_send_attempts CHECK (send_attempts <= 10)
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user_status ON alerts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol_market ON alerts(symbol, market_id);
CREATE INDEX IF NOT EXISTS idx_alerts_scheduled_for ON alerts(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_expires_at ON alerts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_pending ON alerts(user_id, created_at DESC) WHERE status = 'pending';

CREATE TRIGGER alerts_updated_at_trigger
BEFORE UPDATE ON alerts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE alerts IS 'User alerts and notifications from the bot';
COMMENT ON COLUMN alerts.user_id IS 'Telegram user ID';
COMMENT ON COLUMN alerts.alert_type IS 'Category: dividend_announcement, price_alert, rebalance_suggestion, etc.';
COMMENT ON COLUMN alerts.priority IS 'low | medium | high';
COMMENT ON COLUMN alerts.status IS 'pending | sent | dismissed | failed';
COMMENT ON COLUMN alerts.severity IS 'info | warning | critical';
COMMENT ON COLUMN alerts.alert_data IS 'Structured JSONB payload for rendering rich messages';
COMMENT ON COLUMN alerts.dismissed_at IS 'Timestamp when user dismissed the alert — NULL means not yet dismissed';
COMMENT ON COLUMN alerts.notification_sent_at IS 'When the alert was delivered to the user';
COMMENT ON COLUMN alerts.scheduled_for IS 'Future delivery time for scheduled alerts';
COMMENT ON COLUMN alerts.expires_at IS 'When this alert is no longer relevant';
