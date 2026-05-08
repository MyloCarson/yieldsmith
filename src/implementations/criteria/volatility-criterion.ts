/**
 * Volatility Criterion
 * Evaluates stock price volatility (standard deviation of returns)
 *
 * Rationale:
 * - High volatility increases risk
 * - For dividend investors, prefer lower volatility (safer)
 * - Volatility > 30% p.a.: high risk
 * - Volatility < 15% p.a.: low risk (blue chip)
 */

import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { RiskCriterion } from "./base-criterion";
import { toPercent } from "@/utils/math";

/**
 * Volatility criterion configuration
 */
export interface VolatilityCriterionConfig {
  maxVolatility: number; // Maximum acceptable (e.g., 0.35 for 35%)
  targetVolatility: number; // Target (e.g., 0.20 for 20%)
  minVolatility: number; // Minimum (e.g., 0.05 for 5%)
}

/**
 * Volatility Criterion Implementation
 */
export class VolatilityCriterion extends RiskCriterion {
  readonly name = "volatility";
  readonly displayName = "Price Volatility";
  readonly description = "Stock has acceptable price volatility for dividend investor";
  readonly weight: Score = 0.08 as Score;

  private config: VolatilityCriterionConfig = {
    maxVolatility: 0.35,
    targetVolatility: 0.2,
    minVolatility: 0.05,
  };

  setConfig(config: Partial<VolatilityCriterionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  protected validateRequiredFields(context: CriterionContext): void {
    const extData = context.stockData as unknown as { volatility?: number } | undefined;
    if (extData?.volatility == null) {
      throw new CriterionValidationError(this.name, ["stockData.volatility"]);
    }
  }

  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const volatility = (context.stockData as unknown as { volatility: number }).volatility;
    const isAcceptable = volatility <= this.config.maxVolatility;
    const score: Score = this.calculateVolatilityScore(volatility);
    const explanation = this.buildExplanation(volatility, isAcceptable);

    return Promise.resolve(
      this.createEvaluation(
        context,
        isAcceptable,
        score,
        toPercent(volatility),
        explanation,
        this.getThresholds()
      )
    );
  }

  getThresholds(_context?: CriterionContext): CriterionThresholds {
    return {
      name: this.name,
      description: "Annualized volatility (%)",
      min: toPercent(this.config.minVolatility),
      max: toPercent(this.config.maxVolatility),
      target: toPercent(this.config.targetVolatility),
      unit: "%",
    };
  }

  getLogicExplanation(): string {
    return `
Stock Volatility = Annualized standard deviation of returns

Risk assessment:
- Below ${(this.config.targetVolatility * 100).toFixed(0)}%: Low volatility (blue chip)
- ${(this.config.targetVolatility * 100).toFixed(0)}%-${(this.config.maxVolatility * 100).toFixed(0)}%: Moderate risk
- Above ${(this.config.maxVolatility * 100).toFixed(0)}%: High volatility (risky)
    `.trim();
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  private calculateVolatilityScore(volatility: number): Score {
    const { minVolatility, targetVolatility, maxVolatility } = this.config;

    // Very stable stocks: score decreases (less volatility is better)
    if (volatility < targetVolatility) {
      const belowTarget = targetVolatility - volatility;
      const range = targetVolatility - minVolatility;
      return this.boundScore(0.7 + (belowTarget / range) * 0.3);
    }

    // Above target but acceptable
    if (volatility <= maxVolatility) {
      const aboveTarget = volatility - targetVolatility;
      const range = maxVolatility - targetVolatility;
      return this.boundScore(Math.max(0.4, 0.7 - (aboveTarget / range) * 0.3));
    }

    // Above max: high risk
    const aboveMax = volatility - maxVolatility;
    const riskFactor = Math.max(0.1, 1 - aboveMax / maxVolatility);
    return this.boundScore(0.3 * riskFactor);
  }

  private buildExplanation(volatility: number, _isAcceptable: boolean): string {
    const volPercent = (volatility * 100).toFixed(1);
    return `
Annualized Volatility: ${volPercent}%
Target: ${(this.config.targetVolatility * 100).toFixed(0)}%

${
  volatility <= this.config.targetVolatility
    ? "✓ Low volatility - Stable, suitable for risk-averse investors"
    : volatility <= this.config.maxVolatility
      ? "⚠ Moderate-high volatility - Acceptable but with more risk"
      : "✗ High volatility - Significant price swings, risky for dividend income"
}
    `.trim();
  }
}

export function createVolatilityCriterion(
  config?: Partial<VolatilityCriterionConfig>
): VolatilityCriterion {
  const criterion = new VolatilityCriterion();
  if (config) criterion.setConfig(config);
  return criterion;
}
