/**
 * Earnings Growth Criterion
 * Evaluates company's historical earnings growth rate
 *
 * Rationale:
 * - CAGR (Compound Annual Growth Rate) over past 3-5 years
 * - Growth > 10% annually: strong value creation
 * - Growth 0-5%: mature/stagnant company
 * - Negative growth: declining profitability (red flag)
 */

import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { GrowthCriterion } from "./base-criterion";

/**
 * Earnings Growth criterion configuration
 */
export interface EarningsGrowthCriterionConfig {
  minGrowthCAGR: number; // Minimum CAGR (e.g., 0.02 for 2%)
  targetGrowthCAGR: number; // Target CAGR (e.g., 0.08 for 8%)
  maxGrowthCAGR: number; // Above this is excellent (e.g., 0.20 for 20%)
}

/**
 * Earnings Growth Criterion Implementation
 */
export class EarningsGrowthCriterion extends GrowthCriterion {
  readonly name = "earnings_growth";
  readonly displayName = "Earnings Growth";
  readonly description = "Company demonstrates consistent earnings growth";
  readonly weight: Score = 0.1 as Score;

  private config: EarningsGrowthCriterionConfig = {
    minGrowthCAGR: 0.02,
    targetGrowthCAGR: 0.08,
    maxGrowthCAGR: 0.2,
  };

  setConfig(config: Partial<EarningsGrowthCriterionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  protected validateRequiredFields(context: CriterionContext): void {
    const extCtx = context as unknown as { financialHistory?: Array<{ netIncome: number }> };
    if (!extCtx.financialHistory || extCtx.financialHistory.length < 2) {
      throw new CriterionValidationError(this.name, ["financialHistory"]);
    }
  }

  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const extCtx = context as unknown as { financialHistory?: Array<{ netIncome: number }> };
    const history = extCtx.financialHistory ?? [];
    const years = Math.max(1, history.length - 1);
    const startValue = history[0]?.netIncome ?? 0;
    const endValue = history[history.length - 1]?.netIncome ?? 0;
    const cagr = this.calculateCAGR(startValue, endValue, years);
    const isAcceptable = cagr >= this.config.minGrowthCAGR;
    const score: Score = this.calculateGrowthScore(cagr);
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
      description: "Earnings CAGR (%)",
      min: this.config.minGrowthCAGR * 100,
      max: this.config.maxGrowthCAGR * 100,
      target: this.config.targetGrowthCAGR * 100,
      unit: "%",
    };
  }

  getLogicExplanation(): string {
    return `
Earnings Growth = Compound Annual Growth Rate (CAGR) of net income

Target ranges:
- Below ${(this.config.minGrowthCAGR * 100).toFixed(0)}%: Stagnant or declining
- ${(this.config.minGrowthCAGR * 100).toFixed(0)}%-${(this.config.targetGrowthCAGR * 100).toFixed(0)}%: Acceptable
- Above ${(this.config.targetGrowthCAGR * 100).toFixed(0)}%: Strong growth
- Above ${(this.config.maxGrowthCAGR * 100).toFixed(0)}%: Excellent growth
    `.trim();
  }

  initialize(): Promise<void> {
    if (this.config.minGrowthCAGR >= this.config.targetGrowthCAGR) {
      return Promise.reject(new Error("Min growth cannot exceed target"));
    }
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  private calculateGrowthScore(cagr: number): Score {
    const { minGrowthCAGR, targetGrowthCAGR, maxGrowthCAGR } = this.config;

    if (cagr < 0) return 0 as Score; // Negative earnings growth

    if (cagr < minGrowthCAGR) {
      const range = minGrowthCAGR;
      return (Math.min(cagr / range, 1) * 0.4) as Score;
    }

    if (cagr >= targetGrowthCAGR && cagr <= maxGrowthCAGR) {
      const aboveTarget = cagr - targetGrowthCAGR;
      const range = maxGrowthCAGR - targetGrowthCAGR;
      return this.boundScore(0.75 + (aboveTarget / range) * 0.25);
    }

    if (cagr > maxGrowthCAGR) {
      // Excellent, cap at 1.0
      return 1 as Score;
    }

    // Between min and target
    const range = targetGrowthCAGR - minGrowthCAGR;
    const position = (cagr - minGrowthCAGR) / range;
    return this.boundScore(0.4 + position * 0.35);
  }

  private buildExplanation(cagr: number, _isAcceptable: boolean): string {
    const cagrPercent = (cagr * 100).toFixed(1);
    return `
Earnings Growth (CAGR): ${cagrPercent}%
Target: ${(this.config.targetGrowthCAGR * 100).toFixed(0)}%

${
  cagr < 0
    ? "✗ Negative earnings growth - declining profitability"
    : cagr < this.config.minGrowthCAGR
      ? "✗ Stagnant earnings - minimal growth"
      : cagr >= this.config.maxGrowthCAGR
        ? "✓✓ Excellent growth rate"
        : "✓ Acceptable earnings growth"
}
    `.trim();
  }
}

export function createEarningsGrowthCriterion(
  config?: Partial<EarningsGrowthCriterionConfig>
): EarningsGrowthCriterion {
  const criterion = new EarningsGrowthCriterion();
  if (config) criterion.setConfig(config);
  return criterion;
}
