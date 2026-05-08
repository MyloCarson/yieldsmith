/**
 * Value Dividend Strategy
 * Combines value investing principles with dividend yield requirements
 *
 * Focus:
 * - Undervalued stocks (P/E < market average, low P/B ratio)
 * - Decent dividend yield (4% minimum, 6% target)
 * - Strong fundamentals (solid earnings, manageable debt)
 * - Margin of safety (buying at discount to intrinsic value)
 *
 * Target investor: Value-conscious dividend investors seeking margin of safety
 * Holding period: 2-3 years (potential for capital appreciation)
 */

import { EvaluationContext, StrategyEvaluation, StrategyType } from "@core/strategy";
import { CriterionEvaluation } from "@core/criterion";
import { StrategyError } from "@core/errors";
import { Score } from "@/types/common";
import { PERatioCriterion } from "../criteria/pe-ratio-criterion";
import { BookValueCriterion } from "../criteria/book-value-criterion";
import { DividendYieldCriterion } from "../criteria/dividend-yield-criterion";
import { DebtToEquityCriterion } from "../criteria/debt-to-equity-criterion";
import { DividendCoverageCriterion } from "../criteria/dividend-coverage-criterion";
import { EarningsGrowthCriterion } from "../criteria/earnings-growth-criterion";
import { BaseStrategy } from "./base-strategy";

/**
 * Value Dividend Strategy Implementation
 */
export class ValueDividendStrategy extends BaseStrategy {
  readonly id: StrategyType = "value_dividend";
  readonly name = "Value Dividend Strategy";
  readonly description =
    "Combines value investing principles with dividend requirements to find undervalued dividend payers with margin of safety";
  readonly recommendedHoldingPeriod = 1095; // 3 years in days

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.addCriterion(new PERatioCriterion(), 0.2 as Score);
    this.addCriterion(new BookValueCriterion(), 0.2 as Score);
    this.addCriterion(new DividendYieldCriterion(), 0.2 as Score);
    this.addCriterion(new DebtToEquityCriterion(), 0.15 as Score);
    this.addCriterion(new DividendCoverageCriterion(), 0.15 as Score);
    this.addCriterion(new EarningsGrowthCriterion(), 0.1 as Score);
    await super.initialize();
  }

  /**
   * Evaluate stock for value dividend suitability
   */
  async evaluate(context: EvaluationContext): Promise<StrategyEvaluation> {
    if (!this.initialized) {
      throw new StrategyError(this.id, "Strategy not initialized. Call initialize() first.");
    }

    const symbol = context.symbol;

    // Evaluate against all criteria
    const evaluations: CriterionEvaluation[] = [];
    for (const { criterion } of this.criteria.values()) {
      try {
        const evaluation = await criterion.evaluate(context);
        evaluations.push(evaluation);
      } catch (_error) {
        console.warn(`Criterion ${criterion.name} failed for ${symbol}`);
      }
    }

    // Calculate composite score
    const score = this.calculateWeightedScore(evaluations);
    const passed = this.isPassingScore(score);

    const explanation = this.buildRecommendationExplanation(symbol, evaluations, score, passed);

    return {
      strategyId: this.id,
      symbol,
      passed,
      score,
      confidenceLevel: this.calculateConfidence(evaluations),
      explanation,
      criteriaResults: evaluations,
      recommendedAction: passed ? "BUY" : "SKIP",
      riskLevel: this.assessRiskLevel(evaluations),
      metadata: {
        evaluatedAt: new Date(),
        criteriaCount: this.criteria.size,
        passingCriteria: evaluations.filter((e) => e.passed).length,
        focusMetrics: ["pe_ratio", "book_value", "dividend_yield"],
      },
    };
  }

  /**
   * Calculate confidence from evaluation consensus
   */
  private calculateConfidence(evaluations: CriterionEvaluation[]): "high" | "medium" | "low" {
    if (evaluations.length === 0) return "low";

    // Both valuation and dividend metrics must pass for high confidence
    const valuationCriteria = evaluations.filter((e) =>
      ["pe_ratio", "book_value"].includes(e.criterionName)
    );
    const allValuationPass =
      valuationCriteria.length > 0 && valuationCriteria.every((e) => e.passed);
    const dividendEval = evaluations.find((e) => e.criterionName === "dividend_yield");

    if (!allValuationPass || !dividendEval?.passed) return "low";

    const passedCount = evaluations.filter((e) => e.passed).length;
    const passRate = passedCount / evaluations.length;

    if (passRate >= 0.8) return "high";
    if (passRate >= 0.6) return "medium";
    return "low";
  }

  /**
   * Assess risk level from criterion evaluations
   */
  private assessRiskLevel(evaluations: CriterionEvaluation[]): "low" | "medium" | "high" {
    // If not undervalued, higher risk (missed margin of safety)
    const valuationEval = evaluations.find((e) =>
      ["pe_ratio", "book_value"].includes(e.criterionName)
    );
    if (valuationEval && !valuationEval.passed) return "high";

    const fundamentalCriteria = evaluations.filter((e) =>
      ["debt_to_equity", "dividend_coverage", "earnings_growth"].includes(e.criterionName)
    );

    if (fundamentalCriteria.length === 0) return "medium";
    const failedCount = fundamentalCriteria.filter((e) => !e.passed).length;
    if (failedCount >= fundamentalCriteria.length * 0.5) return "high";
    if (failedCount > 0) return "medium";
    return "low";
  }
}

/**
 * Factory function for ValueDividendStrategy
 */
export function createValueDividendStrategy(): ValueDividendStrategy {
  return new ValueDividendStrategy();
}
