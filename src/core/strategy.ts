/**
 * Strategy Interface
 * Abstract contract for all investment strategy implementations
 */

import { StockSymbol, MarketId, DateOnly, Score, ConfidenceLevel } from "@/types/common";
import { CriterionContext, CriterionEvaluation } from "./criterion";

/**
 * Strategy type identifier
 */
export type StrategyType = string;

/**
 * Context passed to strategy evaluation (superset of CriterionContext)
 */
export interface EvaluationContext extends CriterionContext {
  stockData?: CriterionContext["stockData"] & {
    symbol?: StockSymbol;
    [key: string]: unknown;
  };
}

/**
 * Result of a strategy evaluation
 */
export interface StrategyEvaluation {
  strategyId: string;
  symbol: string;
  passed: boolean;
  score: Score;
  confidenceLevel: ConfidenceLevel;
  explanation: string;
  criteriaResults: CriterionEvaluation[];
  recommendedAction: "BUY" | "HOLD" | "SELL" | "SKIP";
  riskLevel: "low" | "medium" | "high";
  metadata: {
    evaluatedAt: Date;
    criteriaCount: number;
    passingCriteria: number;
    [key: string]: unknown;
  };
}

/**
 * Strategy implementation contract
 */
export interface IStrategy {
  readonly id: StrategyType;
  readonly name: string;
  readonly description: string;
  readonly recommendedHoldingPeriod: number;

  evaluate(context: EvaluationContext): Promise<StrategyEvaluation>;
  initialize(): Promise<void>;
  isHealthy(): Promise<boolean>;
  getExplanation(): string;
}

/**
 * Strategy factory contract
 */
export interface IStrategyFactory {
  createStrategy(strategyType: StrategyType): Promise<IStrategy>;
  getAllRegistered(): StrategyType[];
  registerStrategy(type: StrategyType, constructor: new () => IStrategy): void;
  isRegistered(type: StrategyType): boolean;
}

// Re-export CriterionContext for convenience
export type { CriterionContext, DateOnly, MarketId };
