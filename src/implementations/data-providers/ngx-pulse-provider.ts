import { format, subDays } from "date-fns";
import { StockSymbol, MarketId, DateOnly } from "@/types/common";
import {
  IStockDataProvider,
  PriceSnapshot,
  HistoricalPrice,
  DividendData,
  FinancialData,
  StockSearchResult,
} from "@core/data-provider";
import { RateLimitError, ConfigurationError } from "@core/errors";

// ── NGX Pulse API response shapes ────────────────────────────────────────────

interface NGXStockResponse {
  symbol: string;
  name: string;
  current_price: number;
  change_percent: number;
  volume: number;
  shares_outstanding: number;
  sector: string;
  pe_ratio: number;
}

interface NGXPriceResponse {
  trade_date: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
}

interface NGXDividendResponse {
  symbol: string;
  company_name: string;
  ex_dividend_date: string;
  record_date: string;
  pay_date: string;
  dividend_per_share: number;
  currency: string;
}

interface NGXMarketStatusResponse {
  status: string;
  message: string;
  timestamp: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

export interface NGXPulseConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  cacheTTL?: {
    prices: number;
    dividends: number;
    stocks: number;
  };
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

// ── Simple in-memory caches ───────────────────────────────────────────────────

class SimpleCache<T> {
  private cache: Map<string, { data: T; expireAt: number }> = new Map();
  private ttlMs: number;

  constructor(ttlSeconds: number) {
    this.ttlMs = ttlSeconds * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, expireAt: Date.now() + this.ttlMs });
  }
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

class RateLimiter {
  private timestamps: number[] = [];

  constructor(
    private readonly perMinute: number,
    private readonly perHour: number
  ) {}

  checkLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const oneHourAgo = now - 3_600_000;

    this.timestamps = this.timestamps.filter((t) => t > oneHourAgo);

    const recentMinute = this.timestamps.filter((t) => t > oneMinuteAgo).length;
    if (recentMinute >= this.perMinute) {
      const oldest = this.timestamps.filter((t) => t > oneMinuteAgo)[0] ?? now;
      return Promise.reject(new RateLimitError(oldest + 60_000));
    }

    if (this.timestamps.length >= this.perHour) {
      const oldest = this.timestamps[0] ?? now;
      return Promise.reject(new RateLimitError(oldest + 3_600_000));
    }

    this.timestamps.push(now);
    return Promise.resolve();
  }

  getRemaining(): { minute: number; hour: number } {
    const now = Date.now();
    const recentMinute = this.timestamps.filter((t) => t > now - 60_000).length;
    return {
      minute: Math.max(0, this.perMinute - recentMinute),
      hour: Math.max(0, this.perHour - this.timestamps.length),
    };
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export class DataProviderNGXPulse implements IStockDataProvider {
  readonly id = "ngx_pulse";
  readonly name = "NGX Pulse";

  private readonly config: Required<NGXPulseConfig>;
  private readonly priceCache: SimpleCache<PriceSnapshot>;
  private readonly dividendCache: SimpleCache<DividendData[]>;
  private readonly stocksCache: SimpleCache<NGXStockResponse[]>;
  private readonly rateLimiter: RateLimiter;
  private initialized = false;

  constructor(config?: Partial<NGXPulseConfig>) {
    this.config = {
      apiKey: config?.apiKey ?? "",
      baseUrl: config?.baseUrl ?? "https://www.ngxpulse.ng",
      timeout: config?.timeout ?? 10_000,
      cacheTTL: {
        prices: config?.cacheTTL?.prices ?? 60,
        dividends: config?.cacheTTL?.dividends ?? 3600,
        stocks: config?.cacheTTL?.stocks ?? 60,
      },
      rateLimit: {
        requestsPerMinute: config?.rateLimit?.requestsPerMinute ?? 60,
        requestsPerHour: config?.rateLimit?.requestsPerHour ?? 1000,
      },
    };
    this.priceCache = new SimpleCache(this.config.cacheTTL.prices);
    this.dividendCache = new SimpleCache(this.config.cacheTTL.dividends);
    this.stocksCache = new SimpleCache(this.config.cacheTTL.stocks);
    this.rateLimiter = new RateLimiter(
      this.config.rateLimit.requestsPerMinute,
      this.config.rateLimit.requestsPerHour
    );
  }

  isConfigured(): boolean {
    return this.config.apiKey.length > 0 && this.config.baseUrl.length > 0;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (!this.isConfigured()) {
      throw new ConfigurationError("NGXPulse", "Missing API key");
    }
    await this.healthCheck();
    this.initialized = true;
  }

  async healthCheck(): Promise<{ healthy: boolean; status: string }> {
    try {
      const data = await this.get<NGXMarketStatusResponse>("/api/ngxdata/market-status");
      return { healthy: true, status: data.status };
    } catch (error) {
      return {
        healthy: false,
        status: error instanceof Error ? error.message : "unknown error",
      };
    }
  }

  async getCurrentPrice(symbol: StockSymbol, marketId: MarketId): Promise<PriceSnapshot> {
    const cached = this.priceCache.get(`${symbol}-${marketId}`);
    if (cached) return cached;

    const stocks = await this.fetchStocks();
    const stock = stocks.find((s) => s.symbol.toUpperCase() === String(symbol).toUpperCase());

    if (!stock) {
      throw new Error(`Symbol "${symbol}" not found in NGX Pulse`);
    }

    const currentPrice = stock.current_price;
    const changePercent = stock.change_percent;
    const previousClose =
      changePercent !== 0 ? currentPrice / (1 + changePercent / 100) : currentPrice;

    const snapshot: PriceSnapshot = {
      symbol,
      marketId,
      currentPrice,
      previousClose,
      change: currentPrice - previousClose,
      changePercent,
      timestamp: new Date(),
      source: "ngx_pulse",
    };

    this.priceCache.set(`${symbol}-${marketId}`, snapshot);
    return snapshot;
  }

  async getHistoricalPrices(
    symbol: StockSymbol,
    _marketId: MarketId,
    days: number
  ): Promise<HistoricalPrice[]> {
    const today = new Date();
    const from = format(subDays(today, days), "yyyy-MM-dd");
    const to = format(today, "yyyy-MM-dd");

    const data = await this.getArray<NGXPriceResponse>(
      `/api/ngxdata/prices/${encodeURIComponent(String(symbol))}?from=${from}&to=${to}`
    );

    return data.map((row) => ({
      symbol,
      marketId: _marketId,
      date: row.trade_date as DateOnly,
      open: row.open_price,
      high: row.high_price,
      low: row.low_price,
      close: row.close_price,
      volume: row.volume,
      adjustedClose: row.close_price,
    }));
  }

  async getDividendHistory(symbol: StockSymbol, marketId: MarketId): Promise<DividendData[]> {
    const cacheKey = `${symbol}-${marketId}`;
    const cached = this.dividendCache.get(cacheKey);
    if (cached) return cached;

    const data = await this.getArray<NGXDividendResponse>(
      `/api/ngxdata/dividends/${encodeURIComponent(String(symbol))}?limit=all`
    );

    const history: DividendData[] = data
      .map((row) => ({
        symbol,
        marketId,
        dividend_per_share: row.dividend_per_share,
        ex_dividend_date: row.ex_dividend_date as DateOnly,
        payment_date: (row.pay_date ?? row.ex_dividend_date) as DateOnly,
        announcement_date: row.ex_dividend_date as DateOnly,
        dividend_type: "regular" as const,
      }))
      .sort((a, b) => a.payment_date.localeCompare(b.payment_date));

    this.dividendCache.set(cacheKey, history);
    return history;
  }

  async getLatestDividend(symbol: StockSymbol, marketId: MarketId): Promise<DividendData | null> {
    const history = await this.getDividendHistory(symbol, marketId);
    return history.at(-1) ?? null;
  }

  // NGX Pulse has no financials endpoint — return null so criteria handle missing data gracefully
  async getFinancials(_symbol: StockSymbol, _marketId: MarketId): Promise<FinancialData | null> {
    return null;
  }

  async searchStocks(query: string, limit?: number): Promise<StockSearchResult[]> {
    const stocks = await this.fetchStocks();
    const upperQuery = query.toUpperCase();

    const matches =
      query === ""
        ? stocks
        : stocks.filter(
            (s) =>
              s.symbol.toUpperCase().includes(upperQuery) ||
              s.name.toUpperCase().includes(upperQuery)
          );

    return matches.slice(0, limit ?? 50).map((s) => ({
      symbol: s.symbol as StockSymbol,
      name: s.name,
      marketId: "ngx" as MarketId,
      sector: s.sector ?? "Unknown",
      lastPrice: s.current_price,
      timestamp: new Date(),
    }));
  }

  async validateSymbol(symbol: StockSymbol): Promise<boolean> {
    const stocks = await this.fetchStocks();
    return stocks.some((s) => s.symbol.toUpperCase() === String(symbol).toUpperCase());
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async fetchStocks(): Promise<NGXStockResponse[]> {
    const cached = this.stocksCache.get("all");
    if (cached) return cached;

    const data = await this.getArray<NGXStockResponse>("/api/ngxdata/stocks");
    this.stocksCache.set("all", data);
    return data;
  }

  private async getArray<T>(path: string): Promise<T[]> {
    const raw = await this.get<unknown>(path);
    if (Array.isArray(raw)) return raw as T[];
    // Handle { data: [...] } or { stocks: [...] } envelope shapes
    if (raw && typeof raw === "object") {
      for (const value of Object.values(raw as Record<string, unknown>)) {
        if (Array.isArray(value)) return value as T[];
      }
    }
    process.stderr.write(`[WARN] NGX Pulse: unexpected non-array response from ${path}: ${JSON.stringify(raw).slice(0, 200)}\n`);
    return [];
  }

  private async get<T>(path: string): Promise<T> {
    await this.rateLimiter.checkLimit();

    const url = `${this.config.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        headers: {
          "X-API-Key": this.config.apiKey,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      if (response.status === 429) {
        const retryAfterSecs = Number(response.headers.get("Retry-After") ?? 60);
        throw new RateLimitError(Date.now() + retryAfterSecs * 1000);
      }

      if (!response.ok) {
        throw new Error(`NGX Pulse API ${response.status}: ${response.statusText} — ${path}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export function createNGXPulseProvider(config?: Partial<NGXPulseConfig>): DataProviderNGXPulse {
  return new DataProviderNGXPulse(config);
}
