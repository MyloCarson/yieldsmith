/**
 * Dividend Coverage Criterion
 * Evaluates whether earnings can sustainably cover dividends
 *
 * Rationale:
 * - Dividend should be paid from earnings (not depleting capital)
 * - Coverage ratio = EPS / Dividends per share
 * - Coverage > 1.5x means earnings exceed dividends by 50% (safer)
 * - Coverage < 1.0x means paying from reserves (unsustainable)
 */

import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { DividendCriterion } from "./base-criterion";

/**
 * Dividend Coverage criterion configuration
 */
export interface DividendCoverageCriterionConfig {
  minCoverageRatio: number; // Minimum coverage (e.g., 1.2)
  targetCoverageRatio: number; // Target coverage (e.g., 1.8)
  maxCoverageRatio: number; // Above this might indicate underutilized earnings (e.g., 5.0)
}

/**
 * Dividend Coverage Criterion Implementation
 */
export class DividendCoverageCriterion extends DividendCriterion {
  readonly name = "dividend_coverage";
  readonly displayName = "Dividend Coverage";
  readonly description = "Company earnings sufficiently cover dividend payments (sustainability)";
  readonly weight: Score = 0.15 as Score; // 15% weight

  private config: DividendCoverageCriterionConfig = {
    minCoverageRatio: 1.2,
    targetCoverageRatio: 1.8,
    maxCoverageRatio: 5.0,
  };

  /**
   * Set configuration
   */
  setConfig(config: Partial<DividendCoverageCriterionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Validate context has required data
   */
  protected validateRequiredFields(context: CriterionContext): void {
    const missingFields: string[] = [];
    const extData = context.stockData as unknown as
      | { eps?: number; dividendPerShare?: number }
      | undefined;

    if (extData?.eps == null) {
      missingFields.push("stockData.eps");
    }
    if (extData?.dividendPerShare == null) {
      missingFields.push("stockData.dividendPerShare");
    }

    if (missingFields.length > 0) {
      throw new CriterionValidationError(this.name, missingFields);
    }
  }

  /**
   * Evaluate dividend coverage
   */
  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const stockData = context.stockData!;
    const eps = stockData.eps!;
    const dps = (stockData as unknown as { dividendPerShare: number }).dividendPerShare;

    // Avoid division by zero
    if (dps <= 0) {
      return Promise.resolve(
        this.createEvaluation(
          context,
          false,
          0 as Score,
          0,
          "No dividend to evaluate coverage for",
          this.getThresholds(context)
        )
      );
    }

    // Coverage ratio = EPS / DPS
    const coverageRatio = eps / dps;
    const isAcceptable = coverageRatio >= this.config.minCoverageRatio;
    const score = this.calculateCoverageScore(coverageRatio);

    const explanation = this.buildExplanation(coverageRatio, isAcceptable);
    const thresholds = this.getThresholds(context);

    return Promise.resolve(
      this.createEvaluation(context, isAcceptable, score, coverageRatio, explanation, thresholds)
    );
  }

  /**
   * Get coverage thresholds
   */
  getThresholds(_context?: CriterionContext): CriterionThresholds {
    return {
      name: this.name,
      description: "Dividend coverage ratio (EPS / DPS)",
      min: this.config.minCoverageRatio,
      max: this.config.maxCoverageRatio,
      target: this.config.targetCoverageRatio,
      unit: "x",
    };
  }

  /**
   * Get logic explanation
   */
  getLogicExplanation(): string {
    return `
Dividend coverage = Earnings Per Share ÷ Dividend Per Share

Acceptable coverage:
1. Minimum ${this.config.minCoverageRatio}x - ensure earnings exceed dividends
2. Target ${this.config.targetCoverageRatio}x - safe dividend with growth room
3. Above ${this.config.maxCoverageRatio}x - may indicate underutilized earnings

Coverage < 1.0x: Red flag - paying dividends from capital (unsustainable)
Coverage 1.0-1.5x: Risky - little buffer for earnings downturns
Coverage > 2.0x: Comfortable - good safety margin
    `.trim();
  }

  /**
   * Initialize criterion
   */
  initialize(): Promise<void> {
    if (this.config.minCoverageRatio <= 0) {
      return Promise.reject(new Error("Min coverage ratio must be positive"));
    }
    return Promise.resolve();
  }

  /**
   * Health check
   */
  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  // ============== Private Helper Methods ==============

  /**
   * Calculate coverage score (0-1)
   */
  private calculateCoverageScore(coverageRatio: number): Score {
    const { minCoverageRatio, targetCoverageRatio, maxCoverageRatio } = this.config;

    // Below 1.0: paying from capital (critical risk)
    if (coverageRatio < 1.0) {
      return (Math.max(0, coverageRatio) * 0.2) as Score; // Very low score
    }

    // 1.0-1.2: below minimum (risky)
    if (coverageRatio < minCoverageRatio) {
      const range = minCoverageRatio - 1.0;
      const position = (coverageRatio - 1.0) / range;
      return (0.2 + position * 0.3) as Score; // Score 0.2-0.5
    }

    // 1.2 - target: safe range
    if (coverageRatio >= minCoverageRatio && coverageRatio <= targetCoverageRatio) {
      const range = targetCoverageRatio - minCoverageRatio;
      const position = (coverageRatio - minCoverageRatio) / range;
      return (0.5 + position * 0.45) as Score; // Score 0.5-0.95
    }

    // Above target: good, but check for underutilized earnings
    if (coverageRatio <= maxCoverageRatio) {
      const aboveTarget = coverageRatio - targetCoverageRatio;
      const scoreAboveTarget = Math.min(
        0.05,
        (aboveTarget / (maxCoverageRatio - targetCoverageRatio)) * 0.05
      );
      return this.boundScore(0.95 + scoreAboveTarget);
    }

    // Way above max: earnings not being distributed (unusual but still acceptable)
    const overMax = coverageRatio - maxCoverageRatio;
    const decay = Math.max(0.5, 1 - overMax / (maxCoverageRatio * 2));
    return this.boundScore(0.9 * decay);
  }

  /**
   * Build explanation string
   */
  private buildExplanation(coverageRatio: number, _isAcceptable: boolean): string {
    const lines = [];

    lines.push(`Dividend Coverage Ratio: ${coverageRatio.toFixed(2)}x`);
    lines.push(`(Earnings Per Share ÷ Dividend Per Share)`);

    if (coverageRatio < 1.0) {
      lines.push(`✗ CRITICAL: Below 1.0x - Paying dividends from capital, not earnings!`);
      lines.push(`   This is unsustainable and dividend is at risk of being cut.`);
    } else if (coverageRatio < this.config.minCoverageRatio) {
      lines.push(`✗ Below minimum (${this.config.minCoverageRatio}x) - Limited safety buffer`);
      lines.push(`   Dividend vulnerable to earnings downturns.`);
    } else if (coverageRatio <= this.config.targetCoverageRatio) {
      lines.push(`✓ Within target range - Safe dividend with growth room`);
    } else if (coverageRatio <= this.config.maxCoverageRatio) {
      lines.push(`✓ Above target - Very safe dividend`);
      lines.push(`   Room for dividend growth or capital retention.`);
    } else {
      lines.push(`✓ Excellent coverage (${coverageRatio.toFixed(2)}x)`);
      lines.push(`   Significant room for growth or strategic investments.`);
    }

    return lines.join("\n");
  }
}

/**
 * Factory function
 */
export function createDividendCoverageCriterion(
  config?: Partial<DividendCoverageCriterionConfig>
): DividendCoverageCriterion {
  const criterion = new DividendCoverageCriterion();
  if (config) {
    criterion.setConfig(config);
  }
  return criterion;
}
