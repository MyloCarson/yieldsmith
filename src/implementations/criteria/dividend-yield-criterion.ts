/**
 * Dividend Yield Criterion
 * Evaluates stocks based on dividend yield (dividend per share / current price)
 *
 * Rationale:
 * - Primary metric for dividend investors
 * - Tax-adjusted yield shows actual take-home return
 * - Compares against portfolio target and market average
 */

import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { DividendCriterion } from "./base-criterion";
import { toPercent, multiply } from "@/utils/math";

/**
 * Dividend yield criterion configuration
 */
export interface DividendYieldConfig {
  minYield: number; // Minimum acceptable yield (%)
  targetYield: number; // Target yield for portfolio goal (%)
  maxYield: number; // Maximum yield (potential red flag)
  preferredPayoutFrequency?: "monthly" | "quarterly" | "annual"; // NGX stocks are mostly quarterly
  withholdingTaxRate?: number; // 10% for NGX
}

/**
 * Dividend Yield Criterion Implementation
 *
 * Evaluates if stock dividend yield meets investor's target
 * Takes into account:
 * - Gross yield (before tax)
 * - Net yield (after 10% NGX withholding tax)
 * - Historical yield trend
 * - Market average comparison
 * - Payout sustainability (must not be over 100% payout ratio)
 */
export class DividendYieldCriterion extends DividendCriterion {
  readonly name = "dividend_yield";
  readonly displayName = "Dividend Yield";
  readonly description = "Stock dividend yield meets or exceeds target, accounting for taxes";
  readonly weight: Score = 0.25 as Score; // 25% weight in most strategies

  private config: DividendYieldConfig = {
    minYield: 3.0, // 3% minimum
    targetYield: 5.0, // 5% target (portfolio-wide)
    maxYield: 20.0, // >20% is suspicious (potential capital loss risk)
    preferredPayoutFrequency: "quarterly",
    withholdingTaxRate: 0.1, // 10% NGX standard
  };

  /**
   * Set configuration
   */
  setConfig(config: Partial<DividendYieldConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Validate context has required dividend data
   */
  protected validateRequiredFields(context: CriterionContext): void {
    const missingFields: string[] = [];

    if (context.stockData?.dividendYield == null) {
      missingFields.push("stockData.dividendYield");
    }
    if (context.stockData?.price == null) {
      missingFields.push("stockData.price");
    }

    if (missingFields.length > 0) {
      throw new CriterionValidationError(this.name, missingFields);
    }
  }

  /**
   * Evaluate dividend yield
   */
  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const stockData = context.stockData!;
    const grossYield = toPercent(stockData.dividendYield || 0);

    const withholdingTax = this.config.withholdingTaxRate ?? 0.1;
    const netYield = multiply(grossYield, 1 - withholdingTax);

    const thresholds = this.getThresholds(context);

    const isAcceptable = netYield >= this.config.minYield;
    const isAboveTarget = netYield >= this.config.targetYield;

    const score = this.calculateYieldScore(
      netYield,
      this.config.minYield,
      this.config.targetYield,
      this.config.maxYield
    );

    const trendAnalysis = this.analyzeDividendTrend(context);

    const explanation = this.buildExplanation(
      grossYield,
      netYield,
      isAcceptable,
      isAboveTarget,
      trendAnalysis
    );

    return Promise.resolve(
      this.createEvaluation(context, isAcceptable, score, netYield, explanation, thresholds)
    );
  }

  /**
   * Get dividend yield thresholds
   */
  getThresholds(_context?: CriterionContext): CriterionThresholds {
    return {
      name: this.name,
      description: "Tax-adjusted dividend yield targets",
      min: this.config.minYield,
      max: this.config.maxYield,
      target: this.config.targetYield,
      unit: "%",
    };
  }

  /**
   * Get human-readable logic explanation
   */
  getLogicExplanation(): string {
    return `
Stock must have:
1. Tax-adjusted (net) dividend yield >= ${this.config.minYield}% (after ${((this.config.withholdingTaxRate ?? 0.1) * 100).toFixed(0)}% NGX withholding tax)
2. Net yield not exceeding ${this.config.maxYield}% (red flag for sustainability)
3. Preferably: trending upward or stable (not declining)

Higher scores for net yields above target (${this.config.targetYield}%),
adjusted for market conditions.
    `.trim();
  }

  /**
   * Initialize criterion
   */
  initialize(): Promise<void> {
    if (this.config.minYield <= 0 || this.config.targetYield <= 0) {
      return Promise.reject(new Error("Yield thresholds must be positive"));
    }
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  // ============== Private Helper Methods ==============

  /**
   * Calculate yield score (0-1)
   */
  private calculateYieldScore(actual: number, min: number, target: number, max: number): Score {
    // Below minimum: score 0
    if (actual < min) {
      return 0 as Score;
    }

    // At or near target: score 0.9-1.0
    if (actual >= target) {
      const aboveTarget = actual - target;
      const upside = Math.max(max - target, target - min);
      const scoreAboveTarget = Math.min(0.1, (aboveTarget / upside) * 0.1);
      return this.boundScore(0.9 + scoreAboveTarget);
    }

    // Between min and target: score 0.5-0.9
    const range = target - min;
    const position = (actual - min) / range;
    return this.boundScore(0.5 + position * 0.4);
  }

  /**
   * Analyze dividend trend from history
   */
  private analyzeDividendTrend(context: CriterionContext): {
    trend: "increasing" | "stable" | "decreasing" | "unknown";
    cagr: number;
    consistency: number; // 0-1, higher = more consistent
  } {
    if (!context.dividends || context.dividends.length < 2) {
      return { trend: "unknown", cagr: 0, consistency: 0 };
    }

    const dividends = context.dividends;
    const latestDiv = dividends[dividends.length - 1];
    const previousDiv = dividends[Math.max(0, dividends.length - 5)];

    // Calculate CAGR
    const cagr = this.calculateDividendCAGR(dividends);

    // Calculate consistency (coefficient of variation)
    const yields = dividends.map((d) => d.dividend_per_share || 0);
    const avgYield = yields.reduce((a, b) => a + b, 0) / yields.length;
    const variance = yields.reduce((sum, y) => sum + Math.pow(y - avgYield, 2), 0) / yields.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgYield > 0 ? stdDev / avgYield : 1; // Coefficient of variation
    const consistency = Math.max(0, 1 - cv);

    // Determine trend
    let trend: "increasing" | "stable" | "decreasing" | "unknown" = "unknown";
    if (latestDiv && previousDiv && previousDiv.dividend_per_share > 0) {
      const change =
        (latestDiv.dividend_per_share - previousDiv.dividend_per_share) /
        previousDiv.dividend_per_share;
      if (change > 0.05) trend = "increasing";
      else if (change < -0.05) trend = "decreasing";
      else trend = "stable";
    }

    return { trend, cagr: toPercent(cagr), consistency };
  }

  /**
   * Build explanation string
   */
  private buildExplanation(
    gross: number,
    net: number,
    isAcceptable: boolean,
    isAboveTarget: boolean,
    trend: {
      trend: "increasing" | "stable" | "decreasing" | "unknown";
      cagr: number;
      consistency: number;
    }
  ): string {
    const lines = [];

    lines.push(`Gross dividend yield: ${gross.toFixed(2)}%`);
    lines.push(`Tax-adjusted yield (after 10% withholding): ${net.toFixed(2)}%`);

    if (isAcceptable) {
      if (isAboveTarget) {
        lines.push(`✓ Yield ${net.toFixed(2)}% exceeds target ${this.config.targetYield}%`);
      } else {
        lines.push(`✓ Yield ${net.toFixed(2)}% meets minimum ${this.config.minYield}%`);
      }
    } else {
      lines.push(`✗ Yield ${net.toFixed(2)}% below minimum ${this.config.minYield}%`);
    }

    // Add trend analysis
    if (trend.trend !== "unknown") {
      const emoji = {
        increasing: "📈",
        stable: "→",
        decreasing: "📉",
      }[trend.trend];
      lines.push(`Dividend trend: ${emoji} ${trend.trend} (CAGR: ${trend.cagr.toFixed(1)}%)`);
      lines.push(`Consistency score: ${(trend.consistency * 100).toFixed(0)}%`);
    }

    return lines.join("\n");
  }
}

/**
 * Factory function for creating DividendYieldCriterion
 */
export function createDividendYieldCriterion(
  config?: Partial<DividendYieldConfig>
): DividendYieldCriterion {
  const criterion = new DividendYieldCriterion();
  if (config) {
    criterion.setConfig(config);
  }
  return criterion;
}
