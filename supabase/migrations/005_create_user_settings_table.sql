-- Migration: Create user_settings table
-- Description: Stores user preferences and configuration
-- Created: 2026-05-07

CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL UNIQUE,

  full_name VARCHAR(255),
  email VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'Africa/Lagos',

  annual_dividend_goal DECIMAL(15, 2),
  monthly_investment_amount DECIMAL(15, 2),
  portfolio_value_target DECIMAL(18, 2),

  preferred_strategies JSONB DEFAULT '["yield-opportunity", "value-entry"]',
  risk_tolerance VARCHAR(20) DEFAULT 'medium',
  preferred_markets JSONB DEFAULT '["ngx"]',
  excluded_sectors JSONB,
  concentration_limit DECIMAL(4, 2) DEFAULT 30.0,

  notification_provider VARCHAR(50) DEFAULT 'telegram',
  notify_dividend_announcements BOOLEAN DEFAULT TRUE,
  notify_price_alerts BOOLEAN DEFAULT TRUE,
  notify_rebalancing BOOLEAN DEFAULT TRUE,
  notify_portfolio_updates BOOLEAN DEFAULT TRUE,
  alert_priority_min VARCHAR(20) DEFAULT 'medium',

  price_alert_percent DECIMAL(4, 2),
  dividend_yield_threshold DECIMAL(4, 2),

  show_tax_adjusted_yield BOOLEAN DEFAULT TRUE,
  currency_code VARCHAR(3) DEFAULT 'NGN',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  number_format VARCHAR(20) DEFAULT 'en-NG',

  use_ai_recommendations BOOLEAN DEFAULT TRUE,
  ai_provider VARCHAR(50) DEFAULT 'claude',

  verbose_mode BOOLEAN DEFAULT FALSE,
  demo_mode BOOLEAN DEFAULT FALSE,

  -- Privacy: opt-in only — defaults to FALSE so users must explicitly consent
  allow_data_collection BOOLEAN DEFAULT FALSE,
  allow_research_sharing BOOLEAN DEFAULT FALSE,
  last_portfolio_sync TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT user_settings_user_id_positive CHECK (user_id > 0),
  CONSTRAINT user_settings_annual_dividend_goal_positive CHECK (annual_dividend_goal IS NULL OR annual_dividend_goal > 0),
  CONSTRAINT user_settings_monthly_investment_positive CHECK (monthly_investment_amount IS NULL OR monthly_investment_amount > 0),
  CONSTRAINT user_settings_concentration_limit_valid CHECK (concentration_limit > 0 AND concentration_limit <= 100),
  CONSTRAINT user_settings_risk_tolerance_valid CHECK (risk_tolerance IN ('conservative', 'medium', 'aggressive')),
  CONSTRAINT user_settings_notification_provider_valid CHECK (notification_provider IN ('telegram', 'slack', 'discord', 'email')),
  CONSTRAINT user_settings_ai_provider_valid CHECK (ai_provider IN ('claude', 'gemini', 'openai')),
  CONSTRAINT user_settings_alert_priority_min_valid CHECK (alert_priority_min IN ('low', 'medium', 'high'))
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_created_at ON user_settings(created_at DESC);

CREATE TRIGGER user_settings_updated_at_trigger
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_settings IS 'User preferences, goals, and configuration for the bot';
COMMENT ON COLUMN user_settings.user_id IS 'Telegram user ID (unique per user)';
COMMENT ON COLUMN user_settings.annual_dividend_goal IS 'Target annual dividend income (e.g. 500000 = ₦500k)';
COMMENT ON COLUMN user_settings.monthly_investment_amount IS 'Planned monthly investment amount';
COMMENT ON COLUMN user_settings.portfolio_value_target IS 'Target total portfolio value (a goal, not current value)';
COMMENT ON COLUMN user_settings.preferred_strategies IS 'JSON array of strategy IDs the user wants enabled';
COMMENT ON COLUMN user_settings.risk_tolerance IS 'conservative | medium | aggressive';
COMMENT ON COLUMN user_settings.notification_provider IS 'telegram | slack | discord | email';
COMMENT ON COLUMN user_settings.concentration_limit IS 'Max % of portfolio allowed in a single stock';
COMMENT ON COLUMN user_settings.ai_provider IS 'claude | gemini | openai';
COMMENT ON COLUMN user_settings.show_tax_adjusted_yield IS 'Display yields after 10% withholding tax deduction';
COMMENT ON COLUMN user_settings.allow_data_collection IS 'Opt-in to anonymous usage data collection (default: off)';
COMMENT ON COLUMN user_settings.demo_mode IS 'When TRUE, recommendations ignore real portfolio data';
