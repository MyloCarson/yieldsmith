/**
 * Criterion Interface
 * Abstract contract for all investment criterion implementations
 */

import { StockSymbol, MarketId, Score, DateOnly } from "@/types/common";

/**
 * Criterion category groupings
 */
export type CriterionCategory =
  | "dividend"
  | "valuation"
  | "technical"
  | "growth"
  | "risk"
  | "quality"
  | "portfolio";

/**
 * Stock data available during criterion evaluation
 */
export interface CriterionStockData {
  price: number;
  dividendYield?: number;
  peRatio?: number;
  eps?: number;
  revenue?: number;
  netIncome?: number;
  debtToEquity?: number;
  currentRatio?: number;
  bookValue?: number;
  roe?: number;
  marketCap?: number;
  sector?: string;
  name?: string;
}

/**
 * Financial statement data for criterion evaluation
 */
export interface CriterionFinancials {
  eps?: number;
  revenue?: number;
  netIncome?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  roe?: number;
  roa?: number;
  bookValue?: number;
  freeCashFlow?: number;
  interestCoverage?: number;
}

/**
 * Individual dividend record
 */
export interface CriterionDividend {
  dividend_per_share: number;
  payment_date?: DateOnly;
  ex_dividend_date?: DateOnly;
  dividend_type?: string;
}

/**
 * Technical indicator snapshot
 */
export interface CriterionTechnical {
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  ma20?: number;
  ma50?: number;
  ma200?: number;
  volume?: number;
  avgVolume?: number;
  atr?: number;
}

/**
 * Historical price data for trend analysis
 */
export interface CriterionHistorical {
  priceHistory?: Array<{ date: DateOnly; close: number; volume?: number }>;
}

/**
 * Portfolio context for concentration criteria
 */
export interface CriterionPortfolioContext {
  sectorAllocations: Record<string, number>;
  totalValue: number;
  numberOfHoldings: number;
}

/**
 * Full context passed to criterion evaluation
 */
export interface CriterionContext {
  symbol: StockSymbol;
  marketId: MarketId;
  asOfDate: DateOnly;
  stockData?: CriterionStockData;
  financials?: CriterionFinancials;
  dividends?: CriterionDividend[];
  technical?: CriterionTechnical;
  historical?: CriterionHistorical;
  withholdingTaxRate?: number;
  portfolioContext?: CriterionPortfolioContext;
}

/**
 * Criterion evaluation metadata
 */
export interface CriterionMetadata {
  category: CriterionCategory;
  evaluationType: string;
  hasHistoricalData: boolean;
  dataPoints: number;
  confidence: "high" | "medium" | "low";
}

/**
 * Criterion threshold definitions
 */
export interface CriterionThresholds {
  name: string;
  description: string;
  min?: number;
  max?: number;
  target?: number;
  unit?: string;
}

/**
 * Result of evaluating a criterion against stock data
 */
export interface CriterionEvaluation {
  criterionName: string;
  criterionDisplayName: string;
  symbol: StockSymbol;
  marketId: MarketId;
  asOfDate: DateOnly;
  passed: boolean;
  score: Score;
  actualValue: number;
  thresholdMin?: number;
  thresholdMax?: number;
  explanation: string;
  metadata: CriterionMetadata;
  confidence: Score;
}

/**
 * Criterion implementation contract
 */
export interface ICriterion {
  readonly name: string;
  readonly displayName: string;
  readonly category: CriterionCategory;
  readonly description: string;
  readonly weight: Score;

  validateContext(context: CriterionContext): void;
  evaluate(context: CriterionContext): Promise<CriterionEvaluation>;
  getMetadata(context: CriterionContext): CriterionMetadata;
  getThresholds(context?: CriterionContext): CriterionThresholds;
  getLogicExplanation(): string;
  initialize(): Promise<void>;
  isHealthy(): Promise<boolean>;
}

/**
 * Criterion factory contract
 */
export interface ICriterionFactory {
  createCriterion(criterionName: string): Promise<ICriterion>;
  getAllAvailable(): Promise<string[]>;
  registerCriterion(name: string, constructor: new () => ICriterion): void;
  isCriterionRegistered(name: string): boolean;
}
