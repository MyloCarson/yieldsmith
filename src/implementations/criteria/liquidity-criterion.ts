/**
 * Liquidity Criterion
 * Evaluates stock trading volume and liquidity
 *
 * Rationale:
 * - High liquidity: easy to buy/sell without market impact
 * - Low liquidity: wide spreads, execution risk
 * - Average volume over 20 days: indicator of liquidity
 */

import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { RiskCriterion } from "./base-criterion";

/**
 * Liquidity criterion configuration
 */
export interface LiquidityCriterionConfig {
  minAvgVolume: number; // Minimum daily volume (e.g., 100000 shares)
  targetAvgVolume: number; // Target daily volume (e.g., 500000 shares)
}

/**
 * Liquidity Criterion Implementation
 */
export class LiquidityCriterion extends RiskCriterion {
  readonly name = "liquidity";
  readonly displayName = "Trading Liquidity";
  readonly description = "Stock has sufficient trading volume for easy entry/exit";
  readonly weight: Score = 0.05 as Score;

  private config: LiquidityCriterionConfig = {
    minAvgVolume: 100000,
    targetAvgVolume: 500000,
  };

  setConfig(config: Partial<LiquidityCriterionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  protected validateRequiredFields(context: CriterionContext): void {
    const extData = context.stockData as unknown as { averageDailyVolume?: number } | undefined;
    if (extData?.averageDailyVolume == null) {
      throw new CriterionValidationError(this.name, ["stockData.averageDailyVolume"]);
    }
  }

  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const volume = (context.stockData as unknown as { averageDailyVolume: number })
      .averageDailyVolume;
    const isAcceptable = volume >= this.config.minAvgVolume;
    const score: Score = this.calculateLiquidityScore(volume);
    const explanation = this.buildExplanation(volume, isAcceptable);

    return Promise.resolve(
      this.createEvaluation(context, isAcceptable, score, volume, explanation, this.getThresholds())
    );
  }

  getThresholds(_context?: CriterionContext): CriterionThresholds {
    return {
      name: this.name,
      description: "Average daily trading volume",
      min: this.config.minAvgVolume,
      max: this.config.targetAvgVolume * 5,
      target: this.config.targetAvgVolume,
      unit: "shares",
    };
  }

  getLogicExplanation(): string {
    return `
Liquidity = Average Daily Trading Volume

Thresholds:
- Below ${this.config.minAvgVolume.toLocaleString()}: Poor liquidity
- Above ${this.config.targetAvgVolume.toLocaleString()}: Good liquidity

Higher scores for volumes at or above target.
    `.trim();
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  private calculateLiquidityScore(volume: number): Score {
    const { minAvgVolume, targetAvgVolume } = this.config;

    if (volume < minAvgVolume) {
      return (Math.min(volume / minAvgVolume, 1) * 0.4) as Score;
    }

    if (volume >= targetAvgVolume) {
      const above = Math.min(volume / targetAvgVolume, 2);
      return this.boundScore(0.7 + (above - 1) * 0.15);
    }

    // Between min and target
    const range = targetAvgVolume - minAvgVolume;
    const position = (volume - minAvgVolume) / range;
    return this.boundScore(0.4 + position * 0.3);
  }

  private buildExplanation(volume: number, _isAcceptable: boolean): string {
    return `
Average Daily Volume: ${volume.toLocaleString()} shares
Minimum: ${this.config.minAvgVolume.toLocaleString()}
Target: ${this.config.targetAvgVolume.toLocaleString()}

${
  volume < this.config.minAvgVolume
    ? "✗ Low liquidity - Difficult to buy/sell at desired prices"
    : volume >= this.config.targetAvgVolume
      ? "✓ Excellent liquidity - Easy entry/exit"
      : "✓ Acceptable liquidity"
}
    `.trim();
  }
}

export function createLiquidityCriterion(
  config?: Partial<LiquidityCriterionConfig>
): LiquidityCriterion {
  const criterion = new LiquidityCriterion();
  if (config) criterion.setConfig(config);
  return criterion;
}
