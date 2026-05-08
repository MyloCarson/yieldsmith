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
import { BaseNotificationProvider } from "./base-notification-provider";

export class MockNotificationProvider extends BaseNotificationProvider {
  readonly id = "mock";
  readonly name = "Mock Notification Provider";

  private sentMessages: Array<{ userId: string; title: string; message: string }> = [];

  isConfigured(): boolean {
    return true;
  }

  send(
    userId: string,
    title: string,
    message: string,
    _priority?: AlertPriority,
    _options?: NotificationOptions
  ): Promise<DeliveryResult> {
    this.sentMessages.push({ userId, title, message });
    return Promise.resolve(buildMockDeliveryResult());
  }

  sendInteractive(
    userId: string,
    title: string,
    message: string,
    _buttons: NotificationButton[],
    _priority?: AlertPriority,
    _options?: NotificationOptions
  ): Promise<DeliveryResult> {
    this.sentMessages.push({ userId, title, message });
    return Promise.resolve(buildMockDeliveryResult());
  }

  sendRich(
    userId: string,
    content: RichNotificationContent,
    _priority?: AlertPriority,
    _options?: NotificationOptions
  ): Promise<DeliveryResult> {
    this.sentMessages.push({ userId, title: content.title, message: content.description ?? "" });
    return Promise.resolve(buildMockDeliveryResult());
  }

  getDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    return Promise.resolve({
      messageId,
      status: "delivered",
      sentAt: new Date(),
      deliveredAt: new Date(),
      retryable: false,
      attempts: 1,
    });
  }

  validateRecipient(_recipientId: string): Promise<boolean> {
    return Promise.resolve(true);
  }

  getRateLimitInfo(): Promise<RateLimitInfo> {
    return Promise.resolve({
      remaining: 9999,
      total: 9999,
      resetAt: new Date(Date.now() + 3_600_000),
      percentage: 0,
      windowSeconds: 3600,
    });
  }

  isRateLimited(): Promise<boolean> {
    return Promise.resolve(false);
  }

  healthCheck(): Promise<HealthCheckResult> {
    return Promise.resolve({ healthy: true, status: "operational", lastCheck: new Date() });
  }

  getCapabilities(): NotificationCapabilities {
    return {
      supportsText: true,
      supportsRich: true,
      supportsInteractive: true,
      supportsScheduling: false,
      supportsRead: true,
      supportsReactions: false,
      maxTitleLength: 9999,
      maxMessageLength: 9999,
      maxButtonsPerMessage: 99,
      supportsBatching: true,
      supportsAggregation: true,
      supportsThreading: false,
      supportsFormatting: false,
      deliveryGuarantee: "exactly-once",
      averageLatencyMs: 0,
    };
  }

  getSentMessages(): Array<{ userId: string; title: string; message: string }> {
    return [...this.sentMessages];
  }

  clearSentMessages(): void {
    this.sentMessages = [];
  }
}

function buildMockDeliveryResult(): DeliveryResult {
  return {
    messageId: `mock-${Date.now()}`,
    status: "sent",
    sentAt: new Date(),
    deliveryTimeMs: 0,
  };
}
