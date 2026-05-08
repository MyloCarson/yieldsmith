import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Convert a ratio to a percentage without float drift.
 * e.g. toPercent(0.08) → 8 (not 8.000000000000001)
 */
export function toPercent(ratio: number): number {
  return new Decimal(ratio).times(100).toNumber();
}

/**
 * Safe division — returns 0 when divisor is zero.
 */
export function safeDiv(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return new Decimal(numerator).div(denominator).toNumber();
}

/**
 * Compound Annual Growth Rate.
 * Returns 0 for invalid inputs (non-positive start, non-positive years).
 */
export function calcCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || years <= 0) return 0;
  const result = new Decimal(endValue)
    .div(startValue)
    .pow(new Decimal(1).div(years))
    .minus(1)
    .toNumber();
  return Number.isFinite(result) ? result : 0;
}

/**
 * Round to a given number of decimal places.
 */
export function round(value: number, decimals: number = 2): number {
  return new Decimal(value).toDecimalPlaces(decimals).toNumber();
}

/**
 * Multiply two numbers precisely.
 * Useful for ratio * rate style calculations (e.g. yield * (1 - tax)).
 */
export function multiply(a: number, b: number): number {
  return new Decimal(a).times(b).toNumber();
}
