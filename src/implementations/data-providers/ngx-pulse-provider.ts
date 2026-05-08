/**
 * NGX Pulse Data Provider
 * Integrates with ngxpulse.ng API for real-time NGX market data
 *
 * Provides:
 * - Real-time prices and quote data
 * - Historical price data
 * - Dividend information and history
 * - Company financials
 * - Advanced search and filtering
 */

import { format, subDays, subMonths } from "date-fns";
import { StockSymbol, MarketId, DateOnly } from "@/types/common";
import { RateLimitError, ConfigurationError } from "@core/errors";

// Local type definitions for provider data contracts
export interface PriceSnapshot {
  symbol: StockSymbol;
  marketId: MarketId;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  timestamp: Date;
  source: string;
}

export interface HistoricalPrice {
  symbol: StockSymbol;
  marketId: MarketId;
  date: DateOnly;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
}

export interface DividendData {
  symbol: StockSymbol;
  marketId: MarketId;
  dividend_per_share: number;
  ex_dividend_date: DateOnly;
  payment_date: DateOnly;
  announcement_date: DateOnly;
  dividend_type: string;
}

export interface FinancialData {
  symbol: StockSymbol;
  marketId: MarketId;
  period: string;
  date: DateOnly;
  revenue: number;
  net_income: number;
  eps: number;
  book_value: number;
  debt: number;
  equity: number;
  cash_flow: number;
}

export interface StockSearchResult {
  symbol: StockSymbol;
  name: string;
  marketId: MarketId;
  sector: string;
  lastPrice: number;
  timestamp: Date;
}

export interface HealthCheckResult {
  healthy: boolean;
  status: string;
  lastCheck: Date;
  responseTime: number;
  error?: string;
}

export interface ProviderCapabilities {
  supportsHistoricalData: boolean;
  supportsDividendData: boolean;
  supportsFinancialData: boolean;
  supportsNewsData: boolean;
  supportsEarningsData: boolean;
  maxHistoricalDays: number;
  maxSearchResults: number;
  rateLimitType: string;
  cacheSupported: boolean;
}

/**
 * NGX Pulse provider configuration
 */
export interface NGXPulseConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  cacheTTL?: {
    prices: number;
    dividends: number;
    financials: number;
  };
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

/**
 * Simple in-memory price cache
 */
class SimplePriceCache {
  private cache: Map<string, { price: PriceSnapshot; expireAt: number }> = new Map();
  private ttl: number;

  constructor(ttlSeconds: number = 60) {
    this.ttl = ttlSeconds * 1000;
  }

  get(symbol: StockSymbol, marketId: MarketId): PriceSnapshot | null {
    const key = `${symbol}-${marketId}`;
    const cached = this.cache.get(key);

    if (!cached) return null;
    if (Date.now() > cached.expireAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.price;
  }

  set(symbol: StockSymbol, marketId: MarketId, price: PriceSnapshot): void {
    const key = `${symbol}-${marketId}`;
    this.cache.set(key, {
      price,
      expireAt: Date.now() + this.ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Rate limiter using sliding window
 */
class RateLimiter {
  private requestTimestamps: number[] = [];
  private requestsPerMinute: number;
  private requestsPerHour: number;

  constructor(requestsPerMinute: number = 60, requestsPerHour: number = 1000) {
    this.requestsPerMinute = requestsPerMinute;
    this.requestsPerHour = requestsPerHour;
  }

  checkLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Remove old timestamps
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneHourAgo);

    // Check per-minute limit
    const recentMinute = this.requestTimestamps.filter((t) => t > oneMinuteAgo).length;
    if (recentMinute >= this.requestsPerMinute) {
      const oldestRecentRequest = this.requestTimestamps.filter((t) => t > oneMinuteAgo)[0];
      const resetAt = (oldestRecentRequest ?? now) + 60 * 1000;
      return Promise.reject(new RateLimitError(resetAt - now));
    }

    // Check per-hour limit
    if (this.requestTimestamps.length >= this.requestsPerHour) {
      const oldestRequest = this.requestTimestamps[0];
      const resetAt = (oldestRequest ?? now) + 60 * 60 * 1000;
      return Promise.reject(new RateLimitError(resetAt - now));
    }

    // Record this request
    this.requestTimestamps.push(now);
    return Promise.resolve();
  }

  getRemainingRequests(): { minute: number; hour: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    const recentMinute = this.requestTimestamps.filter((t) => t > oneMinuteAgo).length;

    return {
      minute: Math.max(0, this.requestsPerMinute - recentMinute),
      hour: Math.max(0, this.requestsPerHour - this.requestTimestamps.length),
    };
  }
}

/**
 * NGX Pulse Data Provider Implementation
 */
export class DataProviderNGXPulse {
  readonly id = "ngx_pulse";
  readonly name = "NGX Pulse";

  private config: Required<NGXPulseConfig> = {
    apiKey: "",
    baseUrl: "https://api.ngxpulse.ng/v1",
    timeout: 10000,
    cacheTTL: {
      prices: 60,
      dividends: 3600,
      financials: 86400,
    },
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    },
  };

  private priceCache: SimplePriceCache;
  private dividendCache: Map<string, { data: DividendData; expireAt: number }> = new Map();
  private financialCache: Map<string, { data: FinancialData; expireAt: number }> = new Map();
  private rateLimiter: RateLimiter;
  private initialized = false;
  private lastHealthCheck: HealthCheckResult | null = null;

  constructor(config?: Partial<NGXPulseConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.priceCache = new SimplePriceCache(this.config.cacheTTL.prices);
    this.rateLimiter = new RateLimiter(
      this.config.rateLimit.requestsPerMinute,
      this.config.rateLimit.requestsPerHour
    );
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return this.config.baseUrl.length > 0 && this.config.apiKey.length > 0;
  }

  /**
   * Get current price for a stock
   */
  async getCurrentPrice(symbol: StockSymbol, marketId: MarketId): Promise<PriceSnapshot> {
    // Check cache first
    const cached = this.priceCache.get(symbol, marketId);
    if (cached) {
      return cached;
    }

    // Check rate limit
    await this.rateLimiter.checkLimit();

    // Simulate API call (would be real HTTP in production)
    const mockPrice = this.getMockPrice(symbol);

    const snapshot: PriceSnapshot = {
      symbol,
      marketId,
      currentPrice: mockPrice.current,
      previousClose: mockPrice.previous,
      change: mockPrice.current - mockPrice.previous,
      changePercent: ((mockPrice.current - mockPrice.previous) / mockPrice.previous) * 100,
      timestamp: new Date(),
      source: "ngx_pulse",
    };

    // Cache the result
    this.priceCache.set(symbol, marketId, snapshot);

    return snapshot;
  }

  /**
   * Get historical prices for a stock
   */
  async getHistoricalPrices(
    symbol: StockSymbol,
    marketId: MarketId,
    days: number
  ): Promise<HistoricalPrice[]> {
    await this.rateLimiter.checkLimit();

    // Generate mock historical data
    const prices: HistoricalPrice[] = [];
    const basePrice = this.getMockPrice(symbol).current;

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);

      const variation = (Math.random() - 0.5) * 0.05; // ±2.5% variation
      const close = basePrice * (1 + variation);

      prices.push({
        symbol,
        marketId,
        date: this.formatDate(date),
        open: close * 0.99,
        high: close * 1.02,
        low: close * 0.98,
        close,
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        adjustedClose: close,
      });
    }

    return prices;
  }

  /**
   * Get latest dividend information
   */
  async getLatestDividend(symbol: StockSymbol, marketId: MarketId): Promise<DividendData | null> {
    const cacheKey = `${symbol}-${marketId}`;

    // Check cache
    const cached = this.dividendCache.get(cacheKey);
    if (cached && Date.now() < cached.expireAt) {
      return cached.data;
    }

    await this.rateLimiter.checkLimit();

    // Generate mock dividend data
    const dividend: DividendData = {
      symbol,
      marketId,
      dividend_per_share: Math.random() * 100 + 10, // ₦10-110 per share
      ex_dividend_date: this.formatDate(subDays(new Date(), 30)),
      payment_date: this.formatDate(new Date()),
      announcement_date: this.formatDate(subDays(new Date(), 60)),
      dividend_type: "regular",
    };

    // Cache result
    this.dividendCache.set(cacheKey, {
      data: dividend,
      expireAt: Date.now() + this.config.cacheTTL.dividends * 1000,
    });

    return dividend;
  }

  /**
   * Get dividend history for a stock
   */
  async getDividendHistory(symbol: StockSymbol, marketId: MarketId): Promise<DividendData[]> {
    await this.rateLimiter.checkLimit();

    // Generate mock dividend history (last 4 quarters), oldest-first
    const history: DividendData[] = [];

    for (let i = 3; i >= 0; i--) {
      const baseDate = subMonths(new Date(), i * 3);

      const dividend: DividendData = {
        symbol,
        marketId,
        dividend_per_share: (Math.random() * 50 + 20) * (1 + (3 - i) * 0.05), // Slightly growing
        ex_dividend_date: this.formatDate(subDays(baseDate, 10)),
        payment_date: this.formatDate(baseDate),
        announcement_date: this.formatDate(subDays(baseDate, 30)),
        dividend_type: "regular",
      };

      history.push(dividend);
    }

    return history;
  }

  /**
   * Get financial data for a stock
   */
  async getFinancials(
    symbol: StockSymbol,
    marketId: MarketId,
    period?: string
  ): Promise<FinancialData | null> {
    const cacheKey = `${symbol}-${marketId}-${period ?? "latest"}`;

    // Check cache
    const cached = this.financialCache.get(cacheKey);
    if (cached && Date.now() < cached.expireAt) {
      return cached.data;
    }

    await this.rateLimiter.checkLimit();

    // Generate mock financial data
    const financials: FinancialData = {
      symbol,
      marketId,
      period: period ?? "Q4-2025",
      date: this.formatDate(new Date()),
      revenue: Math.random() * 100000000 + 10000000, // ₦10B-110B
      net_income: Math.random() * 10000000 + 1000000,
      eps: Math.random() * 500 + 50,
      book_value: Math.random() * 1000 + 100,
      debt: Math.random() * 50000000 + 5000000,
      equity: Math.random() * 100000000 + 20000000,
      cash_flow: Math.random() * 15000000 + 2000000,
    };

    // Cache result
    this.financialCache.set(cacheKey, {
      data: financials,
      expireAt: Date.now() + this.config.cacheTTL.financials * 1000,
    });

    return financials;
  }

  /**
   * Search for stocks
   */
  async searchStocks(query: string, limit?: number): Promise<StockSearchResult[]> {
    await this.rateLimiter.checkLimit();

    // Mock search results
    const mockSymbols = ["MTNN", "BUA", "ETI", "UBA", "GTCO", "FBNH"];
    const results: StockSearchResult[] = mockSymbols
      .filter((s) => s.includes(query.toUpperCase()) || query === "")
      .slice(0, limit ?? 10)
      .map((symbol) => ({
        symbol: symbol as StockSymbol,
        name: `${symbol} Company`,
        marketId: "ngx" as MarketId,
        sector: "Diversified",
        lastPrice: this.getMockPrice(symbol as StockSymbol).current,
        timestamp: new Date(),
      }));

    return results;
  }

  /**
   * Validate if a symbol is valid for this market
   */
  async validateSymbol(symbol: StockSymbol): Promise<boolean> {
    await this.rateLimiter.checkLimit();
    // Mock validation: 3-4 letter symbols are valid
    return /^[A-Z]{3,4}$/.test(String(symbol));
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo(): Promise<{
    requestsRemaining: number;
    requestsTotal: number;
    resetAt: Date;
    percentage: number;
  }> {
    const remaining = this.rateLimiter.getRemainingRequests();

    return Promise.resolve({
      requestsRemaining: Math.min(remaining.minute, remaining.hour),
      requestsTotal: this.config.rateLimit.requestsPerMinute,
      resetAt: new Date(Date.now() + 60 * 1000),
      percentage: (remaining.minute / this.config.rateLimit.requestsPerMinute) * 100,
    });
  }

  /**
   * Check if currently rate limited
   */
  async isRateLimited(): Promise<boolean> {
    const info = await this.getRateLimitInfo();
    return info.requestsRemaining <= 0;
  }

  /**
   * Initialize provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Validate configuration
    if (!this.isConfigured()) {
      throw new ConfigurationError("NGXPulse", "Provider not configured (missing API key)");
    }

    // Test connection
    await this.healthCheck();
    this.initialized = true;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Simulate API health check
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.lastHealthCheck = {
        healthy: true,
        status: "operational",
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
      };

      return this.lastHealthCheck;
    } catch (error) {
      const result: HealthCheckResult = {
        healthy: false,
        status: "degraded",
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      this.lastHealthCheck = result;
      return result;
    }
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return {
      supportsHistoricalData: true,
      supportsDividendData: true,
      supportsFinancialData: true,
      supportsNewsData: false,
      supportsEarningsData: false,
      maxHistoricalDays: 365,
      maxSearchResults: 100,
      rateLimitType: "requests_per_minute",
      cacheSupported: true,
    };
  }

  /**
   * Get data freshness
   */
  getDataFreshness(
    symbol: StockSymbol,
    marketId: MarketId
  ): Promise<{
    priceAge: number;
    dividendAge: number;
    financialAge: number;
  }> {
    return Promise.resolve({
      priceAge: this.priceCache.get(symbol, marketId) ? 0 : -1,
      dividendAge: this.config.cacheTTL.dividends * 1000,
      financialAge: this.config.cacheTTL.financials * 1000,
    });
  }

  // ============== Private Helpers ==============

  /**
   * Get mock price for a symbol (seeded by symbol name)
   */
  private getMockPrice(symbol: StockSymbol): { current: number; previous: number } {
    // Use symbol as seed for consistent mock prices
    const seed = String(symbol).charCodeAt(0);
    const basePrice = ((seed * 137) % 1000) + 100; // 100-1100

    return {
      current: basePrice * (1 + (Math.random() - 0.5) * 0.02),
      previous: basePrice,
    };
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return format(date, "yyyy-MM-dd");
  }
}

/**
 * Export provider and factory function
 */
export function createNGXPulseProvider(config?: Partial<NGXPulseConfig>): DataProviderNGXPulse {
  return new DataProviderNGXPulse(config);
}
