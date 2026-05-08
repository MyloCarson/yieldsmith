/**
 * Dividend Growth Strategy
 * Targets stocks with consistent and growing dividends
 *
 * Focus:
 * - Dividend yield (5% minimum, 7% target)
 * - Dividend growth rate (>5% CAGR)
 * - Dividend consistency (stable payout history)
 * - Sustainability (payout ratio <70%)
 *
 * Target investor: Growth-focused dividend investors looking for capital appreciation
 * Holding period: 3-5 years
 */

import { EvaluationContext, StrategyEvaluation, StrategyType } from "@core/strategy";
import { CriterionContext, CriterionEvaluation } from "@core/criterion";
import { StrategyError } from "@core/errors";
import { BaseStrategy } from "./base-strategy";

/**
 * Dividend Growth Strategy Implementation
 */
export class DividendGrowthStrategy extends BaseStrategy {
  readonly id: StrategyType = "dividend_growth";
  readonly name = "Dividend Growth Strategy";
  readonly description =
    "Targets stocks with consistent dividend growth and sustainable payouts for long-term capital appreciation and income";
  readonly recommendedHoldingPeriod = 1825; // 5 years in days

  /**
   * Evaluate stock for dividend growth suitability
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
        // Log but continue if individual criterion fails
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
      },
    };
  }

  /**
   * Calculate confidence from evaluation consensus
   */
  private calculateConfidence(evaluations: CriterionEvaluation[]): "high" | "medium" | "low" {
    if (evaluations.length === 0) return "low";

    const passedCount = evaluations.filter((e) => e.passed).length;
    const passRate = passedCount / evaluations.length;

    if (passRate >= 0.8) return "high";
    if (passRate >= 0.5) return "medium";
    return "low";
  }

  /**
   * Assess risk level from criterion evaluations
   */
  private assessRiskLevel(evaluations: CriterionEvaluation[]): "low" | "medium" | "high" {
    // Find risk-related criteria (if any failed, mark as higher risk)
    const riskCriteria = evaluations.filter((e) =>
      ["volatility", "debt_to_equity", "dividend_coverage"].includes(e.criterionName)
    );

    if (riskCriteria.length === 0) return "medium";

    const riskFailures = riskCriteria.filter((e) => !e.passed).length;
    if (riskFailures >= riskCriteria.length * 0.5) return "high";
    if (riskFailures > 0) return "medium";
    return "low";
  }
}

/**
 * Factory function for DividendGrowthStrategy
 */
export function createDividendGrowthStrategy(): DividendGrowthStrategy {
  return new DividendGrowthStrategy();
}
