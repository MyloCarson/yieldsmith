/**
 * Steady Dividend Strategy
 * Targets stable, blue-chip stocks with reliable high dividend yields
 *
 * Focus:
 * - High dividend yield (6% minimum, 8% target)
 * - Dividend stability (low variance in payout)
 * - Sustainability (payout ratio <60%, strong earnings)
 * - Liquidity (sufficient trading volume)
 *
 * Target investor: Income-focused investors seeking steady cash flow
 * Holding period: 2-3 years (active rebalancing)
 */

import { EvaluationContext, StrategyEvaluation, StrategyType } from "@core/strategy";
import { CriterionContext, CriterionEvaluation } from "@core/criterion";
import { StrategyError } from "@core/errors";
import { BaseStrategy } from "./base-strategy";

/**
 * Steady Dividend Strategy Implementation
 */
export class SteadyDividendStrategy extends BaseStrategy {
  readonly id: StrategyType = "steady_dividend";
  readonly name = "Steady Dividend Strategy";
  readonly description =
    "Focuses on stable blue-chip stocks with reliable, sustainable high dividend yields for consistent income";
  readonly recommendedHoldingPeriod = 1095; // 3 years in days

  /**
   * Evaluate stock for steady dividend suitability
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
        focusMetric: "dividend_yield",
      },
    };
  }

  /**
   * Calculate confidence from evaluation consensus
   */
  private calculateConfidence(evaluations: CriterionEvaluation[]): "high" | "medium" | "low" {
    if (evaluations.length === 0) return "low";

    // Dividend yield criterion is critical for this strategy
    const yieldEval = evaluations.find((e) => e.criterionName === "dividend_yield");
    if (!yieldEval?.passed) return "low";

    const passedCount = evaluations.filter((e) => e.passed).length;
    const passRate = passedCount / evaluations.length;

    if (passRate >= 0.75) return "high";
    if (passRate >= 0.5) return "medium";
    return "low";
  }

  /**
   * Assess risk level from criterion evaluations
   */
  private assessRiskLevel(evaluations: CriterionEvaluation[]): "low" | "medium" | "high" {
    // High dividend yield might indicate higher risk
    const yieldEval = evaluations.find((e) => e.criterionName === "dividend_yield");
    if (yieldEval && yieldEval.score < 0.5) return "high"; // Poor yield = risk

    const riskCriteria = evaluations.filter((e) =>
      ["debt_to_equity", "dividend_coverage", "payout_ratio"].includes(e.criterionName)
    );

    if (riskCriteria.length === 0) return "medium";

    const riskFailures = riskCriteria.filter((e) => !e.passed).length;
    if (riskFailures >= riskCriteria.length * 0.66) return "high";
    if (riskFailures > 0) return "medium";
    return "low";
  }
}

/**
 * Factory function for SteadyDividendStrategy
 */
export function createSteadyDividendStrategy(): SteadyDividendStrategy {
  return new SteadyDividendStrategy();
}
