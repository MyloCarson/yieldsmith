import {
  INotificationProvider,
  NotificationOptions,
  NotificationButton,
  RichNotificationContent,
  DeliveryResult,
  DeliveryStatus,
  RateLimitInfo,
  NotificationCapabilities,
  HealthCheckResult,
} from "@core/notification-provider";
import { NotificationProviderType } from "@/types/notifications";
import { AlertPriority } from "@/types/alerts";
import { NotificationError, ConfigurationError } from "@core/errors";

export abstract class BaseNotificationProvider implements INotificationProvider {
  abstract readonly id: NotificationProviderType;
  abstract readonly name: string;

  protected initialized = false;

  abstract isConfigured(): boolean;

  initialize(): Promise<void> {
    if (!this.isConfigured()) {
      throw new ConfigurationError(this.id, "Missing required credentials");
    }
    this.initialized = true;
    return Promise.resolve();
  }

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new NotificationError(
        "NOT_INITIALIZED",
        `Provider "${this.id}" has not been initialized`
      );
    }
  }

  protected handleError(operation: string, error: unknown): never {
    if (error instanceof NotificationError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new NotificationError(
      "NOTIFICATION_FAILED",
      `${this.id} ${operation} failed: ${message}`,
      { retryable: true }
    );
  }

  abstract send(
    userId: string,
    title: string,
    message: string,
    priority?: AlertPriority,
    options?: NotificationOptions
  ): Promise<DeliveryResult>;

  abstract sendInteractive(
    userId: string,
    title: string,
    message: string,
    buttons: NotificationButton[],
    priority?: AlertPriority,
    options?: NotificationOptions
  ): Promise<DeliveryResult>;

  abstract sendRich(
    userId: string,
    content: RichNotificationContent,
    priority?: AlertPriority,
    options?: NotificationOptions
  ): Promise<DeliveryResult>;

  abstract getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;

  abstract validateRecipient(recipientId: string): Promise<boolean>;

  abstract getRateLimitInfo(): Promise<RateLimitInfo>;

  abstract isRateLimited(): Promise<boolean>;

  abstract healthCheck(): Promise<HealthCheckResult>;

  abstract getCapabilities(): NotificationCapabilities;
}
