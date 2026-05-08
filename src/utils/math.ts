import Decimal from "decimal.js";

// Scoped instance — avoids mutating the global Decimal config as a side effect.
const financialDecimal = Decimal.clone({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Convert a ratio to a percentage without float drift.
 * e.g. toPercent(0.08) → 8 (not 8.000000000000001)
 */
export function toPercent(ratio: number): number {
  return new financialDecimal(ratio).times(100).toNumber();
}

/**
 * Safe division — returns 0 when divisor is zero.
 */
export function safeDiv(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return new financialDecimal(numerator).div(denominator).toNumber();
}

/**
 * Compound Annual Growth Rate.
 * Returns 0 for invalid inputs (non-positive start, non-positive years).
 * Returns -1 when endValue is negative (full-loss sentinel) to keep
 * criterion evaluation resilient against sign-change edge cases.
 */
export function calcCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || years <= 0) return 0;
  if (endValue < 0) return -1;
  const result = new financialDecimal(endValue)
    .div(startValue)
    .pow(new financialDecimal(1).div(years))
    .minus(1)
    .toNumber();
  return Number.isFinite(result) ? result : 0;
}

/**
 * Round to a given number of decimal places.
 */
export function round(value: number, decimals: number = 2): number {
  return new financialDecimal(value).toDecimalPlaces(decimals).toNumber();
}

/**
 * Multiply two numbers precisely.
 * Useful for ratio * rate style calculations (e.g. yield * (1 - tax)).
 */
export function multiply(a: number, b: number): number {
  return new financialDecimal(a).times(b).toNumber();
}
