/**
 * Quality Score Criterion
 * Composite metric based on profitability, earnings quality, and financial health
 *
 * Components:
 * - ROE (efficiency)
 * - Revenue trend (growth)
 * - Debt levels (leverage)
 * - Earnings consistency (reliability)
 */

import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { GrowthCriterion } from "./base-criterion";
import { toPercent } from "@/utils/math";

/**
 * Quality Score Criterion Implementation
 */
export class QualityScoreCriterion extends GrowthCriterion {
  readonly name = "quality_score";
  readonly displayName = "Company Quality Score";
  readonly description = "Company demonstrates strong financial quality across multiple metrics";
  readonly weight: Score = 0.1 as Score;

  private minQualityScore = 0.6; // 60% minimum
  private targetQualityScore = 0.75; // 75% target

  protected validateRequiredFields(context: CriterionContext): void {
    const missingFields: string[] = [];
    const extData = context.stockData as unknown as
      | { eps?: number; roe?: number; debt?: number; equity?: number }
      | undefined;
    if (extData?.eps == null) missingFields.push("stockData.eps");
    if (extData?.roe == null) missingFields.push("stockData.roe");
    if (extData?.debt == null) missingFields.push("stockData.debt");
    if (extData?.equity == null) missingFields.push("stockData.equity");
    if (missingFields.length > 0) {
      throw new CriterionValidationError(this.name, missingFields);
    }
  }

  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const stockData = context.stockData!;
    const extData = stockData as unknown as {
      eps: number;
      roe: number;
      debt: number;
      equity: number;
    };

    // Composite quality score: ROE, profitability, debt levels
    const roeScore = Math.min(1, (extData.roe || 0) / 0.15); // 15% ROE = perfect
    const profitScore = extData.eps > 0 ? 1 : 0;
    const debtScore = Math.min(1, 1 - (extData.debt || 0) / (extData.equity || 1) / 1.5); // Lower debt = better

    const qualityScore = (roeScore * 0.4 + profitScore * 0.3 + debtScore * 0.3) as Score;
    const isAcceptable = qualityScore >= this.minQualityScore;
    const score = this.boundScore(qualityScore);

    const explanation = this.buildExplanation(qualityScore, isAcceptable);

    return Promise.resolve(
      this.createEvaluation(
        context,
        isAcceptable,
        score,
        toPercent(qualityScore),
        explanation,
        this.getThresholds()
      )
    );
  }

  getThresholds(_context?: CriterionContext): CriterionThresholds {
    return {
      name: this.name,
      description: "Quality Score (0-100)",
      min: toPercent(this.minQualityScore),
      max: 100,
      target: toPercent(this.targetQualityScore),
      unit: "%",
    };
  }

  getLogicExplanation(): string {
    return `
Quality Score combines:
- ROE (40%): Returns on shareholder capital
- Profitability (30%): Positive earnings
- Leverage (30%): Manageable debt levels

Score 0-100:
- Below ${(this.minQualityScore * 100).toFixed(0)}: Poor quality
- ${(this.minQualityScore * 100).toFixed(0)}-${(this.targetQualityScore * 100).toFixed(0)}: Acceptable
- Above ${(this.targetQualityScore * 100).toFixed(0)}: High quality
    `.trim();
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  private buildExplanation(score: number, _isAcceptable: boolean): string {
    const scorePercent = (score * 100).toFixed(0);
    return `
Quality Score: ${scorePercent}%
Target: ${(this.targetQualityScore * 100).toFixed(0)}%

${
  score >= this.targetQualityScore
    ? "✓ High quality company - Strong financial fundamentals"
    : score >= this.minQualityScore
      ? "✓ Acceptable quality - Meets basic standards"
      : "✗ Poor quality - Concerns about financial health"
}
    `.trim();
  }
}

export function createQualityScoreCriterion(): QualityScoreCriterion {
  return new QualityScoreCriterion();
}
