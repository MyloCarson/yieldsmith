/**
 * Notification Provider Interface
 * Defines contract for notification service implementations
 * Examples: TelegramProvider, SlackProvider, DiscordProvider, EmailProvider
 */

import { NotificationProviderType } from "@/types/notifications";
import { AlertPriority } from "@/types/alerts";
import { HealthCheckResult } from "./market";

/**
 * Notification provider implementation contract
 */
export interface INotificationProvider {
  /**
   * Provider identifier
   * e.g., "telegram", "slack", "discord", "email"
   */
  readonly id: NotificationProviderType;

  /**
   * Provider display name
   */
  readonly name: string;

  /**
   * Check if provider is properly configured with credentials
   */
  isConfigured(): boolean;

  /**
   * Send a simple text notification
   *
   * @param userId - User identifier (Telegram user_id or email/slack handle)
   * @param title - Notification title
   * @param message - Notification message
   * @param priority - Message priority
   * @param options - Optional provider-specific settings
   * @returns Delivery status with message ID and delivery time
   */
  send(
    userId: string,
    title: string,
    message: string,
    priority?: AlertPriority,
    options?: NotificationOptions
  ): Promise<DeliveryResult>;

  /**
   * Send an interactive notification with buttons/actions
   *
   * @param userId - User identifier
   * @param title - Notification title
   * @param message - Notification message
   * @param buttons - Action buttons
   * @param priority - Message priority
   * @param options - Optional provider-specific settings
   * @returns Delivery status with message ID
   */
  sendInteractive(
    userId: string,
    title: string,
    message: string,
    buttons: NotificationButton[],
    priority?: AlertPriority,
    options?: NotificationOptions
  ): Promise<DeliveryResult>;

  /**
   * Send a rich formatted notification (card, embed, etc.)
   *
   * @param userId - User identifier
   * @param content - Rich notification content
   * @param priority - Message priority
   * @param options - Optional provider-specific settings
   * @returns Delivery status with message ID
   */
  sendRich(
    userId: string,
    content: RichNotificationContent,
    priority?: AlertPriority,
    options?: NotificationOptions
  ): Promise<DeliveryResult>;

  /**
   * Get delivery status of a previously sent notification
   *
   * @param messageId - Message ID returned from send/sendInteractive
   * @returns Delivery status with timestamps and any errors
   */
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;

  /**
   * Validate that a recipient can receive notifications
   *
   * @param recipientId - User identifier to validate
   * @returns True if recipient is valid and reachable
   */
  validateRecipient(recipientId: string): Promise<boolean>;

  /**
   * Get remaining quota/rate limit information
   */
  getRateLimitInfo(): Promise<RateLimitInfo>;

  /**
   * Check if provider is currently rate limited
   */
  isRateLimited(): Promise<boolean>;

  /**
   * Initialize provider (validate config, test connection, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Test provider connection and configuration
   */
  healthCheck(): Promise<HealthCheckResult>;

  /**
   * Get provider capabilities and supported features
   */
  getCapabilities(): NotificationCapabilities;
}

/**
 * Notification options (provider-specific settings)
 */
export interface NotificationOptions {
  /**
   * Schedule notification for future delivery
   */
  scheduledFor?: Date;

  /**
   * Notification expiration (auto-delete after this time)
   */
  expiresAt?: Date;

  /**
   * Whether to mute/silent the notification
   */
  silent?: boolean;

  /**
   * Custom metadata for the notification
   */
  metadata?: Record<string, unknown>;

  /**
   * Provider-specific options (e.g., Telegram: parse_mode, reply_markup)
   */
  providerOptions?: Record<string, unknown>;

  /**
   * Tags for grouping/filtering notifications
   */
  tags?: string[];

  /**
   * Whether to aggregate similar notifications
   */
  aggregate?: boolean;
}

/**
 * Notification button/action
 */
export interface NotificationButton {
  /**
   * Button label
   */
  label: string;

  /**
   * Action to perform when clicked
   */
  action: string;

  /**
   * Button style (primary, secondary, danger, etc.)
   */
  style?: "primary" | "secondary" | "danger" | "success";

  /**
   * Callback data (for inline buttons)
   */
  callbackData?: string;

  /**
   * URL (for link buttons)
   */
  url?: string;
}

/**
 * Rich notification content (for cards, embeds, etc.)
 */
export interface RichNotificationContent {
  /**
   * Content type
   */
  type: "card" | "embed" | "message" | "table" | "list";

  /**
   * Main title
   */
  title: string;

  /**
   * Description/body
   */
  description?: string;

  /**
   * Color (hex code or semantic: success, warning, error, info)
   */
  color?: string;

  /**
   * Thumbnail/image URL
   */
  imageUrl?: string;

  /**
   * Fields (key-value pairs)
   */
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;

  /**
   * Footer text
   */
  footer?: string;

  /**
   * Timestamp for the content
   */
  timestamp?: Date;

  /**
   * Action buttons
   */
  buttons?: NotificationButton[];
}

/**
 * Delivery result from sending a notification
 */
export interface DeliveryResult {
  /**
   * Message ID for tracking
   */
  messageId: string;

  /**
   * Delivery status
   */
  status: "sent" | "pending" | "failed";

  /**
   * When the notification was sent
   */
  sentAt: Date;

  /**
   * Delivery time in milliseconds
   */
  deliveryTimeMs: number;

  /**
   * Error message if delivery failed
   */
  error?: string;

  /**
   * Retry information if applicable
   */
  retryable?: boolean;

  /**
   * Provider-specific metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Delivery status of a notification
 */
export interface DeliveryStatus {
  /**
   * Message ID
   */
  messageId: string;

  /**
   * Current status
   */
  status: "sent" | "delivered" | "read" | "failed" | "pending" | "expired";

  /**
   * When the message was sent
   */
  sentAt: Date;

  /**
   * When the message was delivered (if applicable)
   */
  deliveredAt?: Date;

  /**
   * When the message was read (if supported by provider)
   */
  readAt?: Date;

  /**
   * Error message if applicable
   */
  error?: string;

  /**
   * Whether the message can be retried
   */
  retryable: boolean;

  /**
   * Number of delivery attempts
   */
  attempts: number;

  /**
   * Provider-specific metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  /**
   * Requests remaining in current window
   */
  remaining: number;

  /**
   * Total limit for the window
   */
  total: number;

  /**
   * When the limit resets
   */
  resetAt: Date;

  /**
   * Percentage of quota used
   */
  percentage: number;

  /**
   * Window size in seconds
   */
  windowSeconds: number;
}

export { HealthCheckResult };

/**
 * Notification provider capabilities
 */
export interface NotificationCapabilities {
  /**
   * Supported notification types
   */
  supportsText: boolean;
  supportsRich: boolean;
  supportsInteractive: boolean;
  supportsScheduling: boolean;
  supportsRead: boolean;
  supportsReactions: boolean;

  /**
   * Character/content limits
   */
  maxTitleLength: number;
  maxMessageLength: number;
  maxButtonsPerMessage: number;

  /**
   * Features
   */
  supportsBatching: boolean;
  supportsAggregation: boolean;
  supportsThreading: boolean;
  supportsFormatting: boolean;

  /**
   * Formatting options
   */
  supportedFormats?: Array<"bold" | "italic" | "code" | "link" | "emoji" | "html" | "markdown">;

  /**
   * Delivery guarantees
   */
  deliveryGuarantee: "at-most-once" | "at-least-once" | "exactly-once";

  /**
   * Approximate delivery latency in milliseconds
   */
  averageLatencyMs: number;

  /**
   * Maximum messages per minute (if applicable)
   */
  maxMessagesPerMinute?: number;
}

/**
 * Notification provider factory
 */
export interface INotificationProviderFactory {
  /**
   * Create a notification provider by type
   */
  createProvider(providerType: NotificationProviderType): Promise<INotificationProvider>;

  /**
   * Get default provider
   */
  getDefaultProvider(): Promise<INotificationProvider>;

  /**
   * Get all configured providers
   */
  getAllProviders(): Promise<INotificationProvider[]>;

  /**
   * Register a custom provider
   */
  registerProvider(provider: INotificationProvider): void;

  /**
   * Get provider by type
   */
  getProvider(providerType: NotificationProviderType): Promise<INotificationProvider | null>;

  /**
   * Get fallback provider if primary fails
   */
  getFallbackProvider(primaryType: NotificationProviderType): Promise<INotificationProvider | null>;
}
