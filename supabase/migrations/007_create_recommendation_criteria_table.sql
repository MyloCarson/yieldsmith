-- Migration: Create recommendation_criteria table
-- Description: Stores individual criterion evaluations for each recommendation
-- Created: 2026-05-07

CREATE TABLE recommendation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,

  -- Criterion Details
  criterion_name VARCHAR(100) NOT NULL,
  criterion_display_name VARCHAR(100),

  -- Values
  actual_value DECIMAL(15, 4) NOT NULL,
  threshold_min DECIMAL(15, 4),
  threshold_max DECIMAL(15, 4),

  -- Evaluation
  passed BOOLEAN NOT NULL,
  score DECIMAL(4, 2) NOT NULL,
  explanation TEXT NOT NULL,

  -- Rich Metadata
  criterion_metadata JSONB,

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT recommendation_criteria_score_valid CHECK (score >= 0 AND score <= 1.0)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_criteria_recommendation_id ON recommendation_criteria(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_criteria_criterion_name ON recommendation_criteria(criterion_name);
CREATE INDEX IF NOT EXISTS idx_recommendation_criteria_passed ON recommendation_criteria(passed);

CREATE INDEX IF NOT EXISTS idx_recommendation_criteria_failed ON recommendation_criteria(recommendation_id, passed)
  WHERE passed = FALSE;

COMMENT ON TABLE recommendation_criteria IS 'Individual criterion evaluations for each recommendation (yield, PE, price, earnings, etc.)';
COMMENT ON COLUMN recommendation_criteria.recommendation_id IS 'Foreign key to recommendations table — cascades on delete';
COMMENT ON COLUMN recommendation_criteria.criterion_name IS 'Internal name: yield, pe_ratio, price, earnings_growth, payout_ratio, dividend_coverage, debt_to_equity';
COMMENT ON COLUMN recommendation_criteria.criterion_display_name IS 'User-friendly name (Dividend Yield, P/E Ratio, etc.)';
COMMENT ON COLUMN recommendation_criteria.actual_value IS 'The actual value found in market data';
COMMENT ON COLUMN recommendation_criteria.threshold_min IS 'Minimum acceptable value for this criterion';
COMMENT ON COLUMN recommendation_criteria.threshold_max IS 'Maximum acceptable value for this criterion';
COMMENT ON COLUMN recommendation_criteria.score IS 'Score 0.0–1.0: how well does actual_value match the threshold range?';
COMMENT ON COLUMN recommendation_criteria.explanation IS 'Plain English: why it passed/failed and by how much';
COMMENT ON COLUMN recommendation_criteria.criterion_metadata IS 'JSON with criterion-specific details (historical avg, peer comparison, etc.)';

---
-- Example criterion_metadata structures:
--
-- Yield:
-- { "gross_yield": 0.042, "net_yield": 0.038, "tax_rate": 10.0,
--   "historical_avg": 0.040, "market_avg": 0.030 }
--
-- PE Ratio:
-- { "current_pe": 8.5, "sector_avg_pe": 10.2, "market_avg_pe": 12.0,
--   "pe_5y_range": [7.5, 14.2], "valuation": "undervalued" }
--
-- Price:
-- { "current": 120.50, "50d_ma": 118.00, "200d_ma": 115.00,
--   "52w_high": 135.00, "52w_low": 95.00, "trend": "upward" }
--
-- Earnings Growth:
-- { "quarters": [{"quarter": "Q1-2026", "eps": 3.45}, {"quarter": "Q4-2025", "eps": 3.20}],
--   "growth_rate": 0.113, "trend": "accelerating" }
--
-- Payout Ratio:
-- { "current_ratio": 0.72, "safe_range": [0.30, 0.70],
--   "risk": "slightly_high", "sustainability": "at_risk" }
--
-- Dividend Coverage:
-- { "earnings_per_share": 3.45, "dividend_per_share": 2.50,
--   "coverage_ratio": 1.38, "safe_range": [1.2, 3.0], "adequacy": "adequate" }
--
-- Debt to Equity:
-- { "current_ratio": 0.45, "sector_avg": 0.55,
--   "risk_level": "low", "trend": "decreasing" }
