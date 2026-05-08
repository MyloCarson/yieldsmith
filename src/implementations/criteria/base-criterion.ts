/**
 * Base Criterion Class
 * Abstract base that all concrete criterion implementations extend
 *
 * Provides:
 * - Common evaluation pattern
 * - Data validation
 * - Metadata collection
 * - Health checking
 */

import {
  ICriterion,
  CriterionCategory,
  CriterionContext,
  CriterionEvaluation,
  CriterionMetadata,
  CriterionThresholds,
  CriterionDividend,
} from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { calcCAGR, safeDiv, toPercent, round as decRound } from "@/utils/math";

/**
 * Abstract base class for all criteria
 */
export abstract class BaseCriterion implements ICriterion {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly category: CriterionCategory;
  abstract readonly description: string;
  abstract readonly weight: Score; // 0-1

  /**
   * Validate criterion context has required data
   * Override in subclasses to add specific validation
   */
  validateContext(context: CriterionContext): void {
    if (!context.symbol || !context.marketId) {
      throw new CriterionValidationError(this.name, ["symbol", "marketId"]);
    }

    // Subclasses override to check for specific required fields
    this.validateRequiredFields(context);
  }

  /**
   * Evaluate criterion against stock data
   * Subclasses must implement this
   */
  abstract evaluate(context: CriterionContext): Promise<CriterionEvaluation>;

  /**
   * Get criterion metadata
   * Override in subclasses to provide criterion-specific metadata
   */
  getMetadata(context: CriterionContext): CriterionMetadata {
    return {
      category: this.category,
      evaluationType: "standard",
      hasHistoricalData: this.hasHistoricalData(context),
      dataPoints: this.getDataPoints(context),
      confidence: "medium",
    };
  }

  /**
   * Get criterion thresholds (min/max values)
   * Subclasses override to provide specific thresholds
   */
  abstract getThresholds(context?: CriterionContext): CriterionThresholds;

  /**
   * Get human-readable explanation of criterion logic
   */
  abstract getLogicExplanation(): string;

  /**
   * Initialize criterion (fetch config, validate setup, etc.)
   */
  initialize(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Check if criterion is healthy and ready to use
   */
  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * Validate required fields in context
   * Subclasses override to check for criterion-specific fields
   */
  protected validateRequiredFields(_context: CriterionContext): void {
    // Base class checks minimal fields
    // Subclasses add their specific requirements
  }

  /**
   * Check if context has historical data
   */
  protected hasHistoricalData(context: CriterionContext): boolean {
    return !!(context.historical && (context.historical.priceHistory?.length || 0) > 0);
  }

  /**
   * Get number of data points available
   */
  protected getDataPoints(context: CriterionContext): number {
    let count = 0;
    if (context.stockData) count += 3; // symbol, price, sector
    if (context.financials) count += 8; // major financial metrics
    if (context.dividends && context.dividends.length) count += context.dividends.length;
    if (context.technical) count += 3; // RSI, MACD, etc
    if (context.historical?.priceHistory) count += context.historical.priceHistory.length;
    return count;
  }

  /**
   * Calculate confidence score based on data availability
   * 0-1 scale, where 1 is very confident
   */
  protected calculateConfidence(dataPoints: number, minRequired: number = 5): Score {
    if (dataPoints < minRequired) return 0.3 as Score;
    if (dataPoints < minRequired * 2) return 0.6 as Score;
    return 0.95 as Score;
  }

  /**
   * Safe score calculation with bounds
   */
  protected boundScore(value: number): Score {
    return Math.max(0, Math.min(1, value)) as Score;
  }

  /**
   * Safe percentage calculation
   */
  protected safePercent(actual: number, expected: number): number {
    return toPercent(safeDiv(actual, expected));
  }

  /**
   * Format score as percentage
   */
  protected formatScore(score: Score): string {
    return `${(score * 100).toFixed(1)}%`;
  }

  /**
   * Build criterion evaluation result
   */
  protected createEvaluation(
    context: CriterionContext,
    passed: boolean,
    score: Score,
    actualValue: number,
    explanation: string,
    thresholds?: CriterionThresholds
  ): CriterionEvaluation {
    return {
      criterionName: this.name,
      criterionDisplayName: this.displayName,
      symbol: context.symbol,
      marketId: context.marketId,
      asOfDate: context.asOfDate,
      passed,
      score,
      actualValue,
      thresholdMin: thresholds?.min,
      thresholdMax: thresholds?.max,
      explanation,
      metadata: this.getMetadata(context),
      confidence: this.calculateConfidence(this.getDataPoints(context)),
    };
  }

  /**
   * Validate numeric range
   */
  protected isInRange(value: number, min?: number, max?: number): boolean {
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  }

  /**
   * Round number to decimal places
   */
  protected round(value: number, decimals: number = 2): number {
    return decRound(value, decimals);
  }
}

/**
 * Dividend-focused criterion base class
 * Extends BaseCriterion with dividend-specific helpers
 */
export abstract class DividendCriterion extends BaseCriterion {
  readonly category: CriterionCategory = "dividend";

  /**
   * Get latest dividend from context
   */
  protected getLatestDividend(context: CriterionContext): CriterionDividend | null {
    if (!context.dividends || context.dividends.length === 0) {
      return null;
    }
    return context.dividends[context.dividends.length - 1];
  }

  /**
   * Calculate dividend CAGR (Compound Annual Growth Rate)
   */
  protected calculateDividendCAGR(dividends: CriterionDividend[]): number {
    if (dividends.length < 2) return 0;

    const oldest = dividends[0];
    const newest = dividends[dividends.length - 1];

    if (!oldest || !newest || oldest.dividend_per_share <= 0) {
      return 0;
    }

    const years = Math.max(1, dividends.length / 4); // Assume quarterly dividends
    return calcCAGR(oldest.dividend_per_share, newest.dividend_per_share, years);
  }

  /**
   * Check if dividend is sustainable based on payout ratio
   */
  protected isDividendSustainable(
    payoutRatio: number,
    threshold: number = 0.75 // 75% threshold
  ): boolean {
    return payoutRatio <= threshold;
  }
}

/**
 * Financial/valuation criterion base class
 */
export abstract class ValuationCriterion extends BaseCriterion {
  readonly category: CriterionCategory = "valuation";

  /**
   * Calculate PEG ratio (P/E divided by growth rate)
   */
  protected calculatePEG(peRatio: number, earningsGrowth: number): number {
    if (earningsGrowth <= 0) return Infinity;
    return safeDiv(peRatio, toPercent(earningsGrowth));
  }

  /**
   * Check if stock is undervalued
   */
  protected isUndervalued(current: number, fair: number, tolerance: number = 0.1): boolean {
    return current < fair * (1 - tolerance);
  }

  /**
   * Check if stock is overvalued
   */
  protected isOvervalued(current: number, fair: number, tolerance: number = 0.1): boolean {
    return current > fair * (1 + tolerance);
  }
}

/**
 * Technical analysis criterion base class
 */
export abstract class TechnicalCriterion extends BaseCriterion {
  readonly category: CriterionCategory = "technical";

  /**
   * Determine trend direction from moving averages
   */
  protected determineTrend(
    price: number,
    ma20: number,
    ma50: number,
    ma200: number
  ): "up" | "down" | "neutral" {
    const bullishSignals = [price > ma20, ma20 > ma50, ma50 > ma200].filter(Boolean).length;

    if (bullishSignals >= 2) return "up";
    if (bullishSignals === 0) return "down";
    return "neutral";
  }

  /**
   * Determine momentum from RSI
   */
  protected getMomentumFromRSI(
    rsi: number
  ): "strong_up" | "up" | "neutral" | "down" | "strong_down" {
    if (rsi > 70) return "strong_up";
    if (rsi > 55) return "up";
    if (rsi < 30) return "strong_down";
    if (rsi < 45) return "down";
    return "neutral";
  }
}

/**
 * Growth-focused criterion base class
 */
export abstract class GrowthCriterion extends BaseCriterion {
  readonly category: CriterionCategory = "growth";

  /**
   * Calculate compound annual growth rate
   */
  protected calculateCAGR(startValue: number, endValue: number, years: number): number {
    return calcCAGR(startValue, endValue, years);
  }

  /**
   * Calculate growth acceleration (YoY improvement)
   */
  protected calculateGrowthAcceleration(previousGrowth: number, currentGrowth: number): number {
    if (previousGrowth === 0) return currentGrowth > 0 ? 1 : 0;
    return (currentGrowth - previousGrowth) / Math.abs(previousGrowth);
  }
}

/**
 * Risk-focused criterion base class
 */
export abstract class RiskCriterion extends BaseCriterion {
  readonly category: CriterionCategory = "risk";

  /**
   * Normalize volatility to 0-1 scale
   */
  protected normalizeVolatility(volatility: number, maxVolatility: number = 1.0): Score {
    return this.boundScore(1 - volatility / maxVolatility);
  }

  /**
   * Calculate debt sustainability
   */
  protected isDebtSustainable(
    debtToEquity: number,
    interestCoverage: number,
    threshold: number = 2.0
  ): boolean {
    return interestCoverage > threshold && debtToEquity < 2.0;
  }
}
