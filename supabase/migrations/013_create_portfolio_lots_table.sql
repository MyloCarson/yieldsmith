-- Migration: Create portfolio_lots table
-- Description: Stores individual purchase lots per holding.
--   portfolios = aggregate view (one row per symbol, weighted average cost)
--   portfolio_lots = full purchase history (one row per buy transaction)
-- Created: 2026-05-08

CREATE TABLE portfolio_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  market_id VARCHAR(50) NOT NULL,
  quantity DECIMAL(15, 4) NOT NULL,
  purchase_price DECIMAL(15, 2) NOT NULL,
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT portfolio_lots_quantity_positive CHECK (quantity > 0),
  CONSTRAINT portfolio_lots_price_positive CHECK (purchase_price > 0)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_lots_user_id ON portfolio_lots(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_lots_user_symbol ON portfolio_lots(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_lots_created_at ON portfolio_lots(created_at DESC);

ALTER TABLE portfolio_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY portfolio_lots_select_own ON portfolio_lots
  FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY portfolio_lots_insert_own ON portfolio_lots
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY portfolio_lots_delete_own ON portfolio_lots
  FOR DELETE
  USING (user_id = get_current_user_id());

COMMENT ON TABLE portfolio_lots IS 'Individual purchase lots per holding. portfolios table stores the aggregated view.';
COMMENT ON COLUMN portfolio_lots.user_id IS 'Telegram user ID';
COMMENT ON COLUMN portfolio_lots.quantity IS 'Shares purchased in this lot';
COMMENT ON COLUMN portfolio_lots.purchase_price IS 'Price per share for this lot';
