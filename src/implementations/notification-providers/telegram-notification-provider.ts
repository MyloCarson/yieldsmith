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
const TELEGRAM_MAX_CALLBACK_DATA_BYTES = 64;
const SENT_AT_MAP_MAX_SIZE = 1000;

const PRIORITY_EMOJI: Record<AlertPriority, string> = {
  low: "🔵",
  medium: "🟡",
  high: "🟠",
  urgent: "🔴",
};

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
    const emoji = priority ? PRIORITY_EMOJI[priority] : "";
    return `${emoji ? `${emoji} ` : ""}<b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}`;
  }

  private recordSentAt(compositeId: string, sentAt: Date): void {
    if (this.sentAtMap.size >= SENT_AT_MAP_MAX_SIZE) {
      const oldestKey = this.sentAtMap.keys().next().value;
      if (oldestKey !== undefined) this.sentAtMap.delete(oldestKey);
    }
    this.sentAtMap.set(compositeId, sentAt);
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
      validateMessageLength(text);
      const sentAt = new Date();
      const sentMessage = await this.getBot().telegram.sendMessage(userId, text, {
        parse_mode: "HTML",
        ...(options?.silent ? { disable_notification: true } : {}),
      });
      const compositeId = `${userId}:${sentMessage.message_id}`;
      this.recordSentAt(compositeId, sentAt);
      return buildDeliveryResult(compositeId, sentAt);
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
      validateMessageLength(text);
      const inlineKeyboard = buildInlineKeyboard(buttons);
      const sentAt = new Date();
      const sentMessage = await this.getBot().telegram.sendMessage(userId, text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: inlineKeyboard },
        ...(options?.silent ? { disable_notification: true } : {}),
      });
      const compositeId = `${userId}:${sentMessage.message_id}`;
      this.recordSentAt(compositeId, sentAt);
      return buildDeliveryResult(compositeId, sentAt);
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
      validateMessageLength(text);
      const inlineKeyboard = content.buttons ? buildInlineKeyboard(content.buttons) : undefined;
      const sentAt = new Date();
      const sentMessage = await this.getBot().telegram.sendMessage(userId, text, {
        parse_mode: "HTML",
        ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {}),
        ...(options?.silent ? { disable_notification: true } : {}),
      });
      const compositeId = `${userId}:${sentMessage.message_id}`;
      this.recordSentAt(compositeId, sentAt);
      return buildDeliveryResult(compositeId, sentAt);
    } catch (error) {
      if (isInvalidChatError(error)) throw new InvalidRecipientError(userId);
      this.handleError("sendRich", error);
    }
  }

  getDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    const sentAt = this.sentAtMap.get(messageId);
    if (!sentAt) {
      throw new NotificationError(
        "UNKNOWN_MESSAGE_ID",
        `No tracking data for message "${messageId}"`
      );
    }
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

function validateMessageLength(text: string): void {
  if (text.length > TELEGRAM_MAX_MESSAGE_LENGTH) {
    throw new NotificationError(
      "MESSAGE_TOO_LONG",
      `Message length ${text.length} exceeds Telegram limit of ${TELEGRAM_MAX_MESSAGE_LENGTH} characters`
    );
  }
}

function buildInlineKeyboard(buttons: NotificationButton[]): InlineKeyboardButton[][] {
  if (buttons.length > TELEGRAM_MAX_BUTTONS_TOTAL) {
    throw new NotificationError(
      "TOO_MANY_BUTTONS",
      `Button count ${buttons.length} exceeds Telegram limit of ${TELEGRAM_MAX_BUTTONS_TOTAL}`
    );
  }
  for (const button of buttons) {
    const callbackData = button.callbackData ?? button.action;
    if (!button.url && Buffer.byteLength(callbackData, "utf8") > TELEGRAM_MAX_CALLBACK_DATA_BYTES) {
      throw new NotificationError(
        "CALLBACK_DATA_TOO_LONG",
        `Callback data for button "${button.label}" exceeds ${TELEGRAM_MAX_CALLBACK_DATA_BYTES} bytes`
      );
    }
  }
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
  const lines: string[] = [];

  if (priority) lines.push(PRIORITY_EMOJI[priority]);
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
