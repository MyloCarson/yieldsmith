/**
 * Notification provider types (Telegram, Slack, Discord, Email)
 */

import { JSONValue } from "./common";

/**
 * Notification provider type
 */
export type NotificationProviderType = "telegram" | "slack" | "discord" | "email";

/**
 * Notification message
 */
export interface Notification {
  id: string;
  provider: NotificationProviderType;
  recipient_id: string; // user ID in that platform
  title: string;
  message: string;
  rich_content?: NotificationContent;
  priority: "low" | "medium" | "high" | "urgent";
  timestamp: Date;
  sent_at?: Date;
  status: "pending" | "sent" | "failed" | "read";
  metadata?: JSONValue;
}

/**
 * Rich notification content (structured data)
 */
export interface NotificationContent {
  type: "text" | "card" | "button_group" | "list" | "table";
  content: unknown;
  formatting?: NotificationFormatting;
}

/**
 * Notification formatting options
 */
export interface NotificationFormatting {
  bold?: string[];
  italic?: string[];
  code_blocks?: string[];
  buttons?: NotificationButton[];
  colors?: Record<string, string>;
}

/**
 * Notification button (for interactive messages)
 */
export interface NotificationButton {
  label: string;
  action: string; // callback ID or URL
  style?: "primary" | "secondary" | "danger";
}

/**
 * Notification delivery status
 */
export interface DeliveryStatus {
  notification_id: string;
  status: "pending" | "sent" | "failed" | "bounced";
  provider: NotificationProviderType;
  sent_at?: Date;
  error?: string;
  delivery_time_ms?: number;
}

/**
 * Notification provider interface (contract for all providers)
 */
export interface INotificationProvider {
  provider: NotificationProviderType;
  isConfigured(): boolean;
  send(notification: Notification): Promise<DeliveryStatus>;
  sendInteractive(
    notification: Notification,
    buttons: NotificationButton[]
  ): Promise<DeliveryStatus>;
  getDeliveryStatus(notification_id: string): Promise<DeliveryStatus>;
  validateRecipient(recipient_id: string): Promise<boolean>;
}

/**
 * Telegram-specific types
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Telegram {
  export interface Config {
    botToken: string;
    apiUrl: string;
  }

  export interface Message {
    chat_id: number;
    text: string;
    parse_mode?: "Markdown" | "MarkdownV2" | "HTML";
    reply_markup?: InlineKeyboardMarkup;
    disable_notification?: boolean;
  }

  export interface InlineKeyboardMarkup {
    inline_keyboard: InlineKeyboardButton[][];
  }

  export interface InlineKeyboardButton {
    text: string;
    url?: string;
    callback_data?: string;
    switch_inline_query?: string;
  }

  export interface Update {
    update_id: number;
    message?: Message;
    callback_query?: CallbackQuery;
  }

  export interface CallbackQuery {
    id: string;
    from: User;
    chat_instance: string;
    data?: string;
    inline_message_id?: string;
  }

  export interface User {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  }
}

/**
 * Slack-specific types
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Slack {
  export interface Config {
    botToken: string;
    apiUrl: string;
  }

  export interface Message {
    channel: string;
    text: string;
    blocks?: Block[];
    attachments?: Attachment[];
    thread_ts?: string;
  }

  export interface Block {
    type: "section" | "image" | "button" | "divider" | "context";
    text?: {
      type: "mrkdwn" | "plain_text";
      text: string;
    };
    elements?: unknown[];
  }

  export interface Attachment {
    color?: string;
    title?: string;
    text?: string;
    fields?: Array<{
      title: string;
      value: string;
      short: boolean;
    }>;
  }
}

/**
 * Discord-specific types
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Discord {
  export interface Config {
    webhookUrl: string;
    apiUrl: string;
  }

  export interface Message {
    content?: string;
    embeds?: Embed[];
    components?: Component[];
  }

  export interface Embed {
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{
      name: string;
      value: string;
      inline: boolean;
    }>;
    thumbnail?: {
      url: string;
      height?: number;
      width?: number;
    };
  }

  export interface Component {
    type: number;
    style?: number;
    label?: string;
    custom_id?: string;
  }
}

/**
 * Email-specific types
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Email {
  export interface Config {
    smtpServer: string;
    smtpPort: number;
    fromAddress: string;
    fromName: string;
    username?: string;
    password?: string;
  }

  export interface Message {
    to: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: Attachment[];
  }

  export interface Attachment {
    filename: string;
    content: Buffer;
    contentType: string;
  }
}

/**
 * Notification provider configuration (from config files)
 */
export interface NotificationProviderConfig {
  provider: NotificationProviderType;
  enabled: boolean;
  config: Telegram.Config | Slack.Config | Discord.Config | Email.Config | Record<string, unknown>;
  rate_limits?: {
    messages_per_minute: number;
    messages_per_hour: number;
  };
}

/**
 * Notification factory config
 */
export interface NotificationConfig {
  default_provider: NotificationProviderType;
  providers: NotificationProviderConfig[];
  retry_on_failure: boolean;
  fallback_strategy: "first_available" | "round_robin";
}

/**
 * Notification history
 */
export interface NotificationHistory {
  total_sent: number;
  total_failed: number;
  success_rate: number;
  by_provider: Record<NotificationProviderType, number>;
  by_type: Record<string, number>;
  last_sent: Date;
}
