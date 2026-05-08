import { Telegraf, Markup } from "telegraf";
import type { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import {
  NotificationOptions,
  NotificationButton,
  RichNotificationContent,
  DeliveryResult,
  DeliveryStatus,
  RateLimitInfo,
  NotificationCapabilities,
  HealthCheckResult,
} from "@core/notification-provider";
import { AlertPriority } from "@/types/alerts";
import { NotificationError, InvalidRecipientError } from "@core/errors";
import { BaseNotificationProvider } from "./base-notification-provider";

export interface TelegramNotificationProviderConfig {
  botToken?: string;
}

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
const TELEGRAM_MAX_BUTTONS_PER_ROW = 8;
const TELEGRAM_MAX_BUTTONS_TOTAL = 100;

export class TelegramNotificationProvider extends BaseNotificationProvider {
  readonly id = "telegram";
  readonly name = "Telegram";

  private readonly botToken: string | undefined;
  private bot: Telegraf | null = null;
  private readonly sentAtMap = new Map<string, Date>();

  constructor(config?: TelegramNotificationProviderConfig) {
    super();
    this.botToken = config?.botToken ?? process.env["TELEGRAM_BOT_TOKEN"];
  }

  isConfigured(): boolean {
    return !!this.botToken;
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.bot = new Telegraf(this.botToken!);
  }

  private getBot(): Telegraf {
    this.ensureInitialized();
    if (!this.bot) {
      throw new NotificationError("NOT_INITIALIZED", "Telegram bot not created");
    }
    return this.bot;
  }

  private formatMessage(title: string, message: string, priority?: AlertPriority): string {
    const priorityEmoji: Record<AlertPriority, string> = {
      low: "🔵",
      medium: "🟡",
      high: "🟠",
      urgent: "🔴",
    };
    const emoji = priority ? priorityEmoji[priority] : "";
    return `${emoji ? `${emoji} ` : ""}<b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}`;
  }

  async send(
    userId: string,
    title: string,
    message: string,
    priority?: AlertPriority,
    options?: NotificationOptions
  ): Promise<DeliveryResult> {
    try {
      const text = this.formatMessage(title, message, priority);
      const sentAt = new Date();
      const sentMessage = await this.getBot().telegram.sendMessage(userId, text, {
        parse_mode: "HTML",
        ...(options?.silent ? { disable_notification: true } : {}),
      });
      const messageId = String(sentMessage.message_id);
      this.sentAtMap.set(messageId, sentAt);
      return buildDeliveryResult(messageId, sentAt);
    } catch (error) {
      if (isInvalidChatError(error)) throw new InvalidRecipientError(userId);
      this.handleError("send", error);
    }
  }

  async sendInteractive(
    userId: string,
    title: string,
    message: string,
    buttons: NotificationButton[],
    priority?: AlertPriority,
    options?: NotificationOptions
  ): Promise<DeliveryResult> {
    try {
      const text = this.formatMessage(title, message, priority);
      const inlineKeyboard = buildInlineKeyboard(buttons);
      const sentAt = new Date();
      const sentMessage = await this.getBot().telegram.sendMessage(userId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: inlineKeyboard },
        ...(options?.silent ? { disable_notification: true } : {}),
      });
      const messageId = String(sentMessage.message_id);
      this.sentAtMap.set(messageId, sentAt);
      return buildDeliveryResult(messageId, sentAt);
    } catch (error) {
      if (isInvalidChatError(error)) throw new InvalidRecipientError(userId);
      this.handleError("sendInteractive", error);
    }
  }

  async sendRich(
    userId: string,
    content: RichNotificationContent,
    priority?: AlertPriority,
    options?: NotificationOptions
  ): Promise<DeliveryResult> {
    try {
      const text = buildRichText(content, priority);
      const inlineKeyboard = content.buttons ? buildInlineKeyboard(content.buttons) : undefined;
      const sentAt = new Date();
      const sentMessage = await this.getBot().telegram.sendMessage(userId, text, {
        parse_mode: "HTML",
        ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {}),
        ...(options?.silent ? { disable_notification: true } : {}),
      });
      const messageId = String(sentMessage.message_id);
      this.sentAtMap.set(messageId, sentAt);
      return buildDeliveryResult(messageId, sentAt);
    } catch (error) {
      if (isInvalidChatError(error)) throw new InvalidRecipientError(userId);
      this.handleError("sendRich", error);
    }
  }

  getDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    const sentAt = this.sentAtMap.get(messageId) ?? new Date();
    return Promise.resolve({
      messageId,
      status: "sent",
      sentAt,
      retryable: false,
      attempts: 1,
    });
  }

  async validateRecipient(recipientId: string): Promise<boolean> {
    try {
      await this.getBot().telegram.sendChatAction(recipientId, "typing");
      return true;
    } catch (error) {
      if (error instanceof NotificationError) throw error;
      return false;
    }
  }

  getRateLimitInfo(): Promise<RateLimitInfo> {
    // Telegram allows 30 messages/second globally, 1/second per chat
    return Promise.resolve({
      remaining: 30,
      total: 30,
      resetAt: new Date(Date.now() + 1_000),
      percentage: 0,
      windowSeconds: 1,
    });
  }

  isRateLimited(): Promise<boolean> {
    return Promise.resolve(false);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const botInfo = await this.getBot().telegram.getMe();
      return {
        healthy: !!botInfo.id,
        status: "operational",
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        status: "down",
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : "unknown error",
      };
    }
  }

  getCapabilities(): NotificationCapabilities {
    return {
      supportsText: true,
      supportsRich: true,
      supportsInteractive: true,
      supportsScheduling: false,
      supportsRead: false,
      supportsReactions: false,
      maxTitleLength: 200,
      maxMessageLength: TELEGRAM_MAX_MESSAGE_LENGTH,
      maxButtonsPerMessage: TELEGRAM_MAX_BUTTONS_TOTAL,
      supportsBatching: false,
      supportsAggregation: false,
      supportsThreading: false,
      supportsFormatting: true,
      supportedFormats: ["bold", "italic", "code", "link", "html"],
      deliveryGuarantee: "at-least-once",
      averageLatencyMs: 300,
      maxMessagesPerMinute: 20,
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildInlineKeyboard(buttons: NotificationButton[]): InlineKeyboardButton[][] {
  const allButtons = buttons.map((button) =>
    button.url
      ? Markup.button.url(button.label, button.url)
      : Markup.button.callback(button.label, button.callbackData ?? button.action)
  );
  const rows: (typeof allButtons)[] = [];
  for (let index = 0; index < allButtons.length; index += TELEGRAM_MAX_BUTTONS_PER_ROW) {
    rows.push(allButtons.slice(index, index + TELEGRAM_MAX_BUTTONS_PER_ROW));
  }
  return Markup.inlineKeyboard(rows).reply_markup.inline_keyboard;
}

function buildRichText(content: RichNotificationContent, priority?: AlertPriority): string {
  const priorityEmoji: Record<AlertPriority, string> = {
    low: "🔵",
    medium: "🟡",
    high: "🟠",
    urgent: "🔴",
  };
  const lines: string[] = [];

  if (priority) lines.push(priorityEmoji[priority]);
  lines.push(`<b>${escapeHtml(content.title)}</b>`);
  if (content.description) lines.push(`\n${escapeHtml(content.description)}`);

  if (content.fields?.length) {
    lines.push("");
    for (const field of content.fields) {
      lines.push(`<b>${escapeHtml(field.name)}:</b> ${escapeHtml(field.value)}`);
    }
  }

  if (content.footer) lines.push(`\n<i>${escapeHtml(content.footer)}</i>`);

  return lines.join("\n");
}

function buildDeliveryResult(messageId: string, sentAt: Date): DeliveryResult {
  return {
    messageId,
    status: "sent",
    sentAt,
    deliveryTimeMs: 0,
  };
}

function isInvalidChatError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("chat not found") ||
    message.includes("user not found") ||
    message.includes("blocked")
  );
}
