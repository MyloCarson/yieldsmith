-- Migration: Create price_history table
-- Description: Stores historical OHLCV stock prices for charts and analysis
-- Created: 2026-05-07

CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  market_id VARCHAR(50) NOT NULL,
  open_price DECIMAL(15, 2),
  price DECIMAL(15, 2) NOT NULL,
  high_price DECIMAL(15, 2),
  low_price DECIMAL(15, 2),
  volume BIGINT,
  recorded_date DATE NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  data_source VARCHAR(50) DEFAULT 'ngx_pulse',
  is_valid BOOLEAN DEFAULT TRUE,

  CONSTRAINT price_history_symbol_market_date_unique UNIQUE(symbol, market_id, recorded_date),
  CONSTRAINT price_history_price_positive CHECK (price > 0)
);

CREATE INDEX IF NOT EXISTS idx_price_history_symbol_market ON price_history(symbol, market_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_date ON price_history(recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_market_id ON price_history(market_id);
CREATE INDEX IF NOT EXISTS idx_price_history_symbol_date ON price_history(symbol, recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_valid ON price_history(symbol, market_id, recorded_date DESC)
  WHERE is_valid = TRUE;

CREATE TRIGGER price_history_updated_at_trigger
BEFORE UPDATE ON price_history
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE price_history IS 'Historical OHLCV stock prices for technical analysis and charting';
COMMENT ON COLUMN price_history.symbol IS 'Stock ticker symbol';
COMMENT ON COLUMN price_history.market_id IS 'Market identifier (e.g., "ngx", "us_stocks")';
COMMENT ON COLUMN price_history.open_price IS 'Opening price for the trading day';
COMMENT ON COLUMN price_history.price IS 'Closing price for the trading day';
COMMENT ON COLUMN price_history.high_price IS 'Highest price during the trading day';
COMMENT ON COLUMN price_history.low_price IS 'Lowest price during the trading day';
COMMENT ON COLUMN price_history.volume IS 'Number of shares traded';
COMMENT ON COLUMN price_history.recorded_date IS 'Trading date (YYYY-MM-DD)';
COMMENT ON COLUMN price_history.data_source IS 'API provider that supplied the data';
COMMENT ON COLUMN price_history.is_valid IS 'FALSE to mark suspicious or corrected records';
