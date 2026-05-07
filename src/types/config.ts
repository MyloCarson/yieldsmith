/**
 * Configuration types
 * These define the shape of JSON configuration files
 */

import { AIConfig } from "./ai";
import { DataProvidersConfig } from "./data-providers";
import { NotificationConfig } from "./notifications";
import { CriteriaConfig } from "./criteria";
import { StrategyConfig } from "./strategies";

/**
 * Application configuration (main config)
 */
export interface AppConfig {
  app: AppSettings;
  database: DatabaseConfig;
  telegram: TelegramConfig;
  ai: AIConfig;
  dataProviders: DataProvidersConfig;
  notifications: NotificationConfig;
  strategies: StrategyConfig;
  criteria: CriteriaConfig;
  rateLimiting: RateLimitingConfig;
  logging: LoggingConfig;
  caching: CachingConfig;
}

/**
 * App settings
 */
export interface AppSettings {
  name: string;
  version: string;
  environment: "development" | "staging" | "production";
  debug: boolean;
  port: number;
  timezone: string;
  currency: string;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionPoolSize: number;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  logging: boolean;
  migrations: {
    autoRun: boolean;
    directory: string;
  };
}

/**
 * Telegram bot configuration
 */
export interface TelegramConfig {
  token: string;
  webhookUrl?: string;
  pollingTimeout: number;
  apiTimeout: number;
  allowlist: {
    enabled: boolean;
    require_approval: boolean;
  };
  commands: TelegramCommand[];
}

/**
 * Telegram command
 */
export interface TelegramCommand {
  command: string;
  description: string;
  category: "portfolio" | "analysis" | "alerts" | "admin" | "general";
  enabled: boolean;
  rateLimit?: number;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitingConfig {
  enabled: boolean;
  provider: "upstash" | "memory" | "redis";
  upstash?: {
    url: string;
    token: string;
  };
  defaults: {
    messages_per_minute: number;
    api_calls_per_hour: number;
    recommendations_per_day: number;
  };
  premium: {
    messages_per_minute: number;
    api_calls_per_hour: number;
    recommendations_per_day: number;
  };
  admins: {
    apply_limits: boolean;
  };
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error";
  format: "json" | "text";
  transports: LogTransport[];
  errorTracking?: {
    enabled: boolean;
    service: "sentry" | "rollbar";
    dsn: string;
  };
}

/**
 * Log transport
 */
export interface LogTransport {
  type: "console" | "file" | "database";
  level: string;
  options: Record<string, unknown>;
}

/**
 * Caching configuration
 */
export interface CachingConfig {
  enabled: boolean;
  provider: "redis" | "memory" | "upstash";
  ttl: {
    prices: number;
    dividends: number;
    financials: number;
    recommendations: number;
    portfolio: number;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  upstash?: {
    url: string;
    token: string;
  };
}

/**
 * Market configuration
 */
export interface MarketConfig {
  id: string;
  name: string;
  country: string;
  currency: string;
  timezone: string;
  exchange_hours: {
    open: string;
    close: string;
    holidays: string[];
  };
  data_provider: string;
  tax_rate: number; // withholding tax
  transaction_costs: {
    brokerage_percent: number;
    stamp_duty_percent: number;
  };
  enabled: boolean;
}

/**
 * Markets configuration (all markets)
 */
export interface MarketsConfig {
  markets: MarketConfig[];
  default_market: string;
}

/**
 * Feature flags
 */
export interface FeatureFlags {
  ai_recommendations_enabled: boolean;
  price_alerts_enabled: boolean;
  dividend_alerts_enabled: boolean;
  rebalancing_suggestions_enabled: boolean;
  portfolio_optimization_enabled: boolean;
  news_analysis_enabled: boolean;
  sentiment_analysis_enabled: boolean;
  backtesting_enabled: boolean;
}

/**
 * Portfolio configuration
 */
export interface PortfolioConfig {
  goals: {
    annual_dividend_goal: number;
    monthly_investment_amount: number;
  };
  constraints: {
    max_sector_concentration: number;
    min_diversification: number; // min number of stocks
    max_single_holding: number;
    min_trade_amount: number;
  };
  rebalancing: {
    frequency: "monthly" | "quarterly" | "semi-annual" | "annual";
    tolerance: number; // drift tolerance percentage
    method: "equal_weight" | "risk_parity" | "market_cap" | "yield_weighted";
  };
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  enabled: boolean;
  defaults: {
    price_alert_threshold: number; // percentage change
    dividend_alert_min_yield: number;
    quiet_hours_start: string; // HH:MM
    quiet_hours_end: string; // HH:MM
    max_alerts_per_day: number;
  };
  types: {
    price_alerts: boolean;
    dividend_alerts: boolean;
    earnings_alerts: boolean;
    news_alerts: boolean;
    rebalancing_alerts: boolean;
  };
}

/**
 * Load configuration from file
 */
export interface ConfigLoader {
  load(path: string): Promise<AppConfig>;
  validate(config: AppConfig): boolean;
  getSection<T>(section: string): T;
}

/**
 * Environment-specific config overrides
 */
export interface EnvironmentConfig {
  development: Partial<AppConfig>;
  staging: Partial<AppConfig>;
  production: Partial<AppConfig>;
}
