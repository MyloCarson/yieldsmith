/**
 * Market Interface
 * Abstract contract for all market implementations (NGX, NYSE, LSE, etc.)
 */

import { StockSymbol } from "@/types/common";

/**
 * Shared health check result used across all provider types
 */
export interface HealthCheckResult {
  healthy: boolean;
  status: "operational" | "degraded" | "down";
  lastCheck: Date;
  responseTime?: number;
  error?: string;
  configValid?: boolean;
  authenticated?: boolean;
}

/**
 * Trading hours for a market session
 */
export interface MarketHours {
  openTime: { hour: number; minute: number };
  closeTime: { hour: number; minute: number };
  daysOpen: number[]; // ISO weekdays: 1=Monday, 7=Sunday
}

/**
 * Base market configuration
 */
export interface MarketConfig {
  timezone: string;
  currency: string;
  decimalPlaces: number;
  tickSize: number;
  minTradeAmount: number;
  transactionCostPercent: number;
  withholdingTaxRate: number;
}

/**
 * Market feature capabilities
 */
export interface MarketCapabilities {
  supportsPreMarket: boolean;
  supportsAfterHours: boolean;
  supportsPartialFills: boolean;
  supportsConditionalOrders: boolean;
  supportsDividendReinvestment: boolean;
  supportsShortSelling: boolean;
  supportsOptionsTrading: boolean;
  supportsMarginTrading: boolean;
  maxOrderSize: number;
  minOrderSize: number;
  settlementDays: number;
  currencies: string[];
  decimalPlaces: number;
}

/**
 * Market implementation contract
 */
export interface IMarket {
  readonly id: string;
  readonly name: string;
  readonly country: string;
  readonly currency: string;
  readonly timezone: string;

  isConfigured(): boolean;
  isOpenAt(timestamp: Date): boolean;
  getTradingHours(date: Date): MarketHours;
  getOpenTime(date: Date): Date;
  getCloseTime(date: Date): Date;
  getNextTradingDay(fromDate: Date): Date;
  getPreviousTradingDay(fromDate: Date): Date;
  isHoliday(date: Date): boolean;
  getHolidays(year: number): Date[];
  isValidSymbol(symbol: StockSymbol): boolean;
  formatSymbol(symbol: StockSymbol): StockSymbol;
  getWithholdingTaxRate(symbol?: StockSymbol): number;
  getTransactionCosts(
    symbol: StockSymbol,
    amount: number
  ): {
    brokerCommission: number;
    totalCost: number;
    costPercentage: number;
  };
  getMinimumTradeAmount(symbol?: StockSymbol): number;
  getTickSize(symbol?: StockSymbol): number;
  validateStock(
    symbol: StockSymbol,
    sector?: string
  ): Promise<{
    valid: boolean;
    reason?: string;
    alternativeSuggestions?: StockSymbol[];
  }>;
  initialize(): Promise<void>;
  healthCheck(timeoutMs?: number): Promise<HealthCheckResult>;
  getCapabilities(): MarketCapabilities;
}

/**
 * Market factory contract
 */
export interface IMarketFactory {
  createProvider(marketId: string): Promise<IMarket>;
  getDefaultProvider(): Promise<IMarket>;
  getAllProviders(): Promise<IMarket[]>;
  registerProvider(provider: IMarket): void;
  getProvider(marketId: string): Promise<IMarket | null>;
  getFallbackProvider(primaryId: string): Promise<IMarket | null>;
}
