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
import { CriterionContext, CriterionEvaluation } from "@core/criterion";
import { StrategyError } from "@core/errors";
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

  /**
   * Evaluate stock for value dividend suitability
   */
  async evaluate(context: EvaluationContext): Promise<StrategyEvaluation> {
    if (!this.initialized) {
      throw new StrategyError(this.id, "Strategy not initialized. Call initialize() first.");
    }

    const symbol = context.stockData?.symbol;
    if (!symbol) {
      throw new StrategyError(this.id, "Stock symbol required in context");
    }

    // Evaluate against all criteria
    const evaluations = [];
    for (const { criterion } of this.criteria.values()) {
      try {
        const evaluation = await criterion.evaluate(context as unknown as CriterionContext);
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
    const valuationEval = evaluations.find((e) =>
      ["pe_ratio", "book_value"].includes(e.criterionName)
    );
    const dividendEval = evaluations.find((e) => e.criterionName === "dividend_yield");

    if (!valuationEval?.passed || !dividendEval?.passed) return "low";

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
