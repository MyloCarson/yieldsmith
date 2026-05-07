/**
 * MarketNGX Implementation
 * Concrete implementation of IMarket for the Nigerian Exchange (NGX)
 *
 * Handles:
 * - Trading hours: Mon-Fri 10:00-16:00 WAT
 * - Holidays and half-days
 * - Symbol validation (NGX format)
 * - Transaction costs and withholding tax
 * - Tick size and minimum trade amounts
 */

import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import {
  IMarket,
  IMarketFactory,
  MarketHours,
  MarketCapabilities,
  HealthCheckResult,
} from "@core/market";
import { StockSymbol } from "@/types/common";
import {
  MarketClosedError,
  InvalidSymbolError,
  ConfigurationError,
  TimeoutError,
} from "@core/errors";

/**
 * NGX market configuration
 */
export interface MarketNGXConfig {
  timezone: string;
  currency: string;
  decimalPlaces: number;
  tickSize: number;
  minTradeAmount: number;
  transactionCostPercent: number;
  withholdingTaxRate: number;
}

/**
 * WAT time components extracted from a Date
 */
interface WATComponents {
  hour: number;
  minute: number;
  isoDay: number;
  dateStr: string;
}

/**
 * NGX implementation of IMarket
 */
export class MarketNGX implements IMarket {
  readonly id = "ngx";
  readonly name = "Nigerian Exchange Group";
  readonly country = "Nigeria";
  readonly currency = "NGN";
  readonly timezone = "Africa/Lagos";

  private config: MarketNGXConfig;
  private cachedHealthResult: HealthCheckResult | null = null;

  // Trading hours: Mon-Fri 10:00-16:00 WAT
  private readonly TRADING_HOURS: MarketHours = {
    openTime: { hour: 10, minute: 0 },
    closeTime: { hour: 16, minute: 0 },
    daysOpen: [1, 2, 3, 4, 5], // ISO: 1=Monday
  };

  // NGX holidays 2026
  private readonly HOLIDAYS_2026 = new Set([
    "2026-01-01",
    "2026-01-26",
    "2026-03-28",
    "2026-04-10",
    "2026-04-13",
    "2026-05-01",
    "2026-06-12",
    "2026-08-27",
    "2026-12-25",
    "2026-12-26",
  ]);

  // Half-days (10:00-12:00 WAT)
  private readonly HALF_DAYS_2026 = new Set(["2026-12-24", "2026-12-31"]);

  // Valid NGX symbols: 3-4 uppercase letters (e.g., MTNN, BUA, ETI)
  private readonly VALID_SYMBOL_PATTERN = /^[A-Z]{3,4}$/;

  constructor(config: Partial<MarketNGXConfig> = {}) {
    this.config = {
      timezone: "Africa/Lagos",
      currency: "NGN",
      decimalPlaces: 2,
      tickSize: 0.01,
      minTradeAmount: 5000,
      transactionCostPercent: 0.1,
      withholdingTaxRate: 0.1,
      ...config,
    };
  }

  isConfigured(): boolean {
    return !!(this.config.currency && this.config.timezone);
  }

  isOpenAt(timestamp: Date): boolean {
    const { hour, minute, isoDay, dateStr } = this.getWATComponents(timestamp);

    if (!this.TRADING_HOURS.daysOpen.includes(isoDay)) return false;
    if (this.HOLIDAYS_2026.has(dateStr)) return false;

    const timeInMinutes = hour * 60 + minute;
    const { openTime, closeTime } = this.getSessionHours(dateStr, isoDay);
    const openMinutes = openTime.hour * 60 + openTime.minute;
    const closeMinutes = closeTime.hour * 60 + closeTime.minute;

    return timeInMinutes >= openMinutes && timeInMinutes <= closeMinutes;
  }

  getTradingHours(date: Date): MarketHours {
    const { isoDay, dateStr } = this.getWATComponents(date);

    if (this.HOLIDAYS_2026.has(dateStr)) {
      return { openTime: { hour: 0, minute: 0 }, closeTime: { hour: 0, minute: 0 }, daysOpen: [] };
    }

    if (!this.TRADING_HOURS.daysOpen.includes(isoDay)) {
      return { openTime: { hour: 0, minute: 0 }, closeTime: { hour: 0, minute: 0 }, daysOpen: [] };
    }

    const { openTime, closeTime } = this.getSessionHours(dateStr, isoDay);
    return { openTime, closeTime, daysOpen: [isoDay] };
  }

  getOpenTime(date: Date): Date {
    const { dateStr } = this.getWATComponents(date);
    const hours = this.getTradingHours(date);
    if (hours.daysOpen.length === 0) {
      throw new MarketClosedError(`Market not open on ${dateStr}`);
    }
    return this.createDateInWAT(dateStr, hours.openTime.hour, hours.openTime.minute);
  }

  getCloseTime(date: Date): Date {
    const { dateStr } = this.getWATComponents(date);
    const hours = this.getTradingHours(date);
    if (hours.daysOpen.length === 0) {
      throw new MarketClosedError(`Market not open on ${dateStr}`);
    }
    return this.createDateInWAT(dateStr, hours.closeTime.hour, hours.closeTime.minute);
  }

  getNextTradingDay(fromDate: Date): Date {
    const date = new Date(fromDate);
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      if (this.getTradingHours(date).daysOpen.length > 0) return date;
      date.setDate(date.getDate() + 1);
    }

    throw new MarketClosedError("No trading day found in the next 7 days");
  }

  getPreviousTradingDay(fromDate: Date): Date {
    const date = new Date(fromDate);
    date.setDate(date.getDate() - 1);
    date.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      if (this.getTradingHours(date).daysOpen.length > 0) return date;
      date.setDate(date.getDate() - 1);
    }

    throw new MarketClosedError("No trading day found in the previous 7 days");
  }

  isHoliday(date: Date): boolean {
    const { dateStr } = this.getWATComponents(date);
    return this.HOLIDAYS_2026.has(dateStr);
  }

  getHolidays(_year: number): Date[] {
    return Array.from(this.HOLIDAYS_2026).map((s) => new Date(s));
  }

  isValidSymbol(symbol: StockSymbol): boolean {
    const s = String(symbol);
    return this.VALID_SYMBOL_PATTERN.test(s) && s.length >= 3;
  }

  formatSymbol(symbol: StockSymbol): StockSymbol {
    const formatted = String(symbol).toUpperCase();
    if (!this.isValidSymbol(formatted as StockSymbol)) {
      throw new InvalidSymbolError(String(symbol));
    }
    return formatted as StockSymbol;
  }

  getWithholdingTaxRate(_symbol?: StockSymbol): number {
    return this.config.withholdingTaxRate;
  }

  getTransactionCosts(
    _symbol: StockSymbol,
    amount: number
  ): { brokerCommission: number; totalCost: number; costPercentage: number } {
    const brokerCommission = amount * (this.config.transactionCostPercent / 100);
    return {
      brokerCommission,
      totalCost: brokerCommission,
      costPercentage: this.config.transactionCostPercent,
    };
  }

  getMinimumTradeAmount(_symbol?: StockSymbol): number {
    return this.config.minTradeAmount;
  }

  getTickSize(_symbol?: StockSymbol): number {
    return this.config.tickSize;
  }

  validateStock(
    symbol: StockSymbol,
    _sector?: string
  ): Promise<{ valid: boolean; reason?: string; alternativeSuggestions?: StockSymbol[] }> {
    if (!this.isValidSymbol(symbol)) {
      return Promise.resolve({
        valid: false,
        reason: `Symbol "${String(symbol)}" does not match NGX format (3-4 uppercase letters)`,
        alternativeSuggestions: this.getSimilarSymbols(String(symbol)),
      });
    }
    return Promise.resolve({ valid: true });
  }

  async initialize(): Promise<void> {
    if (!this.isConfigured()) {
      throw new ConfigurationError("NGX", "Market not properly configured");
    }
    await this.healthCheck();
  }

  async healthCheck(timeoutMs = 5000): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      await this.simulateHealthCheck(timeoutMs);
      this.cachedHealthResult = {
        healthy: true,
        status: "operational",
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        configValid: this.isConfigured(),
      };
    } catch (error) {
      if (error instanceof TimeoutError) throw error;
      this.cachedHealthResult = {
        healthy: false,
        status: "degraded",
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
        configValid: this.isConfigured(),
      };
    }
    return this.cachedHealthResult;
  }

  getCapabilities(): MarketCapabilities {
    return {
      supportsPreMarket: false,
      supportsAfterHours: false,
      supportsPartialFills: true,
      supportsConditionalOrders: false,
      supportsDividendReinvestment: true,
      supportsShortSelling: false,
      supportsOptionsTrading: false,
      supportsMarginTrading: false,
      maxOrderSize: Infinity,
      minOrderSize: this.config.minTradeAmount,
      settlementDays: 3,
      currencies: ["NGN"],
      decimalPlaces: this.config.decimalPlaces,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Extract time components in WAT (Africa/Lagos) timezone using date-fns-tz.
   */
  private getWATComponents(date: Date): WATComponents {
    const zoned = toZonedTime(date, this.timezone);
    const hour = zoned.getHours();
    const minute = zoned.getMinutes();
    const dateStr = format(zoned, "yyyy-MM-dd");
    const jsDay = zoned.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    return { hour, minute, isoDay, dateStr };
  }

  /**
   * Create a UTC Date from a WAT wall-clock time on a given date string.
   */
  private createDateInWAT(dateStr: string, hour: number, minute: number): Date {
    const paddedHour = String(hour).padStart(2, "0");
    const paddedMin = String(minute).padStart(2, "0");
    return fromZonedTime(`${dateStr}T${paddedHour}:${paddedMin}:00`, this.timezone);
  }

  /**
   * Resolve open/close times for a specific date, accounting for half-days.
   */
  private getSessionHours(
    dateStr: string,
    _isoDay: number
  ): { openTime: { hour: number; minute: number }; closeTime: { hour: number; minute: number } } {
    if (this.HALF_DAYS_2026.has(dateStr)) {
      return { openTime: { hour: 10, minute: 0 }, closeTime: { hour: 12, minute: 0 } };
    }
    return { openTime: this.TRADING_HOURS.openTime, closeTime: this.TRADING_HOURS.closeTime };
  }

  private getSimilarSymbols(input: string): StockSymbol[] {
    const common = ["MTNN", "DANGOTE", "BUA", "ETI", "AIRTEL", "NESTLE"];
    return common
      .filter((s) => this.calculateSimilarity(input, s) > 0.5)
      .slice(0, 3) as StockSymbol[];
  }

  private calculateSimilarity(a: string, b: string): number {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1;
    const dist = this.getEditDistance(longer, shorter);
    return (longer.length - dist) / longer.length;
  }

  private getEditDistance(s1: string, s2: string): number {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(newValue, lastValue, costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  private simulateHealthCheck(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new TimeoutError("Market health check", timeoutMs));
      }, timeoutMs);
      setTimeout(() => {
        clearTimeout(timeout);
        resolve();
      }, 100);
    });
  }
}

/**
 * MarketNGX factory — singleton pattern
 */
export class MarketNGXFactory implements IMarketFactory {
  private instance: MarketNGX | null = null;
  private config: Partial<MarketNGXConfig>;

  constructor(config: Partial<MarketNGXConfig> = {}) {
    this.config = config;
  }

  async createProvider(marketId: string): Promise<IMarket> {
    if (marketId !== "ngx") {
      throw new ConfigurationError(
        "MarketNGXFactory",
        `Only supports 'ngx' market, got '${marketId}'`
      );
    }
    if (!this.instance) {
      this.instance = new MarketNGX(this.config);
      await this.instance.initialize();
    }
    return this.instance;
  }

  getDefaultProvider(): Promise<IMarket> {
    return this.createProvider("ngx");
  }

  getAllProviders(): Promise<IMarket[]> {
    return this.createProvider("ngx").then((p) => [p]);
  }

  registerProvider(_provider: IMarket): void {
    // Single-market factory; external registration not supported
  }

  getProvider(marketId: string): Promise<IMarket | null> {
    if (marketId === "ngx" && this.instance) return Promise.resolve(this.instance);
    return Promise.resolve(null);
  }

  getFallbackProvider(_primaryId: string): Promise<IMarket | null> {
    return Promise.resolve(null);
  }
}
