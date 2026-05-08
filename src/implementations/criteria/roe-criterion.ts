/**
 * Return on Equity (ROE) Criterion
 * Evaluates how efficiently the company generates returns on shareholder capital
 *
 * Rationale:
 * - ROE = Net Income / Shareholder Equity
 * - High ROE (>15%): company efficiently uses shareholder capital
 * - Low ROE (<8%): company may not be using capital effectively
 * - Sector-dependent: banks/insurance typically higher ROE than utilities
 */

import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { GrowthCriterion } from "./base-criterion";

/**
 * ROE criterion configuration
 */
export interface ROECriterionConfig {
  maxROE: number; // Maximum (e.g., 0.40 for 40%, anything above is diminishing value)
  targetROE: number; // Target (e.g., 0.15 for 15%)
  minROE: number; // Minimum acceptable (e.g., 0.08 for 8%)
}

/**
 * ROE Criterion Implementation
 */
export class ROECriterion extends GrowthCriterion {
  readonly name = "roe";
  readonly displayName = "Return on Equity (ROE)";
  readonly description = "Company generates strong returns on shareholder capital";
  readonly weight: Score = 0.08 as Score; // 8% weight

  private config: ROECriterionConfig = {
    maxROE: 0.4,
    targetROE: 0.15,
    minROE: 0.08,
  };

  /**
   * Set configuration
   */
  setConfig(config: Partial<ROECriterionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Validate context has required data
   */
  protected validateRequiredFields(context: CriterionContext): void {
    const missingFields: string[] = [];
    const extData = context.stockData as unknown as
      | { netIncome?: number; equity?: number }
      | undefined;

    if (extData?.netIncome == null) {
      missingFields.push("stockData.netIncome");
    }
    if (extData?.equity == null) {
      missingFields.push("stockData.equity");
    }

    if (missingFields.length > 0) {
      throw new CriterionValidationError(this.name, missingFields);
    }
  }

  /**
   * Evaluate ROE
   */
  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const extendedData = context.stockData as unknown as { netIncome: number; equity: number };
    const netIncome = extendedData.netIncome;
    const equity = extendedData.equity;

    // Avoid division by zero
    if (equity <= 0) {
      return Promise.resolve(
        this.createEvaluation(
          context,
          false,
          0 as Score,
          0,
          "Cannot calculate ROE: equity is zero or negative",
          this.getThresholds(context)
        )
      );
    }

    const roe = netIncome / equity;
    const isAcceptable = roe >= this.config.minROE && roe <= this.config.maxROE;
    const score = this.calculateROEScore(roe);

    const explanation = this.buildExplanation(roe, isAcceptable);
    const thresholds = this.getThresholds(context);

    return Promise.resolve(
      this.createEvaluation(context, isAcceptable, score, roe * 100, explanation, thresholds)
    );
  }

  /**
   * Get ROE thresholds
   */
  getThresholds(_context?: CriterionContext): CriterionThresholds {
    return {
      name: this.name,
      description: "Return on Equity (Net Income / Equity)",
      min: this.config.minROE * 100,
      max: this.config.maxROE * 100,
      target: this.config.targetROE * 100,
      unit: "%",
    };
  }

  /**
   * Get logic explanation
   */
  getLogicExplanation(): string {
    const minPercent = (this.config.minROE * 100).toFixed(0);
    const targetPercent = (this.config.targetROE * 100).toFixed(0);
    const maxPercent = (this.config.maxROE * 100).toFixed(0);

    return `
Return on Equity (ROE) = Net Income ÷ Shareholder Equity

Indicates how efficiently company uses shareholder capital.

1. Below ${minPercent}%: Inefficient use of capital
2. ${minPercent}%-${targetPercent}%: Acceptable efficiency
3. ${targetPercent}%-${maxPercent}%: Strong returns
4. Above ${maxPercent}%: Potentially unsustainable or leveraged returns

Higher scores for ROE near target.
    `.trim();
  }

  /**
   * Initialize criterion
   */
  initialize(): Promise<void> {
    if (this.config.minROE >= this.config.targetROE) {
      return Promise.reject(new Error("Min ROE cannot exceed target"));
    }
    if (this.config.targetROE >= this.config.maxROE) {
      return Promise.reject(new Error("Target ROE cannot exceed max"));
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
   * Calculate ROE score (0-1)
   */
  private calculateROEScore(roe: number): Score {
    const { minROE, targetROE, maxROE } = this.config;

    // Negative or zero ROE: poor capital efficiency
    if (roe <= 0) {
      return 0 as Score;
    }

    // Below minimum: inefficient
    if (roe < minROE) {
      const belowMin = minROE - roe;
      const scoreDecay = Math.max(0, 1 - belowMin / minROE);
      return (scoreDecay * 0.4) as Score;
    }

    // At or near target: score 0.8-1.0
    if (roe >= targetROE) {
      if (roe <= maxROE) {
        const aboveTarget = roe - targetROE;
        const rangeAbove = maxROE - targetROE;
        const scoreAboveTarget = Math.max(0, 1 - (aboveTarget / rangeAbove) * 0.2);
        return this.boundScore(0.8 + scoreAboveTarget * 0.2);
      }

      // Above max: potentially using excessive leverage
      const aboveMax = roe - maxROE;
      const excessScaleFactor = Math.max(0.5, 1 - aboveMax / (maxROE * 2));
      return this.boundScore(0.7 * excessScaleFactor);
    }

    // Between min and target: score 0.4-0.8
    const range = targetROE - minROE;
    const position = (roe - minROE) / range;
    return this.boundScore(0.4 + position * 0.4);
  }

  /**
   * Build explanation string
   */
  private buildExplanation(roe: number, _isAcceptable: boolean): string {
    const lines = [];

    const roePercent = (roe * 100).toFixed(1);
    const minPercent = (this.config.minROE * 100).toFixed(0);
    const maxPercent = (this.config.maxROE * 100).toFixed(0);

    lines.push(`Return on Equity (ROE): ${roePercent}%`);
    lines.push(`(Net Income ÷ Shareholder Equity)`);

    if (roe <= 0) {
      lines.push(`✗ Negative or zero ROE - Company is not profitable`);
    } else if (roe < this.config.minROE) {
      lines.push(`✗ Below minimum (${minPercent}%) - Inefficient use of shareholder capital`);
    } else if (roe > this.config.maxROE) {
      lines.push(`⚠ Above maximum (${maxPercent}%) - May indicate excessive leverage`);
    } else {
      lines.push(`✓ Within acceptable range - Efficient capital deployment`);
    }

    // Interpretation
    lines.push("");
    if (roe > this.config.targetROE) {
      lines.push("Strong capital efficiency - company generates strong returns");
    } else if (roe > this.config.minROE) {
      lines.push("Acceptable capital efficiency - room for improvement");
    } else {
      lines.push("Poor capital efficiency - concern for long-term shareholder returns");
    }

    return lines.join("\n");
  }
}

/**
 * Factory function
 */
export function createROECriterion(config?: Partial<ROECriterionConfig>): ROECriterion {
  const criterion = new ROECriterion();
  if (config) {
    criterion.setConfig(config);
  }
  return criterion;
}
