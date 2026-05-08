/**
 * Debt-to-Equity Criterion
 * Evaluates financial leverage and solvency
 *
 * Rationale:
 * - High leverage increases risk (especially in downturns)
 * - Ideal D/E varies by sector (NGX dividend stocks: 0.3-0.8)
 * - Very low D/E might indicate unused debt capacity
 * - Very high D/E indicates financial stress
 */

import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { RiskCriterion } from "./base-criterion";

/**
 * Debt-to-Equity criterion configuration
 */
export interface DebtToEquityCriterionConfig {
  maxRatio: number; // Maximum acceptable D/E (e.g., 1.5)
  targetRatio: number; // Target D/E (e.g., 0.6)
  minRatio: number; // Minimum acceptable D/E (e.g., 0.1)
}

/**
 * Debt-to-Equity Criterion Implementation
 */
export class DebtToEquityCriterion extends RiskCriterion {
  readonly name = "debt_to_equity";
  readonly displayName = "Debt-to-Equity Ratio";
  readonly description = "Company has manageable debt levels relative to equity";
  readonly weight: Score = 0.1 as Score; // 10% weight

  private config: DebtToEquityCriterionConfig = {
    maxRatio: 1.5,
    targetRatio: 0.6,
    minRatio: 0.1,
  };

  /**
   * Set configuration
   */
  setConfig(config: Partial<DebtToEquityCriterionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Validate context has required data
   */
  protected validateRequiredFields(context: CriterionContext): void {
    const missingFields: string[] = [];
    const extData = context.stockData as unknown as { debt?: number; equity?: number } | undefined;

    if (extData?.debt == null) {
      missingFields.push("stockData.debt");
    }
    if (extData?.equity == null) {
      missingFields.push("stockData.equity");
    }

    if (missingFields.length > 0) {
      throw new CriterionValidationError(this.name, missingFields);
    }
  }

  /**
   * Evaluate debt-to-equity ratio
   */
  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const stockData = context.stockData!;
    const extendedData = stockData as unknown as { debt: number; equity: number };
    const debt = extendedData.debt;
    const equity = extendedData.equity;

    // Avoid division by zero
    if (equity <= 0) {
      return Promise.resolve(
        this.createEvaluation(
          context,
          false,
          0 as Score,
          0,
          "Cannot calculate D/E ratio: equity is zero or negative",
          this.getThresholds(context)
        )
      );
    }

    const deRatio = debt / equity;
    const isAcceptable = deRatio <= this.config.maxRatio && deRatio >= this.config.minRatio;
    const score = this.calculateDEScore(deRatio);

    const explanation = this.buildExplanation(deRatio, isAcceptable);
    const thresholds = this.getThresholds(context);

    return Promise.resolve(
      this.createEvaluation(context, isAcceptable, score, deRatio, explanation, thresholds)
    );
  }

  /**
   * Get D/E thresholds
   */
  getThresholds(_context?: CriterionContext): CriterionThresholds {
    return {
      name: this.name,
      description: "Debt-to-Equity ratio range",
      min: this.config.minRatio,
      max: this.config.maxRatio,
      target: this.config.targetRatio,
      unit: "x",
    };
  }

  /**
   * Get logic explanation
   */
  getLogicExplanation(): string {
    return `
Company's debt level should be:
1. Not exceeding ${this.config.maxRatio}x equity (avoid excessive leverage)
2. At least ${this.config.minRatio}x equity (utilize reasonable debt)
3. Preferably near ${this.config.targetRatio}x equity (balanced capital structure)

D/E calculation: Total Debt ÷ Total Equity

Higher scores for ratios near target, indicating healthy leverage.
    `.trim();
  }

  /**
   * Initialize criterion
   */
  initialize(): Promise<void> {
    if (this.config.minRatio >= this.config.targetRatio) {
      return Promise.reject(new Error("Min D/E ratio cannot exceed target") as never);
    }
    if (this.config.targetRatio >= this.config.maxRatio) {
      return Promise.reject(new Error("Target D/E ratio cannot exceed max") as never);
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
   * Calculate D/E score (0-1)
   */
  private calculateDEScore(deRatio: number): Score {
    const { minRatio, targetRatio, maxRatio } = this.config;

    // Below minimum: company is underleveraged (suboptimal capital structure)
    if (deRatio < minRatio) {
      const belowMin = minRatio - deRatio;
      const scoreDecay = Math.max(0, 1 - belowMin / minRatio);
      return (scoreDecay * 0.7) as Score; // Not critical, still OK
    }

    // At or near target: score 0.9-1.0
    if (deRatio >= targetRatio) {
      if (deRatio <= maxRatio) {
        const aboveTarget = deRatio - targetRatio;
        const rangeAbove = maxRatio - targetRatio;
        const scoreAboveTarget = Math.max(0, 1 - (aboveTarget / rangeAbove) * 0.1);
        return this.boundScore(0.85 + scoreAboveTarget * 0.15);
      }

      // Above max: financial stress risk increases
      const aboveMax = deRatio - maxRatio;
      const excessScaleFactor = Math.max(0, 1 - aboveMax / maxRatio);
      return this.boundScore(excessScaleFactor * 0.4);
    }

    // Between min and target: score 0.6-0.85
    const range = targetRatio - minRatio;
    const position = (deRatio - minRatio) / range;
    return this.boundScore(0.6 + position * 0.25);
  }

  /**
   * Build explanation string
   */
  private buildExplanation(deRatio: number, _isAcceptable: boolean): string {
    const lines = [];

    lines.push(`Debt-to-Equity Ratio: ${deRatio.toFixed(2)}x`);
    lines.push(`Acceptable Range: ${this.config.minRatio}x - ${this.config.maxRatio}x`);
    lines.push(`Target: ${this.config.targetRatio}x`);

    if (deRatio < this.config.minRatio) {
      lines.push(
        `⚠ Below minimum (${this.config.minRatio}x) - underleveraged, not using optimal capital structure`
      );
    } else if (deRatio > this.config.maxRatio) {
      lines.push(`✗ Above maximum (${this.config.maxRatio}x) - high financial stress risk`);
    } else {
      lines.push(`✓ Within acceptable range - balanced capital structure`);
    }

    // Interpretation
    if (deRatio > 1) {
      lines.push("\nNote: Debt exceeds equity - higher risk profile");
    } else if (deRatio < 0.3) {
      lines.push("\nNote: Very conservative capital structure");
    }

    return lines.join("\n");
  }
}

/**
 * Factory function
 */
export function createDebtToEquityCriterion(
  config?: Partial<DebtToEquityCriterionConfig>
): DebtToEquityCriterion {
  const criterion = new DebtToEquityCriterion();
  if (config) {
    criterion.setConfig(config);
  }
  return criterion;
}
