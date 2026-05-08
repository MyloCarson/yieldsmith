/**
 * Dividend Growth Criterion
 * Evaluates historical dividend growth rate
 *
 * Rationale:
 * - Dividend aristocrats have consistent annual increases
 * - CAGR > 5%: strong dividend growth
 * - CAGR 0-3%: stagnant dividends
 * - Key indicator of dividend sustainability and investor confidence
 */

import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { DividendCriterion } from "./base-criterion";

/**
 * Dividend Growth criterion configuration
 */
export interface DividendGrowthCriterionConfig {
  minGrowthCAGR: number; // Minimum CAGR (e.g., 0.03 for 3%)
  targetGrowthCAGR: number; // Target CAGR (e.g., 0.08 for 8%)
  maxGrowthCAGR: number; // Excellent above this (e.g., 0.15 for 15%)
}

/**
 * Dividend Growth Criterion Implementation
 */
export class DividendGrowthCriterion extends DividendCriterion {
  readonly name = "dividend_growth";
  readonly displayName = "Dividend Growth";
  readonly description = "Stock has demonstrated consistent dividend growth over time";
  readonly weight: Score = 0.12 as Score;

  private config: DividendGrowthCriterionConfig = {
    minGrowthCAGR: 0.03,
    targetGrowthCAGR: 0.08,
    maxGrowthCAGR: 0.15,
  };

  setConfig(config: Partial<DividendGrowthCriterionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  protected validateRequiredFields(context: CriterionContext): void {
    if (!context.dividends || context.dividends.length < 2) {
      throw new CriterionValidationError(this.name, ["dividends"]);
    }
  }

  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const cagr = this.calculateDividendCAGR(context.dividends || []);
    const isAcceptable = cagr >= this.config.minGrowthCAGR;
    const score = this.calculateGrowthScore(cagr);
    const explanation = this.buildExplanation(cagr, isAcceptable);

    return Promise.resolve(
      this.createEvaluation(
        context,
        isAcceptable,
        score,
        cagr * 100,
        explanation,
        this.getThresholds()
      )
    );
  }

  getThresholds(_context?: CriterionContext): CriterionThresholds {
    return {
      name: this.name,
      description: "Dividend CAGR (%)",
      min: this.config.minGrowthCAGR * 100,
      max: this.config.maxGrowthCAGR * 100,
      target: this.config.targetGrowthCAGR * 100,
      unit: "%",
    };
  }

  getLogicExplanation(): string {
    return `
Dividend Growth = Compound Annual Growth Rate of dividends per share

Ideal characteristics:
- ${(this.config.minGrowthCAGR * 100).toFixed(0)}%+: Minimum acceptable growth
- ${(this.config.targetGrowthCAGR * 100).toFixed(0)}%+: Target (strong compound returns)
- ${(this.config.maxGrowthCAGR * 100).toFixed(0)}%+: Dividend aristocrat level

Indicators of management confidence and dividend sustainability.
    `.trim();
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  private calculateGrowthScore(cagr: number): Score {
    const { minGrowthCAGR, targetGrowthCAGR, maxGrowthCAGR } = this.config;

    if (cagr < 0) return 0 as Score; // Declining dividends

    if (cagr < minGrowthCAGR) {
      return (Math.min(cagr / minGrowthCAGR, 1) * 0.5) as Score;
    }

    if (cagr >= targetGrowthCAGR) {
      if (cagr <= maxGrowthCAGR) {
        return this.boundScore(
          0.8 + ((cagr - targetGrowthCAGR) / (maxGrowthCAGR - targetGrowthCAGR)) * 0.2
        );
      }
      return 1 as Score; // Excellent growth
    }

    // Between min and target
    const range = targetGrowthCAGR - minGrowthCAGR;
    const position = (cagr - minGrowthCAGR) / range;
    return this.boundScore(0.5 + position * 0.3);
  }

  private buildExplanation(cagr: number, _isAcceptable: boolean): string {
    const cagrPercent = (cagr * 100).toFixed(1);
    return `
Dividend Growth (CAGR): ${cagrPercent}%
Target: ${(this.config.targetGrowthCAGR * 100).toFixed(0)}%

${
  cagr < 0
    ? "✗ Declining dividends - major red flag"
    : cagr < this.config.minGrowthCAGR
      ? "✗ Stagnant dividend - minimal growth"
      : cagr >= this.config.maxGrowthCAGR
        ? "✓✓ Dividend aristocrat - excellent growth"
        : "✓ Good dividend growth trajectory"
}
    `.trim();
  }
}

export function createDividendGrowthCriterion(
  config?: Partial<DividendGrowthCriterionConfig>
): DividendGrowthCriterion {
  const criterion = new DividendGrowthCriterion();
  if (config) criterion.setConfig(config);
  return criterion;
}
