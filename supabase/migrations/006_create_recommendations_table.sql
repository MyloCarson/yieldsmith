-- Migration: Create recommendations table
-- Description: Stores AI recommendations with full decision metadata
-- Created: 2026-05-07

CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  market_id VARCHAR(50) NOT NULL,
  strategy_id VARCHAR(100) NOT NULL,

  -- AI Provider
  ai_provider VARCHAR(50) NOT NULL,
  ai_model_version VARCHAR(100),

  -- The Recommendation
  recommended_amount DECIMAL(15, 2) NOT NULL,
  confidence VARCHAR(20) NOT NULL DEFAULT 'medium',
  recommendation_score DECIMAL(4, 2),

  -- Rich Metadata (strategy context, market context, criteria scores, etc.)
  recommendation_metadata JSONB NOT NULL,

  -- User Action
  user_acted BOOLEAN DEFAULT FALSE,
  user_action VARCHAR(50),
  action_timestamp TIMESTAMPTZ,
  action_notes TEXT,

  -- If User Invested
  actual_purchase_price DECIMAL(15, 2),
  actual_purchase_amount DECIMAL(15, 2),
  actual_purchase_symbol VARCHAR(20),
  purchase_date DATE,
  purchase_notes TEXT,

  -- Outcome Tracking (updated by bot via service role)
  current_price DECIMAL(15, 2),
  current_value DECIMAL(15, 2),
  gain_loss DECIMAL(18, 2),
  gain_loss_percent DECIMAL(10, 2),
  last_price_update TIMESTAMPTZ,

  -- Lifecycle
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT recommendations_recommended_amount_positive CHECK (recommended_amount > 0),
  CONSTRAINT recommendations_confidence_valid CHECK (confidence IN ('high', 'medium', 'low')),
  CONSTRAINT recommendations_score_valid CHECK (recommendation_score IS NULL OR (recommendation_score >= 0 AND recommendation_score <= 1.0)),
  CONSTRAINT recommendations_user_action_valid CHECK (user_action IS NULL OR user_action IN ('accepted', 'rejected', 'ignored', 'deferred')),
  CONSTRAINT recommendations_ai_provider_valid CHECK (ai_provider IN ('claude', 'gemini', 'openai'))
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_symbol_market ON recommendations(symbol, market_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_strategy_id ON recommendations(strategy_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_ai_provider ON recommendations(ai_provider);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_acted ON recommendations(user_acted);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id_acted ON recommendations(user_id, user_acted);

CREATE INDEX IF NOT EXISTS idx_recommendations_pending ON recommendations(user_id, created_at DESC)
  WHERE user_acted = FALSE AND is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_recommendations_invested ON recommendations(user_id, purchase_date DESC)
  WHERE purchase_date IS NOT NULL;

CREATE TRIGGER recommendations_updated_at_trigger
BEFORE UPDATE ON recommendations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE recommendations IS 'AI-generated stock recommendations with full decision metadata and outcome tracking';
COMMENT ON COLUMN recommendations.user_id IS 'Telegram user ID';
COMMENT ON COLUMN recommendations.strategy_id IS 'Investment strategy used (yield-opportunity, value-entry, etc.)';
COMMENT ON COLUMN recommendations.ai_provider IS 'claude | gemini | openai';
COMMENT ON COLUMN recommendations.confidence IS 'high | medium | low';
COMMENT ON COLUMN recommendations.recommendation_metadata IS 'Rich JSONB with strategy context, criteria scores, market data, reasoning';
COMMENT ON COLUMN recommendations.user_action IS 'accepted | rejected | ignored | deferred — NULL until user responds';
COMMENT ON COLUMN recommendations.purchase_date IS 'Date of purchase if user invested (no time component needed)';
COMMENT ON COLUMN recommendations.recommendation_score IS 'Aggregated score 0.0–1.0 based on criteria passed';
COMMENT ON COLUMN recommendations.gain_loss_percent IS 'Return if user invested: (current_value - purchase_amount) / purchase_amount × 100';
