/**
 * Criterion evaluator types
 * Criteria are individual tests that stocks must pass to get recommendations
 */

import { StockSymbol, MarketId, Score, Percentage, DateOnly } from "./common";

/**
 * Base criterion interface
 */
export interface ICriterion {
  name: string; // e.g., "yield", "pe_ratio"
  displayName: string; // e.g., "Dividend Yield"
  category: CriterionCategory;
  description: string;
  weight: Percentage; // how much this criterion affects the score
}

/**
 * Criterion category
 */
export type CriterionCategory =
  | "fundamental"
  | "technical"
  | "dividend"
  | "valuation"
  | "financial_health"
  | "growth"
  | "risk"
  | "sentiment";

/**
 * Criterion evaluation result
 */
export interface CriterionEvaluation {
  criterion_name: string;
  criterion_display_name: string;
  passed: boolean;
  score: Score;
  actual_value: number;
  threshold_min?: number;
  threshold_max?: number;
  explanation: string; // plain English
  metadata: CriterionMetadata;
}

/**
 * Criterion metadata (flexible, criterion-specific)
 */
export type CriterionMetadata = Record<string, unknown>;

/**
 * Dividend Yield Criterion
 */
export interface DividendYieldCriterion extends ICriterion {
  name: "yield";
  threshold_min: Percentage; // e.g., 2.5%
  threshold_max: Percentage; // e.g., 15.0%
  tax_adjusted: boolean; // account for Nigeria's 10% withholding
  growth_weight: number; // weight yield growth vs current yield
}

/**
 * PE Ratio Criterion
 */
export interface PERatioCriterion extends ICriterion {
  name: "pe_ratio";
  threshold_min: number;
  threshold_max: number;
  compare_to: "sector" | "market" | "historical" | "absolute";
}

/**
 * Price Criterion (technical analysis)
 */
export interface PriceCriterion extends ICriterion {
  name: "price";
  checks: {
    above_50d_ma: boolean;
    above_200d_ma: boolean;
    trend: "uptrend" | "downtrend" | "sideways" | "any";
    rsi_threshold: number;
  };
}

/**
 * Earnings Growth Criterion
 */
export interface EarningsGrowthCriterion extends ICriterion {
  name: "earnings_growth";
  threshold_min: Percentage;
  consistency_required: number; // quarters in a row
  trend: "accelerating" | "stable" | "any";
}

/**
 * Payout Ratio Criterion
 */
export interface PayoutRatioCriterion extends ICriterion {
  name: "payout_ratio";
  threshold_min: Percentage;
  threshold_max: Percentage;
  check_sustainability: boolean;
}

/**
 * Dividend Coverage Criterion
 */
export interface DividendCoverageCriterion extends ICriterion {
  name: "dividend_coverage";
  min_coverage_ratio: number;
  ensure_sustainable: boolean;
}

/**
 * Debt to Equity Criterion
 */
export interface DebtToEquityCriterion extends ICriterion {
  name: "debt_to_equity";
  threshold_max: number;
  compare_to: "sector" | "market" | "historical" | "absolute";
}

/**
 * Liquidity Criterion
 */
export interface LiquidityCriterion extends ICriterion {
  name: "liquidity";
  min_volume: number; // minimum daily volume
  min_market_cap: number;
  max_bid_ask_spread: Percentage;
}

/**
 * Price Target Criterion
 */
export interface PriceTargetCriterion extends ICriterion {
  name: "price_target";
  upside_min: Percentage; // min expected upside
  downside_max: Percentage; // max allowed downside
}

/**
 * Book Value Criterion
 */
export interface BookValueCriterion extends ICriterion {
  name: "book_value";
  max_price_to_book: number;
  compare_to: "sector" | "historical" | "absolute";
}

/**
 * Return on Equity Criterion
 */
export interface ROECriterion extends ICriterion {
  name: "roe";
  threshold_min: Percentage;
  compare_to: "sector" | "market" | "historical" | "absolute";
}

/**
 * Dividend Growth Criterion
 */
export interface DividendGrowthCriterion extends ICriterion {
  name: "dividend_growth";
  min_cagr: Percentage;
  period_years: number;
  consecutive_increases_required: number;
}

/**
 * Beta/Volatility Criterion
 */
export interface VolatilityCriterion extends ICriterion {
  name: "volatility";
  max_beta: number;
  max_std_dev: Percentage;
}

/**
 * Sector Concentration Criterion
 */
export interface SectorConcentrationCriterion extends ICriterion {
  name: "sector_concentration";
  max_sector_weight: Percentage;
  excluded_sectors: string[];
}

/**
 * Quality Score Criterion
 */
export interface QualityScoreCriterion extends ICriterion {
  name: "quality_score";
  min_score: Score;
  components: {
    profitability: Percentage;
    growth: Percentage;
    financial_health: Percentage;
    valuation: Percentage;
  };
}

/**
 * Criterion evaluation context (what data is available)
 */
export interface CriterionContext {
  symbol: StockSymbol;
  market_id: MarketId;
  current_price: number;
  as_of_date: DateOnly;
  stock_data: {
    financials?: unknown;
    technicals?: unknown;
    sentiment?: unknown;
    dividends?: unknown;
  };
}

/**
 * Criterion evaluator (the service that evaluates a criterion)
 */
export interface ICriterionEvaluator {
  evaluate(
    symbol: StockSymbol,
    market_id: MarketId,
    context: CriterionContext
  ): Promise<CriterionEvaluation>;
  getMetadata(symbol: StockSymbol, market_id: MarketId): Promise<CriterionMetadata>;
}

/**
 * All available criteria
 */
export type AllCriteria =
  | DividendYieldCriterion
  | PERatioCriterion
  | PriceCriterion
  | EarningsGrowthCriterion
  | PayoutRatioCriterion
  | DividendCoverageCriterion
  | DebtToEquityCriterion
  | LiquidityCriterion
  | PriceTargetCriterion
  | BookValueCriterion
  | ROECriterion
  | DividendGrowthCriterion
  | VolatilityCriterion
  | SectorConcentrationCriterion
  | QualityScoreCriterion;

/**
 * Criteria configuration (from config files)
 */
export interface CriteriaConfig {
  criteria: AllCriteria[];
  global_settings: {
    default_weight: Percentage;
    min_passing_score: Score;
  };
}
