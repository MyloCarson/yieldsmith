/**
 * Base Strategy Class
 * Abstract foundation for all strategy implementations
 *
 * Responsibilities:
 * - Encapsulate evaluation logic for each strategy type
 * - Manage criterion selection and weighting
 * - Generate composite recommendations from multiple criteria
 */

import { IStrategy, StrategyEvaluation, StrategyType, EvaluationContext } from "@core/strategy";
import { ICriterion, CriterionEvaluation } from "@core/criterion";
import { Score, StockSymbol } from "@/types/common";
import { StrategyError } from "@core/errors";

/**
 * Base strategy implementation
 */
export abstract class BaseStrategy implements IStrategy {
  abstract readonly id: StrategyType;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly recommendedHoldingPeriod: number; // days

  protected criteria: Map<string, { criterion: ICriterion; weight: Score }> = new Map();
  protected minPassingScore: Score = 0.6 as Score; // 60% minimum
  protected initialized = false;

  /**
   * Add criterion to strategy
   */
  addCriterion(criterion: ICriterion, weight: Score): void {
    if (weight < 0 || weight > 1) {
      throw new StrategyError(
        this.id,
        `Invalid criterion weight: ${weight}. Must be between 0 and 1.`
      );
    }
    this.criteria.set(criterion.name, { criterion, weight });
  }

  /**
   * Remove criterion from strategy
   */
  removeCriterion(criterionName: string): void {
    this.criteria.delete(criterionName);
  }

  /**
   * Get all criteria for this strategy
   */
  getCriteria(): ICriterion[] {
    return Array.from(this.criteria.values()).map((c) => c.criterion);
  }

  /**
   * Evaluate a stock against this strategy
   */
  abstract evaluate(context: EvaluationContext): Promise<StrategyEvaluation>;

  /**
   * Set minimum passing score threshold
   */
  setMinPassingScore(score: Score): void {
    if (score < 0 || score > 1) {
      throw new StrategyError(this.id, `Invalid minimum score: ${score}. Must be between 0 and 1.`);
    }
    this.minPassingScore = score;
  }

  /**
   * Initialize strategy
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize all criteria
    const initPromises = Array.from(this.criteria.values()).map((c) => c.criterion.initialize());
    await Promise.all(initPromises);

    this.initialized = true;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    const healthChecks = Array.from(this.criteria.values()).map((c) => c.criterion.isHealthy());
    const results = await Promise.all(healthChecks);
    return results.every((h) => h);
  }

  /**
   * Get strategy explanation
   */
  getExplanation(): string {
    const lines = [
      `Strategy: ${this.name}`,
      `Description: ${this.description}`,
      `Minimum Passing Score: ${(this.minPassingScore * 100).toFixed(0)}%`,
      `Recommended Holding Period: ${this.recommendedHoldingPeriod} days`,
      `\nCriteria (${this.criteria.size}):`,
    ];

    Array.from(this.criteria.values()).forEach(({ criterion, weight }) => {
      lines.push(`  - ${criterion.displayName} (weight: ${(weight * 100).toFixed(0)}%)`);
    });

    return lines.join("\n");
  }

  /**
   * Calculate weighted score from criterion evaluations
   */
  protected calculateWeightedScore(evaluations: CriterionEvaluation[]): Score {
    let totalWeight = 0;
    let weightedScore = 0;

    for (const evaluation of evaluations) {
      const entry = this.criteria.get(evaluation.criterionName);
      if (entry) {
        const weight = entry.weight;
        weightedScore += evaluation.score * weight;
        totalWeight += weight;
      }
    }

    // Normalize by total weight
    if (totalWeight === 0) return 0 as Score;
    return Math.min(1, weightedScore / totalWeight) as Score;
  }

  /**
   * Check if score meets passing threshold
   */
  protected isPassingScore(score: Score): boolean {
    return score >= this.minPassingScore;
  }

  /**
   * Build recommendation based on evaluations
   */
  protected buildRecommendationExplanation(
    symbol: StockSymbol,
    evaluations: CriterionEvaluation[],
    score: Score,
    isPassing: boolean
  ): string {
    const lines = [
      `${isPassing ? "✓ PASS" : "✗ FAIL"} - ${symbol}`,
      `Strategy Score: ${(score * 100).toFixed(1)}%`,
      `Minimum Required: ${(this.minPassingScore * 100).toFixed(0)}%`,
      "",
      "Criterion Results:",
    ];

    // Sort by score descending
    const sorted = [...evaluations].sort((a, b) => b.score - a.score);
    for (const evaluation of sorted) {
      const status = evaluation.passed ? "✓" : "✗";
      lines.push(
        `  ${status} ${evaluation.criterionName} (${(evaluation.score * 100).toFixed(0)}%)`
      );
    }

    return lines.join("\n");
  }

  /**
   * Ensure criteria weights sum to approximately 1.0
   * (Warning if significantly different)
   */
  protected validateWeights(): void {
    let totalWeight = 0;
    for (const { weight } of this.criteria.values()) {
      totalWeight += weight;
    }

    // Allow 5% tolerance for floating point
    if (Math.abs(totalWeight - 1.0) > 0.05) {
      console.warn(
        `Strategy ${this.id} criterion weights sum to ${totalWeight.toFixed(2)} instead of 1.0`
      );
    }
  }
}
