/**
 * User and authentication types
 */

import { TelegramUserId, UUID } from "./common";
import { AlertPriority, NotificationProvider } from "./alerts";
import { AIProvider } from "./recommendations";

/**
 * Telegram user from the Telegram API
 */
export interface TelegramUser {
  id: TelegramUserId;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

/**
 * Yieldsmith user (database record)
 */
export interface User {
  user_id: TelegramUserId;
  telegram_username?: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  subscription_tier: SubscriptionTier;
  subscription_expires_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_active_at?: Date;
}

/**
 * Subscription tier levels
 */
export type SubscriptionTier = "free" | "premium" | "trial";

/**
 * User creation input
 */
export interface CreateUserInput {
  user_id: TelegramUserId;
  telegram_username?: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

/**
 * User update input
 */
export interface UpdateUserInput {
  email?: string;
  phone?: string;
  subscription_tier?: SubscriptionTier;
  is_active?: boolean;
}

/**
 * Allowlist entry (beta testing control)
 */
export interface AllowlistEntry {
  id: UUID;
  user_id: TelegramUserId;
  telegram_username?: string;
  status: AllowlistStatus;
  requested_at: Date;
  approved_at?: Date;
  approved_by?: string;
  approval_reason?: string;
  rejection_reason?: string;
  first_usage_at?: Date;
  last_usage_at?: Date;
  total_messages_sent: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Allowlist status
 */
export type AllowlistStatus = "pending" | "approved" | "rejected" | "suspended";

/**
 * Check if user can access the bot
 */
export interface AllowlistCheck {
  user_id: TelegramUserId;
  allowed: boolean;
  status: AllowlistStatus;
  reason?: string;
}

/**
 * JWT payload with Telegram user ID
 */
export interface JWTPayload {
  user_id: TelegramUserId;
  role: "authenticated" | "admin";
  iat: number;
  exp: number;
}

/**
 * Authentication context for requests
 */
export interface AuthContext {
  user_id: TelegramUserId;
  isAuthenticated: boolean;
  role: "authenticated" | "admin";
  subscription_tier: SubscriptionTier;
}

/**
 * Session information
 */
export interface Session {
  userId: TelegramUserId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * User preferences (from user_settings table)
 */
export interface UserPreferences {
  user_id: TelegramUserId;
  annual_dividend_goal: number;
  monthly_investment_amount: number;
  total_portfolio_value: number;
  preferred_strategies: string[];
  risk_tolerance: RiskTolerance;
  preferred_markets: string[];
  excluded_sectors: string[];
  concentration_limit: number; // percentage
  notification_provider: NotificationProvider;
  notify_price_alerts: boolean;
  notify_dividend_alerts: boolean;
  notify_rebalancing: boolean;
  notify_recommendations: boolean;
  alert_priority_min: AlertPriority;
  show_tax_adjusted_yield: boolean;
  currency_code: string;
  date_format: string;
  number_format: string;
  use_ai_recommendations: boolean;
  ai_provider: AIProvider;
  verbose_mode: boolean;
  demo_mode: boolean;
  allow_data_collection: boolean;
  allow_research_sharing: boolean;
  last_portfolio_sync: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Risk tolerance levels
 */
export type RiskTolerance = "conservative" | "moderate" | "aggressive";

export { AlertPriority, NotificationProvider, AIProvider };
