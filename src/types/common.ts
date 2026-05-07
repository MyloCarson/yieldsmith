/**
 * Common types and utilities shared across Yieldsmith
 * These are foundational types used by multiple domains
 */

/**
 * Standard UUID type (from Supabase)
 */
export type UUID = string & { readonly __brand: "UUID" };

/**
 * Telegram user ID (BIGINT in database)
 */
export type TelegramUserId = number & { readonly __brand: "TelegramUserId" };

/**
 * Stock market symbol (e.g., "ZENITHBANK", "AAPL")
 */
export type StockSymbol = string & { readonly __brand: "StockSymbol" };

/**
 * Market identifier (e.g., "ngx", "us_stocks")
 */
export type MarketId = string & { readonly __brand: "MarketId" };

/**
 * API key/token type (sensitive, should be treated carefully)
 */
export type ApiKey = string & { readonly __brand: "ApiKey" };

/**
 * Currency code (e.g., "NGN", "USD")
 */
export type CurrencyCode = "NGN" | "USD" | "EUR" | "GBP";

/**
 * Confidence levels for recommendations
 */
export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Score from 0.0 to 1.0 (perfect)
 */
export type Score = number & { readonly __brand: "Score" };

/**
 * Percentage value (0-100)
 */
export type Percentage = number & { readonly __brand: "Percentage" };

/**
 * Money amount in a specific currency
 */
export interface Money {
  amount: number;
  currency: CurrencyCode;
}

/**
 * Date without time component
 */
export type DateOnly = string; // YYYY-MM-DD format

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Filter options for queries
 */
export interface FilterOptions {
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Standard success response wrapper
 */
export interface SuccessResponse<T> {
  data: T;
  timestamp: string;
  requestId?: string;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Metadata that can be stored in JSONB columns
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
