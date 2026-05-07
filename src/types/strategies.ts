/**
 * Investment strategy types
 */

import { JSONValue, Score, Percentage } from "./common";

/**
 * Investment strategy definition
 */
export interface InvestmentStrategy {
  id: string; // e.g., "yield-opportunity", "value-entry"
  name: string;
  description: string;
  goal: string;
  target_risk_level: "conservative" | "moderate" | "aggressive";
  criteria: CriteriaRequirement[];
  weighting: StrategyWeighting;
  filters: StrategyFilters;
  entry_rules: EntryRule[];
  exit_rules: ExitRule[];
  rebalancing_rules?: RebalancingRule[];
  performance_targets?: PerformanceTarget;
  recommended_portfolio_size: number;
  min_holding_period_days: number;
  notes?: string;
}

/**
 * Criteria requirement for a strategy
 */
export interface CriteriaRequirement {
  criterion_name: string;
  required: boolean; // must pass?
  weight: Percentage; // how much it affects the score
  threshold_min?: number;
  threshold_max?: number;
}

/**
 * Strategy weighting
 */
export interface StrategyWeighting {
  fundamental: Percentage;
  technical: Percentage;
  sentiment: Percentage;
  risk: Percentage;
  liquidity: Percentage;
}

/**
 * Strategy filters (exclude certain stocks)
 */
export interface StrategyFilters {
  excluded_sectors?: string[];
  excluded_symbols?: string[];
  min_market_cap?: number;
  min_liquidity?: number;
  min_trade_volume?: number;
  max_pe_ratio?: number;
  max_debt_to_equity?: number;
}

/**
 * Entry rule (when to buy)
 */
export interface EntryRule {
  rule_id: string;
  condition: string; // human readable
  logic: EntryLogic;
  priority: number; // 1-10
}

/**
 * Entry logic
 */
export interface EntryLogic {
  type: "criteria_based" | "technical" | "fundamental" | "sentiment" | "composite";
  details: JSONValue;
  min_score_required: Score;
}

/**
 * Exit rule (when to sell)
 */
export interface ExitRule {
  rule_id: string;
  condition: string; // human readable
  logic: ExitLogic;
  priority: number;
}

/**
 * Exit logic
 */
export interface ExitLogic {
  type: "stop_loss" | "take_profit" | "dividend_maturity" | "rebalance" | "composite";
  stop_loss_percent?: Percentage;
  take_profit_percent?: Percentage;
  hold_period_days?: number;
  details: JSONValue;
}

/**
 * Rebalancing rule
 */
export interface RebalancingRule {
  frequency: "monthly" | "quarterly" | "semi-annual" | "annual";
  tolerance: Percentage; // drift tolerance before rebalancing
  methodology: "equal_weight" | "risk_parity" | "market_cap" | "yield_weighted";
}

/**
 * Performance target for strategy
 */
export interface PerformanceTarget {
  annual_return: Percentage;
  max_drawdown: Percentage;
  target_yield: Percentage;
  target_growth: Percentage;
}

/**
 * Strategy performance
 */
export interface StrategyPerformance {
  strategy_id: string;
  start_date: string;
  total_recommendations: number;
  successful_count: number;
  success_rate: Percentage;
  average_return: Percentage;
  max_return: Percentage;
  min_return: Percentage;
  volatility: Percentage;
  sharpe_ratio: number;
  max_drawdown: Percentage;
}

/**
 * Strategy configuration (from config files)
 */
export interface StrategyConfig {
  strategies: InvestmentStrategy[];
  global_settings: {
    max_concentration: Percentage;
    min_diversification: number; // min number of stocks
    rebalance_frequency: string;
  };
}

/**
 * Backtesting results
 */
export interface BacktestResult {
  strategy_id: string;
  test_period: {
    start_date: string;
    end_date: string;
  };
  initial_capital: number;
  final_capital: number;
  total_return: Percentage;
  annual_return: Percentage;
  max_drawdown: Percentage;
  sharpe_ratio: number;
  sortino_ratio: number;
  win_rate: Percentage;
  profit_factor: number;
  trades: BacktestTrade[];
}

/**
 * Individual backtest trade
 */
export interface BacktestTrade {
  entry_date: string;
  entry_price: number;
  exit_date: string;
  exit_price: number;
  quantity: number;
  return_pct: Percentage;
  reason: string;
}

/**
 * Strategy recommendation result
 */
export interface StrategyRecommendation {
  strategy_id: string;
  strategy_name: string;
  symbol: string;
  recommendation_score: Score;
  criteria_met: number;
  criteria_total: number;
  key_reasons: string[];
  recommended_entry: number;
  target_price: number;
  stop_loss: number;
  confidence: "high" | "medium" | "low";
}
