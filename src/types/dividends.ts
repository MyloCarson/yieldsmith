/**
 * Dividend types
 */

import { StockSymbol, MarketId, DateOnly, UUID, Percentage } from "./common";

/**
 * Dividend announcement
 */
export interface DividendAnnouncement {
  id: UUID;
  symbol: StockSymbol;
  market_id: MarketId;
  announcement_date: DateOnly;
  dividend_per_share: number;
  dividend_type: DividendType;
  frequency: DividendFrequency;
  ex_dividend_date: DateOnly;
  record_date: DateOnly;
  payment_date: DateOnly;
  tax_rate: number; // percentage withholding tax
  gross_dividend_per_share: number;
  net_dividend_per_share: number; // GENERATED: after tax
  is_projected: boolean;
  is_confirmed: boolean;
  announcement_text?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Dividend type
 */
export type DividendType = "regular" | "special" | "interim" | "final" | "bonus" | "rights";

/**
 * Dividend frequency
 */
export type DividendFrequency = "annual" | "semi-annual" | "quarterly" | "monthly";

/**
 * Dividend history for a holding
 */
export interface DividendHistory {
  symbol: StockSymbol;
  market_id: MarketId;
  dividends: DividendAnnouncement[];
  total_received: number;
  expected_annual: number;
  next_payment?: DividendAnnouncement;
  last_payment?: DividendAnnouncement;
}

/**
 * Dividend projection (forecast)
 */
export interface DividendProjection {
  symbol: StockSymbol;
  market_id: MarketId;
  projected_annual_dividend: number;
  projected_yield: Percentage;
  confidence: "high" | "medium" | "low";
  methodology: string;
  next_ex_date?: DateOnly;
  next_payment_date?: DateOnly;
  as_of_date: DateOnly;
}

/**
 * Dividend yield information
 */
export interface DividendYield {
  symbol: StockSymbol;
  market_id: MarketId;
  current_price: number;
  annual_dividend: number;
  gross_yield: Percentage;
  net_yield: Percentage; // tax-adjusted (10% Nigeria withholding)
  tax_rate: number;
  yield_trend: "increasing" | "stable" | "decreasing";
  historical_yields: Array<{
    year: number;
    yield: Percentage;
    dividend_per_share: number;
  }>;
  as_of_date: DateOnly;
}

/**
 * Dividend growth analysis
 */
export interface DividendGrowth {
  symbol: StockSymbol;
  market_id: MarketId;
  cagr: Percentage; // compound annual growth rate
  years: number;
  consecutive_increases: number;
  consecutive_decreases: number;
  growth_trend: "strong" | "moderate" | "weak" | "declining";
  growth_consistency: number; // 0-1
  as_of_date: DateOnly;
}

/**
 * Dividend coverage analysis
 */
export interface DividendCoverage {
  symbol: StockSymbol;
  market_id: MarketId;
  earnings_per_share: number;
  dividend_per_share: number;
  payout_ratio: Percentage; // dividend / earnings
  coverage_ratio: number; // earnings / dividend
  is_sustainable: boolean;
  safety: "safe" | "moderate" | "risky";
  as_of_date: DateOnly;
}

/**
 * Tax impact of dividends
 */
export interface DividendTaxImpact {
  symbol: StockSymbol;
  market_id: MarketId;
  gross_dividend: number;
  withholding_tax: number;
  withholding_tax_rate: number; // percentage
  net_dividend: number;
  personal_tax_liability?: number; // if applicable
  effective_tax_rate: Percentage;
  tax_jurisdiction: string; // "Nigeria", "US", etc.
  as_of_date: DateOnly;
}

/**
 * Projected income from dividends
 */
export interface ProjectedDividendIncome {
  symbol: StockSymbol;
  quantity: number;
  current_annual_dividend: number;
  projected_annual_dividend: number;
  expected_payment_dates: DateOnly[];
  total_expected_per_year: number;
  total_expected_net_per_year: number;
}

/**
 * Dividend reinvestment calculation
 */
export interface DividendReinvestment {
  symbol: StockSymbol;
  market_id: MarketId;
  current_shares: number;
  annual_dividend_per_share: number;
  current_price: number;
  shares_acquired_per_dividend: number;
  annual_reinvestment_gain: number; // additional shares
  compounded_return_5y: number;
  compounded_return_10y: number;
}
