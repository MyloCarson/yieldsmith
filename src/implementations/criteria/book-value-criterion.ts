/**
 * Book Value Criterion
 * Evaluates Price-to-Book (P/B) ratio for value investing
 *
 * Rationale:
 * - P/B = Market Cap / Total Equity
 * - P/B < 1: trading below book value (potential value)
 * - P/B 1-3: reasonable for growth stocks
 * - P/B > 3: premium valuation, expect strong growth
 */

import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { ValuationCriterion } from "./base-criterion";

/**
 * Book Value criterion configuration
 */
export interface BookValueCriterionConfig {
  maxPB: number; // Maximum P/B (e.g., 3.0)
  targetPB: number; // Target P/B (e.g., 1.5)
  minPB: number; // Minimum P/B (e.g., 0.5)
}

/**
 * Book Value Criterion Implementation
 */
export class BookValueCriterion extends ValuationCriterion {
  readonly name = "book_value";
  readonly displayName = "Price-to-Book Ratio";
  readonly description = "Stock price is reasonable relative to book value";
  readonly weight: Score = 0.08 as Score;

  private config: BookValueCriterionConfig = {
    maxPB: 3.0,
    targetPB: 1.5,
    minPB: 0.5,
  };

  setConfig(config: Partial<BookValueCriterionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  protected validateRequiredFields(context: CriterionContext): void {
    const missingFields: string[] = [];
    if (context.stockData?.price == null) missingFields.push("stockData.price");
    if (context.stockData?.bookValue == null) missingFields.push("stockData.bookValue");
    if (missingFields.length > 0) {
      throw new CriterionValidationError(this.name, missingFields);
    }
  }

  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const stockData = context.stockData!;
    const price = stockData.price;
    const bookValue = stockData.bookValue!;

    if (bookValue <= 0) {
      return Promise.resolve(
        this.createEvaluation(
          context,
          false,
          0 as Score,
          0,
          "Cannot calculate P/B: book value is zero or negative",
          this.getThresholds()
        )
      );
    }

    const pb = price / bookValue;
    const isAcceptable = pb >= this.config.minPB && pb <= this.config.maxPB;
    const score: Score = this.calculatePBScore(pb);
    const explanation = this.buildExplanation(pb, isAcceptable);

    return Promise.resolve(
      this.createEvaluation(context, isAcceptable, score, pb, explanation, this.getThresholds())
    );
  }

  getThresholds(_context?: CriterionContext): CriterionThresholds {
    return {
      name: this.name,
      description: "Price-to-Book ratio",
      min: this.config.minPB,
      max: this.config.maxPB,
      target: this.config.targetPB,
      unit: "x",
    };
  }

  getLogicExplanation(): string {
    return `
Price-to-Book (P/B) = Share Price ÷ Book Value Per Share

Valuation levels:
- Below ${this.config.minPB}x: Potential value (or red flag)
- ${this.config.minPB}x-${this.config.targetPB}x: Reasonable value
- ${this.config.targetPB}x-${this.config.maxPB}x: Growth premium
- Above ${this.config.maxPB}x: Expensive valuation
    `.trim();
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  private calculatePBScore(pb: number): Score {
    const { minPB, targetPB, maxPB } = this.config;

    if (pb < minPB) {
      const belowMin = minPB - pb;
      const scoreDecay = Math.max(0.2, 1 - belowMin / minPB);
      return (scoreDecay * 0.5) as Score;
    }

    if (pb >= targetPB && pb <= maxPB) {
      const aboveTarget = pb - targetPB;
      const range = maxPB - targetPB;
      return this.boundScore(0.8 + (aboveTarget / range) * 0.2);
    }

    if (pb > maxPB) {
      const aboveMax = pb - maxPB;
      const decay = Math.max(0.4, 1 - aboveMax / (maxPB * 2));
      return this.boundScore(0.5 * decay);
    }

    // Between min and target
    const range = targetPB - minPB;
    const position = (pb - minPB) / range;
    return this.boundScore(0.5 + position * 0.3);
  }

  private buildExplanation(pb: number, _isAcceptable: boolean): string {
    return `
Price-to-Book: ${pb.toFixed(2)}x
Target Range: ${this.config.minPB.toFixed(1)}x-${this.config.maxPB.toFixed(1)}x

${
  pb < this.config.minPB
    ? "⚠ Below minimum - Check for value trap"
    : pb > this.config.maxPB
      ? "✗ Above maximum - Expensive valuation"
      : "✓ Within acceptable range"
}
    `.trim();
  }
}

export function createBookValueCriterion(
  config?: Partial<BookValueCriterionConfig>
): BookValueCriterion {
  const criterion = new BookValueCriterion();
  if (config) criterion.setConfig(config);
  return criterion;
}
