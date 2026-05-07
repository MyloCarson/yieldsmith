/**
 * Alert and notification types
 */

import { TelegramUserId, UUID, StockSymbol, MarketId, DateOnly, JSONValue } from "./common";

/**
 * Alert in the system
 */
export interface Alert {
  id: UUID;
  user_id: TelegramUserId;
  symbol?: StockSymbol;
  market_id?: MarketId;
  alert_type: AlertType;
  title: string;
  message: string;
  status: AlertStatus;
  priority: AlertPriority;
  severity: AlertSeverity;
  notification_provider: NotificationProvider;
  notification_message_id?: string;
  scheduled_for?: Date;
  expires_at?: Date;
  is_dismissed: boolean;
  action_taken: boolean;
  action_description?: string;
  alert_data?: JSONValue; // rich structured data for formatting
  created_at: Date;
  updated_at: Date;
}

/**
 * Alert type
 */
export type AlertType =
  | "dividend_announcement"
  | "dividend_payment"
  | "price_alert"
  | "price_target_reached"
  | "earnings_announcement"
  | "earnings_surprise"
  | "rebalance_suggestion"
  | "portfolio_milestone"
  | "recommendation_generated"
  | "rate_limit_warning"
  | "portfolio_risk_alert"
  | "news_alert"
  | "maintenance_notification"
  | "system_alert";

/**
 * Alert status
 */
export type AlertStatus = "pending" | "sent" | "dismissed" | "failed" | "expired";

/**
 * Alert priority
 */
export type AlertPriority = "low" | "medium" | "high" | "urgent";

/**
 * Alert severity
 */
export type AlertSeverity = "info" | "warning" | "critical";

/**
 * Notification provider
 */
export type NotificationProvider = "telegram" | "slack" | "discord" | "email";

/**
 * Price alert configuration
 */
export interface PriceAlert {
  symbol: StockSymbol;
  market_id: MarketId;
  alert_type: "above" | "below" | "change_percent";
  trigger_value: number;
  current_price: number;
  triggered: boolean;
}

/**
 * Dividend alert configuration
 */
export interface DividendAlert {
  symbol: StockSymbol;
  market_id: MarketId;
  alert_type: "announcement" | "ex_date" | "payment_date";
  dividend_per_share: number;
  ex_date: DateOnly;
  payment_date: DateOnly;
  already_notified: boolean;
}

/**
 * Create alert input
 */
export interface CreateAlertInput {
  symbol?: StockSymbol;
  market_id?: MarketId;
  alert_type: AlertType;
  title: string;
  message: string;
  priority: AlertPriority;
  severity: AlertSeverity;
  notification_provider: NotificationProvider;
  scheduled_for?: Date;
  expires_at?: Date;
  alert_data?: JSONValue;
}

/**
 * Update alert input
 */
export interface UpdateAlertInput {
  status?: AlertStatus;
  is_dismissed?: boolean;
  action_taken?: boolean;
  action_description?: string;
}

/**
 * Alert statistics
 */
export interface AlertStats {
  user_id: TelegramUserId;
  total_alerts: number;
  pending_alerts: number;
  sent_alerts: number;
  dismissed_alerts: number;
  failed_alerts: number;
  alerts_by_type: Record<AlertType, number>;
  alerts_by_priority: Record<AlertPriority, number>;
  last_alert_at?: Date;
}

/**
 * Dividend alert notification data
 */
export interface DividendAlertData {
  symbol: StockSymbol;
  company_name: string;
  dividend_per_share: number;
  dividend_type: string;
  ex_date: DateOnly;
  payment_date: DateOnly;
  tax_adjusted_yield: number;
  user_holding_shares: number;
  expected_payment: number;
}

/**
 * Price alert notification data
 */
export interface PriceAlertData {
  symbol: StockSymbol;
  company_name: string;
  trigger_type: string;
  trigger_value: number;
  current_price: number;
  change_percent: number;
  recommendation?: string;
}

/**
 * Recommendation alert notification data
 */
export interface RecommendationAlertData {
  symbol: StockSymbol;
  company_name: string;
  recommended_amount: number;
  confidence: string;
  reason: string;
  target_price?: number;
  upside_downside?: number;
}

/**
 * Alert rules/preferences
 */
export interface AlertRules {
  user_id: TelegramUserId;
  enable_price_alerts: boolean;
  price_alert_threshold: number; // percentage change
  enable_dividend_alerts: boolean;
  dividend_alert_min_yield: number;
  enable_recommendations: boolean;
  enable_portfolio_alerts: boolean;
  enable_news_alerts: boolean;
  quiet_hours_start?: string; // HH:MM
  quiet_hours_end?: string; // HH:MM
  max_alerts_per_day: number;
  alert_aggregation: "individual" | "daily_digest" | "weekly_digest";
}

/**
 * Alert delivery status
 */
export interface AlertDeliveryStatus {
  alert_id: UUID;
  provider: NotificationProvider;
  status: "pending" | "sent" | "failed";
  message_id?: string;
  sent_at?: Date;
  error?: string;
  retry_count: number;
}
