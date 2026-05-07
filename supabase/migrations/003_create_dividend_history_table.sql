-- Migration: Create dividend_history table
-- Description: Tracks dividend payments and announcements
-- Created: 2026-05-07

CREATE TABLE dividend_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  market_id VARCHAR(50) NOT NULL,

  dividend_per_share DECIMAL(10, 4) NOT NULL,
  ex_dividend_date DATE,
  payment_date DATE NOT NULL,
  announcement_date DATE,
  record_date DATE,

  dividend_type VARCHAR(50) DEFAULT 'regular',
  frequency VARCHAR(20) DEFAULT 'annual',

  tax_rate DECIMAL(4, 2) DEFAULT 10.00,
  net_dividend_per_share DECIMAL(10, 4) GENERATED ALWAYS AS (
    dividend_per_share * (1 - tax_rate / 100)
  ) STORED,

  yield_on_announcement DECIMAL(6, 2),
  last_price_on_ex_date DECIMAL(15, 2),

  is_projected BOOLEAN DEFAULT FALSE,
  is_confirmed BOOLEAN DEFAULT TRUE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT dividend_history_natural_key UNIQUE(symbol, market_id, payment_date, dividend_type),
  CONSTRAINT dividend_history_per_share_positive CHECK (dividend_per_share > 0),
  CONSTRAINT dividend_history_tax_rate_valid CHECK (tax_rate >= 0 AND tax_rate <= 100),
  CONSTRAINT dividend_history_projected_confirmed CHECK (NOT (is_projected AND is_confirmed)),
  CONSTRAINT dividend_history_type_valid CHECK (dividend_type IN ('regular', 'special', 'interim', 'final')),
  CONSTRAINT dividend_history_frequency_valid CHECK (frequency IN ('annual', 'semi_annual', 'quarterly', 'monthly'))
);

CREATE INDEX IF NOT EXISTS idx_dividend_history_symbol_market ON dividend_history(symbol, market_id);
CREATE INDEX IF NOT EXISTS idx_dividend_history_payment_date ON dividend_history(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_dividend_history_ex_dividend_date ON dividend_history(ex_dividend_date DESC);
CREATE INDEX IF NOT EXISTS idx_dividend_history_market_id ON dividend_history(market_id);
CREATE INDEX IF NOT EXISTS idx_dividend_history_is_projected ON dividend_history(is_projected);
CREATE INDEX IF NOT EXISTS idx_dividend_history_symbol_payment_date ON dividend_history(symbol, payment_date DESC);

CREATE TRIGGER dividend_history_updated_at_trigger
BEFORE UPDATE ON dividend_history
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE dividend_history IS 'Historical and projected dividend payments for stocks';
COMMENT ON COLUMN dividend_history.symbol IS 'Stock ticker symbol';
COMMENT ON COLUMN dividend_history.market_id IS 'Market identifier (e.g., "ngx", "us_stocks")';
COMMENT ON COLUMN dividend_history.dividend_per_share IS 'Gross dividend per share (before withholding tax)';
COMMENT ON COLUMN dividend_history.net_dividend_per_share IS 'dividend_per_share × (1 - tax_rate / 100)';
COMMENT ON COLUMN dividend_history.tax_rate IS 'Withholding tax percentage (default 10% for Nigeria)';
COMMENT ON COLUMN dividend_history.is_projected IS 'TRUE for upcoming/announced but not yet paid dividends';
COMMENT ON COLUMN dividend_history.is_confirmed IS 'FALSE if pending official confirmation — mutually exclusive with is_projected=TRUE';
