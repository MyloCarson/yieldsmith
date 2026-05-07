/**
 * Data provider types (API data sources)
 * Supports: NGX Pulse, Alpha Vantage, etc.
 */

import { StockSymbol, MarketId, DateOnly } from "./common";

/**
 * Data provider type
 */
export type DataProviderType = "ngx_pulse" | "alpha_vantage" | "finnhub" | "polygon" | "mock";

/**
 * Stock data from provider
 */
export interface StockData {
  symbol: StockSymbol;
  market_id: MarketId;
  name: string;
  sector?: string;
  current_price: number;
  previous_close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  market_cap?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  timestamp: Date;
  source: DataProviderType;
}

/**
 * Historical price data from provider
 */
export interface HistoricalPrice {
  symbol: StockSymbol;
  market_id: MarketId;
  date: DateOnly;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjusted_close?: number;
}

/**
 * Dividend data from provider
 */
export interface DividendData {
  symbol: StockSymbol;
  market_id: MarketId;
  dividend_per_share: number;
  ex_dividend_date: DateOnly;
  payment_date: DateOnly;
  announcement_date?: DateOnly;
  dividend_type?: string;
}

/**
 * Financial data from provider
 */
export interface FinancialData {
  symbol: StockSymbol;
  market_id: MarketId;
  period: "quarterly" | "annual";
  date: DateOnly;
  revenue?: number;
  net_income?: number;
  eps?: number;
  book_value?: number;
  debt?: number;
  equity?: number;
  cash_flow?: number;
}

/**
 * Data provider interface (contract for all providers)
 */
export interface IDataProvider {
  provider: DataProviderType;
  isConfigured(): boolean;
  getCurrentPrice(symbol: StockSymbol, market_id: MarketId): Promise<StockData>;
  getHistoricalPrices(
    symbol: StockSymbol,
    market_id: MarketId,
    days: number
  ): Promise<HistoricalPrice[]>;
  getLatestDividend(symbol: StockSymbol, market_id: MarketId): Promise<DividendData | null>;
  getDividendHistory(
    symbol: StockSymbol,
    market_id: MarketId,
    years: number
  ): Promise<DividendData[]>;
  getFinancials(symbol: StockSymbol, market_id: MarketId): Promise<FinancialData | null>;
  searchStocks(query: string): Promise<StockSearchResult[]>;
  validateSymbol(symbol: StockSymbol, market_id: MarketId): Promise<boolean>;
}

/**
 * Stock search result
 */
export interface StockSearchResult {
  symbol: StockSymbol;
  market_id: MarketId;
  name: string;
  sector?: string;
  similarity_score: number;
}

/**
 * Data provider rate limits
 */
export interface RateLimits {
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  concurrent_requests: number;
}

/**
 * Data provider error
 */
export interface DataProviderError {
  code: string;
  message: string;
  provider: DataProviderType;
  retryable: boolean;
  retry_after_seconds?: number;
}

/**
 * NGX Pulse specific types
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace NgxPulse {
  export interface Config {
    apiKey: string;
    baseUrl: string;
    timeout: number;
  }

  export interface Response<T> {
    status: "success" | "error";
    data?: T;
    error?: string;
  }

  export interface Quote {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    timestamp: string;
  }

  export interface Candle {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }
}

/**
 * Alpha Vantage specific types
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AlphaVantage {
  export interface Config {
    apiKey: string;
    baseUrl: string;
    datatype: "json" | "csv";
  }

  export interface Quote {
    symbol: string;
    "Global Quote": {
      "01. symbol": string;
      "02. open": string;
      "03. high": string;
      "04. low": string;
      "05. price": string;
      "06. volume": string;
      "10. change percent": string;
    };
  }

  export interface TimeSeries {
    "Time Series (Daily)": Record<
      string,
      {
        "1. open": string;
        "2. high": string;
        "3. low": string;
        "4. close": string;
        "5. volume": string;
      }
    >;
  }
}

/**
 * Finnhub specific types
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Finnhub {
  export interface Config {
    apiKey: string;
    baseUrl: string;
  }

  export interface Quote {
    c: number; // current price
    h: number; // high
    l: number; // low
    o: number; // open
    pc: number; // previous close
    t: number; // timestamp
  }
}

/**
 * Data provider configuration (from config files)
 */
export interface DataProviderConfig {
  provider: DataProviderType;
  enabled: boolean;
  config: NgxPulse.Config | AlphaVantage.Config | Finnhub.Config | Record<string, unknown>;
  cache_ttl_seconds: number;
  rate_limits: RateLimits;
}

/**
 * Data provider factory config
 */
export interface DataProvidersConfig {
  default_provider: DataProviderType;
  providers: DataProviderConfig[];
  fallback_strategy: "first_available" | "round_robin" | "fastest";
  cache: {
    enabled: boolean;
    ttl_seconds: number;
    max_size_mb: number;
  };
}
