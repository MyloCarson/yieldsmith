/**
 * Stock/instrument types
 */

import { StockSymbol, MarketId, Percentage, DateOnly } from "./common";

/**
 * Stock fundamental information
 */
export interface Stock {
  symbol: StockSymbol;
  market_id: MarketId;
  name: string;
  sector: string;
  sub_sector?: string;
  description?: string;
  website?: string;
  currency: string;
  is_active: boolean;
  listed_date?: DateOnly;
}

/**
 * Stock financial metrics
 */
export interface StockFinancials {
  symbol: StockSymbol;
  market_id: MarketId;
  pe_ratio?: number; // price-to-earnings
  eps?: number; // earnings per share
  market_cap?: number;
  book_value?: number;
  dividend_yield: Percentage;
  dividend_payout_ratio: Percentage;
  debt_to_equity: number;
  return_on_equity: Percentage;
  return_on_assets: Percentage;
  current_ratio: number; // liquidity
  quick_ratio: number;
  gross_margin: Percentage;
  operating_margin: Percentage;
  net_margin: Percentage;
  revenue_growth: Percentage;
  earnings_growth: Percentage;
  free_cash_flow?: number;
  as_of_date: DateOnly;
}

/**
 * Stock valuation status
 */
export interface StockValuation {
  symbol: StockSymbol;
  market_id: MarketId;
  current_price: number;
  fair_value: number;
  valuation_status: "undervalued" | "fairly_valued" | "overvalued";
  upside_downside: Percentage;
  confidence: "high" | "medium" | "low";
  methodology: string; // e.g., "DCF", "Comparable", "Asset-based"
  as_of_date: DateOnly;
}

/**
 * Stock rating/recommendation
 */
export interface StockRating {
  symbol: StockSymbol;
  market_id: MarketId;
  rating: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  target_price: number;
  upside_downside_to_target: Percentage;
  analyst_count: number;
  consensus_eps: number;
  consensus_revenue: number;
  as_of_date: DateOnly;
}

/**
 * Technical analysis levels
 */
export interface TechnicalLevels {
  symbol: StockSymbol;
  market_id: MarketId;
  resistance_1: number;
  resistance_2?: number;
  support_1: number;
  support_2?: number;
  pivot_point: number;
  trend: "uptrend" | "downtrend" | "sideways";
  strength: "strong" | "moderate" | "weak";
  as_of_date: DateOnly;
}

/**
 * Stock comparison
 */
export interface StockComparison {
  symbol: StockSymbol;
  peers: Stock[];
  metrics: {
    pe_ratio: number;
    peer_avg_pe: number;
    dividend_yield: Percentage;
    peer_avg_yield: Percentage;
    debt_to_equity: number;
    peer_avg_de: number;
  };
}

/**
 * Stock news item
 */
export interface StockNews {
  symbol: StockSymbol;
  market_id: MarketId;
  title: string;
  summary: string;
  source: string;
  url: string;
  published_at: Date;
  sentiment?: "positive" | "neutral" | "negative";
  impact?: "high" | "medium" | "low";
}

/**
 * Earnings announcement
 */
export interface EarningsAnnouncement {
  symbol: StockSymbol;
  market_id: MarketId;
  quarter: string; // e.g., "Q1-2026"
  announcement_date: DateOnly;
  earnings_date: DateOnly; // when results will be released
  eps_estimate?: number;
  eps_actual?: number;
  revenue_estimate?: number;
  revenue_actual?: number;
  surprise: Percentage; // actual vs estimate
}

/**
 * Stock splits
 */
export interface StockSplit {
  symbol: StockSymbol;
  market_id: MarketId;
  split_date: DateOnly;
  ratio: string; // e.g., "2:1" or "1:10"
  old_price: number;
  new_price: number;
  announcement_date?: DateOnly;
}

/**
 * Corporate actions
 */
export interface CorporateAction {
  symbol: StockSymbol;
  market_id: MarketId;
  action_type: "dividend" | "split" | "bonus" | "rights" | "merger" | "other";
  ex_date: DateOnly;
  record_date: DateOnly;
  payment_date: DateOnly;
  details: Record<string, unknown>;
}
