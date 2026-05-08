/**
 * Payout Ratio Criterion
 * Evaluates dividend sustainability through payout ratio
 *
 * Rationale:
 * - Payout ratio = Dividends ÷ Net Income (%)
 * - High ratio (>80%): leaves little room for growth or emergencies
 * - Low ratio (<30%): company may underutilize dividend returns
 * - Ideal: 40-70% for mature dividend-paying companies
 */

import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { DividendCriterion } from "./base-criterion";

/**
 * Payout Ratio criterion configuration
 */
export interface PayoutRatioCriterionConfig {
  maxPayoutRatio: number; // Maximum acceptable payout ratio (e.g., 0.75 for 75%)
  targetPayoutRatio: number; // Target payout ratio (e.g., 0.55 for 55%)
  minPayoutRatio: number; // Minimum payout ratio (e.g., 0.30 for 30%)
}

/**
 * Payout Ratio Criterion Implementation
 */
export class PayoutRatioCriterion extends DividendCriterion {
  readonly name = "payout_ratio";
  readonly displayName = "Payout Ratio";
  readonly description = "Company dividend payout ratio is sustainable (not excessive)";
  readonly weight: Score = 0.12 as Score; // 12% weight

  private config: PayoutRatioCriterionConfig = {
    maxPayoutRatio: 0.75,
    targetPayoutRatio: 0.55,
    minPayoutRatio: 0.3,
  };

  /**
   * Set configuration
   */
  setConfig(config: Partial<PayoutRatioCriterionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Validate context has required data
   */
  protected validateRequiredFields(context: CriterionContext): void {
    const missingFields: string[] = [];
    const extData = context.stockData as unknown as
      | { netIncome?: number; totalDividendsPaid?: number }
      | undefined;

    if (extData?.netIncome == null) {
      missingFields.push("stockData.netIncome");
    }
    if (extData?.totalDividendsPaid == null) {
      missingFields.push("stockData.totalDividendsPaid");
    }

    if (missingFields.length > 0) {
      throw new CriterionValidationError(this.name, missingFields);
    }
  }

  /**
   * Evaluate payout ratio
   */
  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const extendedData = context.stockData as unknown as {
      netIncome: number;
      totalDividendsPaid: number;
    };
    const netIncome = extendedData.netIncome;
    const totalDividendsPaid = extendedData.totalDividendsPaid;

    // Avoid division by zero or negative income
    if (netIncome <= 0) {
      return Promise.resolve(
        this.createEvaluation(
          context,
          false,
          0 as Score,
          0,
          "Cannot calculate payout ratio: net income is zero or negative",
          this.getThresholds(context)
        )
      );
    }

    // Payout ratio = Total Dividends / Net Income
    const payoutRatio = totalDividendsPaid / netIncome;
    const isAcceptable =
      payoutRatio <= this.config.maxPayoutRatio && payoutRatio >= this.config.minPayoutRatio;
    const score = this.calculatePayoutScore(payoutRatio);

    const explanation = this.buildExplanation(payoutRatio, isAcceptable);
    const thresholds = this.getThresholds(context);

    return Promise.resolve(
      this.createEvaluation(context, isAcceptable, score, payoutRatio, explanation, thresholds)
    );
  }

  /**
   * Get payout ratio thresholds
   */
  getThresholds(_context?: CriterionContext): CriterionThresholds {
    return {
      name: this.name,
      description: "Dividend payout ratio (Dividends / Net Income)",
      min: this.config.minPayoutRatio,
      max: this.config.maxPayoutRatio,
      target: this.config.targetPayoutRatio,
      unit: "%",
    };
  }

  /**
   * Get logic explanation
   */
  getLogicExplanation(): string {
    return `
Payout Ratio = Total Dividends ÷ Net Income

Interpretation:
1. Below ${(this.config.minPayoutRatio * 100).toFixed(0)}%: May underutilize dividend opportunity
2. ${(this.config.minPayoutRatio * 100).toFixed(0)}%-${(this.config.targetPayoutRatio * 100).toFixed(0)}%: Ideal range (room for growth + stability)
3. ${(this.config.targetPayoutRatio * 100).toFixed(0)}%-${(this.config.maxPayoutRatio * 100).toFixed(0)}%: Acceptable but tight
4. Above ${(this.config.maxPayoutRatio * 100).toFixed(0)}%: Risky (little buffer for downturns)

Higher scores for ratios in target range.
    `.trim();
  }

  /**
   * Initialize criterion
   */
  initialize(): Promise<void> {
    if (this.config.minPayoutRatio >= this.config.targetPayoutRatio) {
      return Promise.reject(new Error("Min payout ratio cannot exceed target"));
    }
    if (this.config.targetPayoutRatio >= this.config.maxPayoutRatio) {
      return Promise.reject(new Error("Target payout ratio cannot exceed max"));
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
   * Calculate payout score (0-1)
   */
  private calculatePayoutScore(payoutRatio: number): Score {
    const { minPayoutRatio, targetPayoutRatio, maxPayoutRatio } = this.config;

    // Below minimum: underutilizing dividend
    if (payoutRatio < minPayoutRatio) {
      const belowMin = minPayoutRatio - payoutRatio;
      const scoreDecay = Math.max(0, 1 - belowMin / minPayoutRatio);
      return (scoreDecay * 0.6) as Score; // 0.6 max when too low
    }

    // At or near target: score 0.9-1.0
    if (payoutRatio >= targetPayoutRatio) {
      if (payoutRatio <= maxPayoutRatio) {
        const aboveTarget = payoutRatio - targetPayoutRatio;
        const rangeAbove = maxPayoutRatio - targetPayoutRatio;
        const scoreAboveTarget = Math.max(0, 1 - (aboveTarget / rangeAbove) * 0.1);
        return this.boundScore(0.85 + scoreAboveTarget * 0.15);
      }

      // Above max: sustainability risk
      const aboveMax = payoutRatio - maxPayoutRatio;
      const excessScaleFactor = Math.max(0, 1 - aboveMax / (maxPayoutRatio * 0.5));
      return this.boundScore(excessScaleFactor * 0.4);
    }

    // Between min and target: score 0.5-0.85
    const range = targetPayoutRatio - minPayoutRatio;
    const position = (payoutRatio - minPayoutRatio) / range;
    return this.boundScore(0.5 + position * 0.35);
  }

  /**
   * Build explanation string
   */
  private buildExplanation(payoutRatio: number, _isAcceptable: boolean): string {
    const lines = [];

    const payoutPercent = (payoutRatio * 100).toFixed(1);
    const minPercent = (this.config.minPayoutRatio * 100).toFixed(0);
    const targetPercent = (this.config.targetPayoutRatio * 100).toFixed(0);
    const maxPercent = (this.config.maxPayoutRatio * 100).toFixed(0);

    lines.push(`Payout Ratio: ${payoutPercent}%`);
    lines.push(`(Dividends as % of Net Income)`);

    if (payoutRatio < this.config.minPayoutRatio) {
      lines.push(`⚠ Below minimum (${minPercent}%) - Company may underutilize dividend returns`);
      lines.push(`   Opportunity for higher dividends or other uses of capital.`);
    } else if (payoutRatio > this.config.maxPayoutRatio) {
      lines.push(`✗ Above maximum (${maxPercent}%) - Limited sustainability buffer`);
      lines.push(`   Dividend at risk if earnings decline.`);
    } else {
      lines.push(`✓ Within acceptable range - Sustainable dividend level`);
      const closeness = Math.abs(payoutRatio - this.config.targetPayoutRatio);
      if (closeness < (this.config.targetPayoutRatio - this.config.minPayoutRatio) * 0.2) {
        lines.push(`   Very close to target (${targetPercent}%).`);
      }
    }

    // Risk assessment
    if (payoutRatio > 0.9) {
      lines.push("\n⚠ CAUTION: Payout exceeds 90% - High risk of dividend cuts");
    } else if (payoutRatio > this.config.maxPayoutRatio) {
      lines.push("\n⚠ Dividend sustainability is questionable");
    } else if (payoutRatio > this.config.targetPayoutRatio) {
      lines.push("\n→ Dividend is sustainable but leaves limited growth room");
    } else {
      lines.push("\n✓ Ample room for dividend growth or reinvestment");
    }

    return lines.join("\n");
  }
}

/**
 * Factory function
 */
export function createPayoutRatioCriterion(
  config?: Partial<PayoutRatioCriterionConfig>
): PayoutRatioCriterion {
  const criterion = new PayoutRatioCriterion();
  if (config) {
    criterion.setConfig(config);
  }
  return criterion;
}
