/**
 * Mock Data Provider
 * For testing and development
 *
 * Provides:
 * - Deterministic mock data
 * - No rate limiting
 * - Instant responses
 * - Easy data injection for tests
 */

import { format, subDays } from "date-fns";
import { StockSymbol, MarketId, DateOnly } from "@/types/common";

/**
 * Local type definitions for this provider's data contracts
 */
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
 * Mock data store for testing
 */
export class MockDataStore {
  private prices: Map<string, PriceSnapshot> = new Map();
  private dividends: Map<string, DividendData[]> = new Map();
  private financials: Map<string, FinancialData> = new Map();
  private history: Map<string, HistoricalPrice[]> = new Map();

  setPriceSnapshot(symbol: StockSymbol, marketId: MarketId, price: PriceSnapshot): void {
    const key = `${symbol}-${marketId}`;
    this.prices.set(key, price);
  }

  getPriceSnapshot(symbol: StockSymbol, marketId: MarketId): PriceSnapshot | undefined {
    const key = `${symbol}-${marketId}`;
    return this.prices.get(key);
  }

  setDividendHistory(symbol: StockSymbol, marketId: MarketId, dividends: DividendData[]): void {
    const key = `${symbol}-${marketId}`;
    this.dividends.set(key, dividends);
  }

  getDividendHistory(symbol: StockSymbol, marketId: MarketId): DividendData[] | undefined {
    const key = `${symbol}-${marketId}`;
    return this.dividends.get(key);
  }

  setFinancials(symbol: StockSymbol, marketId: MarketId, financials: FinancialData): void {
    const key = `${symbol}-${marketId}`;
    this.financials.set(key, financials);
  }

  getFinancials(symbol: StockSymbol, marketId: MarketId): FinancialData | undefined {
    const key = `${symbol}-${marketId}`;
    return this.financials.get(key);
  }

  setHistoricalPrices(symbol: StockSymbol, marketId: MarketId, prices: HistoricalPrice[]): void {
    const key = `${symbol}-${marketId}`;
    this.history.set(key, prices);
  }

  getHistoricalPrices(symbol: StockSymbol, marketId: MarketId): HistoricalPrice[] | undefined {
    const key = `${symbol}-${marketId}`;
    return this.history.get(key);
  }

  clear(): void {
    this.prices.clear();
    this.dividends.clear();
    this.financials.clear();
    this.history.clear();
  }
}

/**
 * Mock Data Provider
 */
export class DataProviderMock {
  readonly id = "mock";
  readonly name = "Mock Provider";

  private store: MockDataStore;
  private callCount = 0;
  private shouldFailNextCall = false;

  constructor() {
    this.store = new MockDataStore();
    this.setupDefaultData();
  }

  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return true; // Mock is always configured
  }

  /**
   * Get current price
   */
  getCurrentPrice(symbol: StockSymbol, marketId: MarketId): Promise<PriceSnapshot> {
    this.callCount++;

    if (this.shouldFailNextCall) {
      this.shouldFailNextCall = false;
      return Promise.reject(new Error("Mock provider error (simulated)"));
    }

    const snapshot = this.store.getPriceSnapshot(symbol, marketId);
    if (!snapshot) {
      return Promise.resolve(this.createMockPrice(symbol, marketId));
    }
    return Promise.resolve(snapshot);
  }

  /**
   * Get historical prices
   */
  getHistoricalPrices(
    symbol: StockSymbol,
    marketId: MarketId,
    days: number
  ): Promise<HistoricalPrice[]> {
    this.callCount++;

    const stored = this.store.getHistoricalPrices(symbol, marketId);
    if (stored) {
      return Promise.resolve(stored.slice(0, days));
    }

    // Generate mock history
    const prices: HistoricalPrice[] = [];
    const basePrice = 500;

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);

      prices.push({
        symbol,
        marketId,
        date: this.formatDate(date),
        open: basePrice * 0.98,
        high: basePrice * 1.02,
        low: basePrice * 0.97,
        close: basePrice,
        volume: 1000000,
        adjustedClose: basePrice,
      });
    }

    return Promise.resolve(prices);
  }

  /**
   * Get latest dividend
   */
  getLatestDividend(symbol: StockSymbol, marketId: MarketId): Promise<DividendData | null> {
    this.callCount++;

    const history = this.store.getDividendHistory(symbol, marketId);
    if (history && history.length > 0) {
      return Promise.resolve(history[history.length - 1] ?? null);
    }

    // Generate mock dividend
    const dividend: DividendData = {
      symbol,
      marketId,
      dividend_per_share: 50,
      ex_dividend_date: this.formatDate(subDays(new Date(), 30)),
      payment_date: this.formatDate(new Date()),
      announcement_date: this.formatDate(subDays(new Date(), 60)),
      dividend_type: "regular",
    };
    return Promise.resolve(dividend);
  }

  /**
   * Get dividend history
   */
  getDividendHistory(symbol: StockSymbol, marketId: MarketId): Promise<DividendData[]> {
    this.callCount++;

    const stored = this.store.getDividendHistory(symbol, marketId);
    if (stored) {
      return Promise.resolve(stored);
    }

    // Generate mock history (oldest-first)
    const history: DividendData[] = [
      {
        symbol,
        marketId,
        dividend_per_share: 45,
        ex_dividend_date: "2025-09-01",
        payment_date: "2025-10-15",
        announcement_date: "2025-08-01",
        dividend_type: "regular",
      },
      {
        symbol,
        marketId,
        dividend_per_share: 50,
        ex_dividend_date: "2025-12-01",
        payment_date: "2026-01-15",
        announcement_date: "2025-11-01",
        dividend_type: "regular",
      },
    ];
    return Promise.resolve(history);
  }

  /**
   * Get financials
   */
  getFinancials(symbol: StockSymbol, marketId: MarketId): Promise<FinancialData | null> {
    this.callCount++;

    const stored = this.store.getFinancials(symbol, marketId);
    if (stored) {
      return Promise.resolve(stored);
    }

    const financials: FinancialData = {
      symbol,
      marketId,
      period: "Q4-2025",
      date: this.formatDate(new Date()),
      revenue: 50000000,
      net_income: 5000000,
      eps: 100,
      book_value: 500,
      debt: 10000000,
      equity: 50000000,
      cash_flow: 8000000,
    };
    return Promise.resolve(financials);
  }

  /**
   * Search stocks
   */
  searchStocks(query: string, limit?: number): Promise<StockSearchResult[]> {
    this.callCount++;

    const mockSymbols = ["MTNN", "BUA", "ETI", "UBA", "GTCO", "FBNH"];
    const results = mockSymbols
      .filter((s) => s.includes(query.toUpperCase()) || query === "")
      .slice(0, limit ?? 10)
      .map((symbol) => ({
        symbol: symbol as StockSymbol,
        name: `${symbol} Company`,
        marketId: "ngx" as MarketId,
        sector: "Diversified",
        lastPrice: 500,
        timestamp: new Date(),
      }));
    return Promise.resolve(results);
  }

  /**
   * Validate symbol
   */
  validateSymbol(symbol: StockSymbol): Promise<boolean> {
    this.callCount++;
    return Promise.resolve(/^[A-Z]{3,4}$/.test(String(symbol)));
  }

  /**
   * Get rate limit info
   */
  getRateLimitInfo(): Promise<{
    requestsRemaining: number;
    requestsTotal: number;
    resetAt: Date;
    percentage: number;
  }> {
    return Promise.resolve({
      requestsRemaining: 1000,
      requestsTotal: 1000,
      resetAt: new Date(Date.now() + 3600000),
      percentage: 100,
    });
  }

  /**
   * Check if rate limited
   */
  isRateLimited(): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Initialize
   */
  initialize(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Health check
   */
  healthCheck(): Promise<HealthCheckResult> {
    return Promise.resolve({
      healthy: true,
      status: "operational",
      lastCheck: new Date(),
      responseTime: 1,
    });
  }

  /**
   * Get capabilities
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
      rateLimitType: "none",
      cacheSupported: false,
    };
  }

  /**
   * Get data freshness
   */
  getDataFreshness(): Promise<{
    priceAge: number;
    dividendAge: number;
    financialAge: number;
  }> {
    return Promise.resolve({
      priceAge: 0,
      dividendAge: 0,
      financialAge: 0,
    });
  }

  // ============== Test Helpers ==============

  /**
   * Get number of calls made
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * Reset call count
   */
  resetCallCount(): void {
    this.callCount = 0;
  }

  /**
   * Make next call fail
   */
  failNextCall(): void {
    this.shouldFailNextCall = true;
  }

  /**
   * Get mock data store for direct manipulation
   */
  getMockStore(): MockDataStore {
    return this.store;
  }

  /**
   * Reset all mock data
   */
  reset(): void {
    this.store.clear();
    this.callCount = 0;
    this.shouldFailNextCall = false;
    this.setupDefaultData();
  }

  // ============== Private Helpers ==============

  /**
   * Setup default mock data
   */
  private setupDefaultData(): void {
    // Add some default mock stocks
    const defaultSymbols: StockSymbol[] = ["MTNN", "GTCO", "BUA"] as StockSymbol[];

    for (const symbol of defaultSymbols) {
      this.store.setPriceSnapshot(
        symbol,
        "ngx" as MarketId,
        this.createMockPrice(symbol, "ngx" as MarketId)
      );
      this.store.setDividendHistory(symbol, "ngx" as MarketId, [
        {
          symbol,
          marketId: "ngx" as MarketId,
          dividend_per_share: 45,
          ex_dividend_date: "2025-09-01",
          payment_date: "2025-10-15",
          announcement_date: "2025-08-01",
          dividend_type: "regular",
        },
        {
          symbol,
          marketId: "ngx" as MarketId,
          dividend_per_share: 50,
          ex_dividend_date: "2025-12-01",
          payment_date: "2026-01-15",
          announcement_date: "2025-11-01",
          dividend_type: "regular",
        },
      ]);
    }
  }

  /**
   * Create mock price snapshot
   */
  private createMockPrice(symbol: StockSymbol, marketId: MarketId): PriceSnapshot {
    const seed = String(symbol).charCodeAt(0);
    const basePrice = ((seed * 137) % 1000) + 100;

    return {
      symbol,
      marketId,
      currentPrice: basePrice,
      previousClose: basePrice * 0.98,
      change: basePrice * 0.02,
      changePercent: 2.04,
      timestamp: new Date(),
      source: "mock",
    };
  }

  /**
   * Format date
   */
  private formatDate(date: Date): string {
    return format(date, "yyyy-MM-dd");
  }
}

/**
 * Export factory function
 */
export function createMockProvider(): DataProviderMock {
  return new DataProviderMock();
}

/**
 * Global mock instance for tests
 */
let globalMock: DataProviderMock | null = null;

/**
 * Get global mock provider
 */
export function getMockProvider(): DataProviderMock {
  if (!globalMock) {
    globalMock = new DataProviderMock();
  }
  return globalMock;
}
