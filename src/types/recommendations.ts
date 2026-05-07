/**
 * Recommendation and criteria types
 * Critical: Stores WHY the bot made each investment recommendation
 */

import {
  TelegramUserId,
  UUID,
  StockSymbol,
  MarketId,
  ConfidenceLevel,
  Score,
  DateOnly,
} from "./common";
import { CriterionMetadata } from "./criteria";

/**
 * AI recommendation for an investment
 */
export interface Recommendation {
  id: UUID;
  user_id: TelegramUserId;
  symbol: StockSymbol;
  market_id: MarketId;
  strategy_id: string; // e.g., "yield-opportunity", "value-entry"
  ai_provider: AIProvider;
  ai_model_version: string; // e.g., "claude-opus-4-6"
  recommended_amount: number; // how much to invest
  confidence: ConfidenceLevel;
  recommendation_score: Score; // 0.0-1.0
  recommendation_metadata: RecommendationMetadata; // WHY this recommendation
  user_acted: boolean; // did user accept/reject/invest?
  user_action?: UserAction;
  action_timestamp?: Date;
  action_notes?: string;
  actual_purchase_price?: number;
  actual_purchase_amount?: number;
  actual_purchase_symbol?: StockSymbol; // might differ from recommended
  purchase_date?: Date;
  purchase_notes?: string;
  current_price?: number;
  current_value?: number;
  gain_loss?: number;
  gain_loss_percent?: number;
  last_price_update?: Date;
  is_archived: boolean;
  archived_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * AI provider
 */
export type AIProvider = "claude" | "gemini" | "openai";

/**
 * User's action on recommendation
 */
export type UserAction = "accepted" | "rejected" | "ignored" | "deferred" | "invested";

/**
 * Complete metadata explaining WHY this recommendation was made
 */
export interface RecommendationMetadata {
  // Strategy context
  strategy: {
    name: string;
    description: string;
    goals: string[];
    parameters: Record<string, unknown>;
  };

  // Market context at time of recommendation
  market_context: {
    current_price: number;
    price_trend: "uptrend" | "downtrend" | "sideways";
    volatility: number;
    market_sentiment: "bullish" | "neutral" | "bearish";
    pe_ratio: number;
    sector_performance: string;
  };

  // Individual criteria scores
  criteria_scores: {
    [criterion: string]: {
      passed: boolean;
      score: Score;
      actual_value: number;
      threshold_min?: number;
      threshold_max?: number;
      explanation: string;
    };
  };

  // Historical data considered
  historical_data: {
    dividend_history: Array<{
      date: DateOnly;
      per_share: number;
      yield: number;
    }>;
    price_history_3m?: number;
    price_history_1y?: number;
    earnings_history?: Array<{
      period: string;
      eps: number;
      growth: number;
    }>;
  };

  // Risk assessment
  risk_assessment: {
    concentration_risk: "low" | "medium" | "high";
    sector_concentration: number;
    market_concentration: number;
    volatility_risk: number;
    liquidity_risk: "low" | "medium" | "high";
    dividend_sustainability: "strong" | "moderate" | "weak";
    key_risks: string[];
  };

  // Alternatives considered
  alternatives_considered: Array<{
    symbol: StockSymbol;
    reason_rejected: string;
    score_vs_recommended: number;
  }>;

  // AI reasoning
  ai_reasoning: {
    model: string;
    reasoning_process: string;
    confidence_factors: string[];
    concerns: string[];
  };

  // Recommendation timeline
  valid_until?: DateOnly;
  next_review_date?: DateOnly;
}

/**
 * Individual criterion evaluation
 */
export interface RecommendationCriterion {
  id: UUID;
  recommendation_id: UUID;
  criterion_name: string; // e.g., "yield", "pe_ratio", "price"
  criterion_display_name: string; // e.g., "Dividend Yield"
  actual_value: number;
  threshold_min?: number;
  threshold_max?: number;
  passed: boolean;
  score: Score;
  explanation: string; // "Yield 4.2% is above minimum 2.5%"
  criterion_metadata: CriterionMetadata;
  created_at: Date;
}

/**
 * Yield criterion details
 */
export interface YieldCriterionData extends CriterionMetadata {
  gross_yield: number;
  net_yield: number;
  tax_rate: number;
  historical_avg: number;
  market_avg: number;
  vs_stock_avg: string;
  vs_market_avg: string;
}

/**
 * PE ratio criterion details
 */
export interface PERatioCriterionData extends CriterionMetadata {
  current_pe: number;
  sector_avg_pe: number;
  market_avg_pe: number;
  pe_5y_range: [number, number];
  valuation: "undervalued" | "fairly_valued" | "overvalued";
  reason: string;
}

/**
 * Price criterion details
 */
export interface PriceCriterionData extends CriterionMetadata {
  current: number;
  ma_50d: number;
  ma_200d: number;
  high_52w: number;
  low_52w: number;
  from_50d_ma_pct: string;
  from_200d_ma_pct: string;
  from_52w_high_pct: string;
  from_52w_low_pct: string;
  trend: "upward" | "downward" | "sideways";
}

/**
 * Earnings growth criterion details
 */
export interface EarningsGrowthCriterionData extends CriterionMetadata {
  quarters: Array<{
    quarter: string;
    eps: number;
  }>;
  growth_rate: number;
  growth_rate_percent: string;
  trend: "accelerating" | "stable" | "decelerating";
}

/**
 * Create recommendation input
 */
export interface CreateRecommendationInput {
  symbol: StockSymbol;
  market_id: MarketId;
  strategy_id: string;
  ai_provider: AIProvider;
  recommended_amount: number;
  confidence: ConfidenceLevel;
  recommendation_metadata: RecommendationMetadata;
  criteria: CreateCriterionInput[];
}

/**
 * Create criterion input
 */
export interface CreateCriterionInput {
  criterion_name: string;
  criterion_display_name: string;
  actual_value: number;
  threshold_min?: number;
  threshold_max?: number;
  passed: boolean;
  score: Score;
  explanation: string;
  criterion_metadata?: CriterionMetadata;
}

/**
 * Recommendation response (for API)
 */
export interface RecommendationResponse {
  id: UUID;
  symbol: StockSymbol;
  recommended_amount: number;
  confidence: ConfidenceLevel;
  score: Score;
  reasoning_summary: string;
  criteria_passed: number;
  criteria_total: number;
  key_strengths: string[];
  key_concerns: string[];
  alternatives: Array<{
    symbol: StockSymbol;
    score: Score;
    reason: string;
  }>;
}

/**
 * Recommendation statistics
 */
export interface RecommendationStats {
  user_id: TelegramUserId;
  total_recommendations: number;
  accepted_count: number;
  rejected_count: number;
  invested_count: number;
  average_return_pct: number;
  winning_recommendations: number;
  accuracy_rate: number;
  most_recommended_symbol: StockSymbol;
  most_successful_strategy: string;
}
