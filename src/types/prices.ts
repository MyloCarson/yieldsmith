/**
 * Price history and technical analysis types
 */

import { StockSymbol, MarketId, DateOnly, UUID } from "./common";

/**
 * OHLCV (Open, High, Low, Close, Volume) candle
 */
export interface PriceCandle {
  id: UUID;
  symbol: StockSymbol;
  market_id: MarketId;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  recorded_date: DateOnly;
  recorded_at: Date;
  data_source: string;
  is_valid: boolean;
}

/**
 * Price history record (single day)
 */
export interface PriceHistory {
  id: UUID;
  symbol: StockSymbol;
  market_id: MarketId;
  open_price?: number;
  price: number; // close price
  high_price?: number;
  low_price?: number;
  volume?: number;
  recorded_date: DateOnly;
  recorded_at: Date;
  data_source: string;
  is_valid: boolean;
  updated_at: Date;
}

/**
 * Price snapshot (current price with timestamp)
 */
export interface PriceSnapshot {
  symbol: StockSymbol;
  market_id: MarketId;
  current_price: number;
  previous_close: number;
  change: number;
  change_percent: number;
  timestamp: Date;
  source: string;
}

/**
 * Moving averages
 */
export interface MovingAverages {
  symbol: StockSymbol;
  market_id: MarketId;
  ma_20: number; // 20-day moving average
  ma_50: number; // 50-day moving average
  ma_200: number; // 200-day moving average
  current_price: number;
  position_to_20d: number; // % above/below 20-day MA
  position_to_50d: number; // % above/below 50-day MA
  position_to_200d: number; // % above/below 200-day MA
  as_of_date: DateOnly;
}

/**
 * Price trend analysis
 */
export interface PriceTrend {
  symbol: StockSymbol;
  market_id: MarketId;
  trend: "uptrend" | "downtrend" | "sideways" | "consolidation";
  trend_strength: "strong" | "moderate" | "weak";
  recent_high: number;
  recent_low: number;
  days_in_trend: number;
  momentum: number; // -100 to +100
  rsi: number; // relative strength index 0-100
  macd_signal: "bullish" | "bearish" | "neutral";
  as_of_date: DateOnly;
}

/**
 * Price range (52-week, etc.)
 */
export interface PriceRange {
  symbol: StockSymbol;
  market_id: MarketId;
  high_52w: number;
  low_52w: number;
  high_52w_date: DateOnly;
  low_52w_date: DateOnly;
  current_price: number;
  pct_from_52w_high: number;
  pct_from_52w_low: number;
  as_of_date: DateOnly;
}

/**
 * Price volatility
 */
export interface Volatility {
  symbol: StockSymbol;
  market_id: MarketId;
  daily_volatility: number; // standard deviation of daily returns
  annualized_volatility: number;
  beta: number; // relative to market
  current_price: number;
  as_of_date: DateOnly;
}

/**
 * Technical indicator
 */
export interface TechnicalIndicator {
  symbol: StockSymbol;
  market_id: MarketId;
  name: string; // RSI, MACD, Bollinger Bands, etc.
  value: number;
  signal?: number;
  strength: "strong" | "moderate" | "weak";
  interpretation: string;
  as_of_date: DateOnly;
}

/**
 * Price alert trigger
 */
export interface PriceTrigger {
  symbol: StockSymbol;
  market_id: MarketId;
  trigger_type: "above" | "below" | "change_percent";
  trigger_value: number;
  current_price: number;
  triggered: boolean;
  triggered_at?: Date;
}

/**
 * Historical price analysis
 */
export interface PriceAnalysis {
  symbol: StockSymbol;
  market_id: MarketId;
  current_price: number;
  average_price_30d: number;
  average_price_90d: number;
  average_price_1y: number;
  median_price_30d: number;
  std_dev_30d: number;
  price_change_30d: number;
  price_change_90d: number;
  price_change_1y: number;
  as_of_date: DateOnly;
}

/**
 * Order book data (if available)
 */
export interface OrderBook {
  symbol: StockSymbol;
  market_id: MarketId;
  bid_price: number;
  ask_price: number;
  bid_volume: number;
  ask_volume: number;
  spread: number;
  spread_percent: number;
  depth: {
    bids: Array<[number, number]>; // [price, volume]
    asks: Array<[number, number]>;
  };
  timestamp: Date;
}
