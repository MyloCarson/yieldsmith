/**
 * Portfolio and holding types
 */

import { TelegramUserId, UUID, StockSymbol, MarketId, DateOnly, Percentage } from "./common";

/**
 * Individual purchase lot (one row per buy transaction)
 */
export interface PortfolioLot {
  id: UUID;
  user_id: TelegramUserId;
  symbol: StockSymbol;
  market_id: MarketId;
  quantity: number;
  purchase_price: number;
  purchase_date: DateOnly;
  notes?: string;
  created_at: Date;
}

/**
 * Portfolio holding (a single stock position)
 */
export interface PortfolioHolding {
  id: UUID;
  user_id: TelegramUserId;
  symbol: StockSymbol;
  market_id: MarketId;
  quantity: number;
  purchase_price: number; // per share
  purchase_date: DateOnly;
  current_price?: number; // per share
  total_invested: number; // GENERATED: quantity * purchase_price
  current_value: number; // GENERATED: quantity * current_price
  unrealized_gain: number; // GENERATED: current_value - total_invested
  unrealized_gain_percent: Percentage; // GENERATED: (unrealized_gain / total_invested) * 100
  dividend_paid: number; // accumulated dividends
  notes?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Portfolio holdings summary
 */
export interface PortfolioSummary {
  user_id: TelegramUserId;
  total_invested: number;
  current_value: number;
  unrealized_gain: number;
  unrealized_gain_percent: Percentage;
  total_dividends_received: number;
  number_of_holdings: number;
  last_updated: Date;
}

/**
 * Create portfolio holding input
 */
export interface CreateHoldingInput {
  symbol: StockSymbol;
  market_id: MarketId;
  quantity: number;
  purchase_price: number;
  purchase_date: DateOnly;
  notes?: string;
}

/**
 * Update portfolio holding input
 */
export interface UpdateHoldingInput {
  quantity?: number;
  purchase_price?: number;
  purchase_date?: DateOnly;
  current_price?: number;
  notes?: string;
  is_active?: boolean;
}

/**
 * Portfolio performance metrics
 */
export interface PortfolioMetrics {
  user_id: TelegramUserId;
  totalReturn: Percentage;
  annualizedReturn: Percentage;
  volatility: Percentage;
  sharpeRatio: number;
  maximumDrawdown: Percentage;
  concentration: {
    topHolding: Percentage;
    topThree: Percentage;
    topFive: Percentage;
  };
  diversification: {
    numberSectors: number;
    numberOfStocks: number;
    sectorDistribution: Record<string, Percentage>;
  };
  riskProfile: "conservative" | "moderate" | "aggressive";
}

/**
 * Sector information
 */
export interface Sector {
  name: string;
  code: string;
  description?: string;
}

/**
 * Portfolio allocation by sector
 */
export interface SectorAllocation {
  sector: Sector;
  value: number;
  percentage: Percentage;
  numberOfHoldings: number;
}

/**
 * Rebalancing suggestion
 */
export interface RebalancingSuggestion {
  portfolio_id: UUID;
  suggestion_type: "sell" | "buy" | "sell_and_buy";
  symbol: StockSymbol;
  current_allocation: Percentage;
  target_allocation: Percentage;
  reason: string;
  confidence: "high" | "medium" | "low";
  generated_at: Date;
}

/**
 * Portfolio comparison (benchmark or target)
 */
export interface PortfolioComparison {
  portfolio_metrics: PortfolioMetrics;
  benchmark_metrics: PortfolioMetrics;
  outperformance: Percentage;
  consistency: number; // 0-1, how often portfolio outperforms
}

/**
 * Asset allocation
 */
export interface AssetAllocation {
  symbol: StockSymbol;
  value: number;
  percentage: Percentage;
  weight: number; // actual weight in portfolio
}
