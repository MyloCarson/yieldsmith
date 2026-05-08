import { StockSymbol, MarketId, DateOnly } from "@/types/common";

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

export interface IStockDataProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  initialize(): Promise<void>;
  healthCheck(): Promise<{ healthy: boolean; status: string }>;
  getCurrentPrice(symbol: StockSymbol, marketId: MarketId): Promise<PriceSnapshot>;
  getHistoricalPrices(
    symbol: StockSymbol,
    marketId: MarketId,
    days: number
  ): Promise<HistoricalPrice[]>;
  getLatestDividend(symbol: StockSymbol, marketId: MarketId): Promise<DividendData | null>;
  getDividendHistory(symbol: StockSymbol, marketId: MarketId): Promise<DividendData[]>;
  getFinancials(symbol: StockSymbol, marketId: MarketId): Promise<FinancialData | null>;
  searchStocks(query: string, limit?: number): Promise<StockSearchResult[]>;
  validateSymbol(symbol: StockSymbol): Promise<boolean>;
}
