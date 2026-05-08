/**
 * P/E Ratio Criterion
 * Evaluates stocks based on Price-to-Earnings ratio
 *
 * Rationale:
 * - Primary value metric: lower P/E = potentially undervalued
 * - Market average P/E for NGX: ~8-15x
 * - Too high P/E: growth expectations may be overpriced
 * - Too low P/E: potential value trap
 */

import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { ValuationCriterion } from "./base-criterion";

/**
 * P/E Ratio criterion configuration
 */
export interface PERatioCriterionConfig {
  maxRatio: number; // Maximum acceptable P/E ratio (e.g., 15)
  targetRatio: number; // Target P/E ratio (e.g., 12)
  minRatio: number; // Minimum acceptable P/E ratio (e.g., 5, avoid deep value traps)
  marketAveragePE?: number; // For comparison (NGX avg ~12)
}

/**
 * P/E Ratio Criterion Implementation
 */
export class PERatioCriterion extends ValuationCriterion {
  readonly name = "pe_ratio";
  readonly displayName = "P/E Ratio";
  readonly description = "Stock P/E ratio is reasonable relative to market and growth prospects";
  readonly weight: Score = 0.15 as Score; // 15% weight

  private config: PERatioCriterionConfig = {
    maxRatio: 20,
    targetRatio: 12,
    minRatio: 5,
    marketAveragePE: 12,
  };

  /**
   * Set configuration
   */
  setConfig(config: Partial<PERatioCriterionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Validate context has required data
   */
  protected validateRequiredFields(context: CriterionContext): void {
    const missingFields: string[] = [];

    if (context.stockData?.price == null) {
      missingFields.push("stockData.price");
    }
    if (context.stockData?.eps == null) {
      missingFields.push("stockData.eps");
    }

    if (missingFields.length > 0) {
      throw new CriterionValidationError(this.name, missingFields);
    }
  }

  /**
   * Evaluate P/E ratio
   */
  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const stockData = context.stockData!;
    const price = stockData.price;
    const eps = stockData.eps!;

    // Avoid division by zero or negative EPS
    if (eps <= 0) {
      return Promise.resolve(
        this.createEvaluation(
          context,
          false,
          0 as Score,
          0,
          "Cannot calculate P/E ratio: EPS is zero or negative",
          this.getThresholds(context)
        )
      );
    }

    const peRatio = price / eps;
    const isAcceptable = peRatio <= this.config.maxRatio && peRatio >= this.config.minRatio;
    const score: Score = this.calculatePEScore(peRatio);

    const explanation = this.buildExplanation(peRatio, isAcceptable);
    const thresholds = this.getThresholds(context);

    return Promise.resolve(
      this.createEvaluation(context, isAcceptable, score, peRatio, explanation, thresholds)
    );
  }

  /**
   * Get P/E ratio thresholds
   */
  getThresholds(_context?: CriterionContext): CriterionThresholds {
    return {
      name: this.name,
      description: "Price-to-Earnings ratio range",
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
Stock P/E ratio should be:
1. Not exceeding ${this.config.maxRatio}x (avoid overvaluation)
2. At least ${this.config.minRatio}x (avoid deep value traps)
3. Preferably near ${this.config.targetRatio}x (market fair value)

Market average P/E: ${this.config.marketAveragePE}x

Higher scores for ratios near target.
    `.trim();
  }

  /**
   * Initialize criterion
   */
  initialize(): Promise<void> {
    if (this.config.minRatio >= this.config.targetRatio) {
      return Promise.reject(new Error("Min P/E ratio cannot exceed target"));
    }
    if (this.config.targetRatio >= this.config.maxRatio) {
      return Promise.reject(new Error("Target P/E ratio cannot exceed max"));
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
   * Calculate P/E score (0-1)
   */
  private calculatePEScore(peRatio: number): Score {
    const { minRatio, targetRatio, maxRatio } = this.config;

    // Below minimum: red flag (potential value trap)
    if (peRatio < minRatio) {
      const depthBelow = minRatio - peRatio;
      const scoreDecay = Math.max(0, 1 - depthBelow / (minRatio * 0.5));
      return (scoreDecay * 0.3) as Score; // Max 30% for very cheap stocks
    }

    // At or near target: score 0.9-1.0
    if (peRatio >= targetRatio) {
      // Between target and max
      if (peRatio <= maxRatio) {
        const aboveTarget = peRatio - targetRatio;
        const rangeAbove = maxRatio - targetRatio;
        const scoreAboveTarget = Math.max(0, 1 - (aboveTarget / rangeAbove) * 0.1);
        return this.boundScore(0.85 + scoreAboveTarget * 0.15);
      }

      // Above max: penalize by how much
      const aboveMax = peRatio - maxRatio;
      const excessScaleFactor = Math.max(0, 1 - aboveMax / maxRatio);
      return this.boundScore(excessScaleFactor * 0.4);
    }

    // Between min and target: score 0.5-0.85
    const range = targetRatio - minRatio;
    const position = (peRatio - minRatio) / range;
    return this.boundScore(0.5 + position * 0.35);
  }

  /**
   * Build explanation string
   */
  private buildExplanation(peRatio: number, _isAcceptable: boolean): string {
    const lines = [];

    lines.push(`P/E Ratio: ${peRatio.toFixed(2)}x`);
    lines.push(`Target Range: ${this.config.minRatio}x - ${this.config.maxRatio}x`);
    lines.push(`Market Average: ${this.config.marketAveragePE}x`);

    if (peRatio < this.config.minRatio) {
      lines.push(`✗ Below minimum (${this.config.minRatio}x) - potential value trap`);
    } else if (peRatio > this.config.maxRatio) {
      lines.push(`✗ Above maximum (${this.config.maxRatio}x) - potentially overvalued`);
    } else {
      const comparison = peRatio < this.config.targetRatio ? "below" : "above";
      lines.push(`✓ Within acceptable range (${comparison} target)`);
    }

    // Relative to market
    const vsMarket = ((peRatio / (this.config.marketAveragePE || 1)) * 100).toFixed(0);
    lines.push(`\nRelative to market: ${vsMarket}% of average`);

    return lines.join("\n");
  }
}

/**
 * Factory function
 */
export function createPERatioCriterion(config?: Partial<PERatioCriterionConfig>): PERatioCriterion {
  const criterion = new PERatioCriterion();
  if (config) {
    criterion.setConfig(config);
  }
  return criterion;
}
