import { INotificationProvider, INotificationProviderFactory } from "@core/notification-provider";
import { NotificationProviderType } from "@/types/notifications";
import { ConfigurationError, ProviderFactoryError } from "@core/errors";
import {
  TelegramNotificationProvider,
  TelegramNotificationProviderConfig,
} from "./telegram-notification-provider";
import { MockNotificationProvider } from "./mock-notification-provider";

export type NotificationFactoryProviderType = NotificationProviderType | "mock";

export interface NotificationProviderFactoryConfig {
  defaultProvider: NotificationFactoryProviderType;
  fallbackProvider?: NotificationFactoryProviderType;
  configs?: {
    telegram?: TelegramNotificationProviderConfig;
  };
}

type NotificationProviderConstructor = new (
  config?: Record<string, unknown>
) => INotificationProvider;

export class NotificationProviderFactory implements INotificationProviderFactory {
  private registry: Map<string, NotificationProviderConstructor> = new Map();
  private instances: Map<string, INotificationProvider> = new Map();
  private initPromises: Map<string, Promise<INotificationProvider>> = new Map();
  private config: NotificationProviderFactoryConfig;

  constructor(config: NotificationProviderFactoryConfig) {
    this.config = config;
    this.registerDefaults();
  }

  async createProvider(
    providerType: NotificationFactoryProviderType
  ): Promise<INotificationProvider> {
    if (this.instances.has(providerType)) {
      return this.instances.get(providerType)!;
    }

    if (this.initPromises.has(providerType)) {
      return this.initPromises.get(providerType)!;
    }

    const constructor = this.registry.get(providerType);
    if (!constructor) {
      return Promise.reject(
        new ProviderFactoryError(
          "NotificationProvider",
          providerType,
          new Error(`Notification provider "${providerType}" not registered`)
        )
      );
    }

    const promise = (async (): Promise<INotificationProvider> => {
      const providerConfig =
        (this.config.configs as Record<string, Record<string, unknown>> | undefined)?.[
          providerType
        ] ?? {};
      const instance = new constructor(providerConfig);

      try {
        await instance.initialize();
        this.instances.set(providerType, instance);
        return instance;
      } catch (error) {
        this.initPromises.delete(providerType);
        throw error;
      }
    })()
      .catch((error: unknown) => {
        this.initPromises.delete(providerType);
        throw new ProviderFactoryError(
          "NotificationProvider",
          providerType,
          error instanceof Error ? error : new Error(String(error))
        );
      })
      .finally(() => {
        this.initPromises.delete(providerType);
      });

    this.initPromises.set(providerType, promise);
    return promise;
  }

  getDefaultProvider(): Promise<INotificationProvider> {
    return this.createProvider(this.config.defaultProvider);
  }

  async getAllProviders(): Promise<INotificationProvider[]> {
    const providers: INotificationProvider[] = [];
    providers.push(await this.getDefaultProvider());

    if (this.config.fallbackProvider) {
      const fallback = await this.createProvider(this.config.fallbackProvider);
      if (!providers.some((provider) => provider.id === fallback.id)) {
        providers.push(fallback);
      }
    }

    return providers;
  }

  registerProvider(provider: INotificationProvider): void {
    if (this.instances.has(provider.id)) return;
    this.instances.set(provider.id, provider);
  }

  async getProvider(
    providerType: NotificationFactoryProviderType
  ): Promise<INotificationProvider | null> {
    try {
      return await this.createProvider(providerType);
    } catch {
      return null;
    }
  }

  async getFallbackProvider(
    primaryType: NotificationFactoryProviderType
  ): Promise<INotificationProvider | null> {
    const fallbackType = this.config.fallbackProvider;
    if (!fallbackType || fallbackType === primaryType) return null;
    return this.getProvider(fallbackType);
  }

  getCached(providerType: NotificationFactoryProviderType): INotificationProvider | null {
    return this.instances.get(providerType) ?? null;
  }

  isProviderRegistered(providerType: string): boolean {
    return this.registry.has(providerType);
  }

  private registerDefaults(): void {
    this.registry.set(
      "telegram",
      TelegramNotificationProvider as unknown as NotificationProviderConstructor
    );
    this.registry.set(
      "mock",
      MockNotificationProvider as unknown as NotificationProviderConstructor
    );
  }
}

let globalFactory: NotificationProviderFactory | null = null;

export function getNotificationProviderFactory(
  config?: NotificationProviderFactoryConfig
): NotificationProviderFactory {
  if (!globalFactory) {
    if (!config) {
      throw new ConfigurationError(
        "NotificationProviderFactory",
        "Factory not initialized. Provide config on first call."
      );
    }
    globalFactory = new NotificationProviderFactory(config);
  }
  return globalFactory;
}

export function resetNotificationProviderFactory(): void {
  globalFactory = null;
}
