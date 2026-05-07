-- Migration: Create portfolios table
-- Description: Stores user portfolio holdings and metadata
-- Created: 2026-05-07

-- Shared updated_at trigger function (used by all tables in this schema)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  market_id VARCHAR(50) NOT NULL,
  quantity DECIMAL(15, 4) NOT NULL,
  purchase_price DECIMAL(15, 2) NOT NULL,
  purchase_date DATE NOT NULL,
  current_price DECIMAL(15, 2),
  total_invested DECIMAL(18, 2) GENERATED ALWAYS AS (quantity * purchase_price) STORED,
  current_value DECIMAL(18, 2) GENERATED ALWAYS AS (quantity * COALESCE(current_price, purchase_price)) STORED,
  unrealized_gain DECIMAL(18, 2) GENERATED ALWAYS AS (
    (quantity * COALESCE(current_price, purchase_price)) - (quantity * purchase_price)
  ) STORED,
  unrealized_gain_percent DECIMAL(10, 2) GENERATED ALWAYS AS (
    CASE
      WHEN quantity * purchase_price = 0 THEN 0
      ELSE (
        ((quantity * COALESCE(current_price, purchase_price)) - (quantity * purchase_price))
        / (quantity * purchase_price) * 100
      )
    END
  ) STORED,
  dividend_paid DECIMAL(18, 2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT portfolios_user_symbol_market_unique UNIQUE(user_id, symbol, market_id),
  CONSTRAINT portfolios_quantity_positive CHECK (quantity > 0),
  CONSTRAINT portfolios_purchase_price_positive CHECK (purchase_price > 0),
  CONSTRAINT portfolios_dividend_paid_non_negative CHECK (dividend_paid >= 0)
);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_market_id ON portfolios(market_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_symbol ON portfolios(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolios_active ON portfolios(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON portfolios(created_at DESC);

CREATE TRIGGER portfolios_updated_at_trigger
BEFORE UPDATE ON portfolios
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE portfolios IS 'User portfolio holdings across markets (NGX, US stocks, etc.)';
COMMENT ON COLUMN portfolios.user_id IS 'Telegram user ID (BIGINT, not Supabase auth UUID)';
COMMENT ON COLUMN portfolios.market_id IS 'Market identifier (e.g., "ngx", "us_stocks")';
COMMENT ON COLUMN portfolios.quantity IS 'Number of shares held';
COMMENT ON COLUMN portfolios.purchase_price IS 'Price per share at purchase time';
COMMENT ON COLUMN portfolios.purchase_date IS 'Date of purchase (no time component needed)';
COMMENT ON COLUMN portfolios.current_price IS 'Latest price (updated by data provider)';
COMMENT ON COLUMN portfolios.total_invested IS 'quantity × purchase_price';
COMMENT ON COLUMN portfolios.current_value IS 'quantity × current_price (falls back to purchase_price when null)';
COMMENT ON COLUMN portfolios.unrealized_gain IS 'current_value - total_invested';
COMMENT ON COLUMN portfolios.unrealized_gain_percent IS 'unrealized_gain / total_invested × 100';
COMMENT ON COLUMN portfolios.dividend_paid IS 'Total dividends received so far (accumulated)';
