import { IAIProvider, IAIProviderFactory } from "@core/ai-provider";
import { ConfigurationError, ProviderFactoryError } from "@core/errors";
import { ClaudeAIProvider, ClaudeAIProviderConfig } from "./claude-ai-provider";
import { GeminiAIProvider, GeminiAIProviderConfig } from "./gemini-ai-provider";
import { MockAIProvider } from "./mock-ai-provider";

export type AIProviderType = "claude" | "gemini" | "mock";

export interface AIProviderFactoryConfig {
  defaultProvider: AIProviderType;
  fallbackProvider?: AIProviderType;
  configs?: {
    claude?: ClaudeAIProviderConfig;
    gemini?: GeminiAIProviderConfig;
  };
}

type AIProviderConstructor = new (config?: Record<string, unknown>) => IAIProvider;

export class AIProviderFactory implements IAIProviderFactory {
  private registry: Map<string, AIProviderConstructor> = new Map();
  private instances: Map<string, IAIProvider> = new Map();
  private initPromises: Map<string, Promise<IAIProvider>> = new Map();
  private config: AIProviderFactoryConfig;

  constructor(config: AIProviderFactoryConfig) {
    this.config = config;
    this.registerDefaults();
  }

  async createProvider(providerId: string): Promise<IAIProvider> {
    if (this.instances.has(providerId)) {
      return this.instances.get(providerId)!;
    }

    if (this.initPromises.has(providerId)) {
      return this.initPromises.get(providerId)!;
    }

    const ctor = this.registry.get(providerId);
    if (!ctor) {
      return Promise.reject(
        new ProviderFactoryError(
          "AIProvider",
          providerId,
          new Error(`AI provider "${providerId}" not registered`)
        )
      );
    }

    const promise = (async (): Promise<IAIProvider> => {
      const providerConfig =
        (this.config.configs as Record<string, Record<string, unknown>> | undefined)?.[
          providerId
        ] ?? {};
      const instance = new ctor(providerConfig);

      try {
        await instance.initialize();
        this.instances.set(providerId, instance);
        return instance;
      } catch (error) {
        this.initPromises.delete(providerId);
        throw error;
      }
    })()
      .catch((error: unknown) => {
        this.initPromises.delete(providerId);
        throw new ProviderFactoryError(
          "AIProvider",
          providerId,
          error instanceof Error ? error : new Error(String(error))
        );
      })
      .finally(() => {
        this.initPromises.delete(providerId);
      });

    this.initPromises.set(providerId, promise);
    return promise;
  }

  async getDefaultProvider(): Promise<IAIProvider> {
    return this.createProvider(this.config.defaultProvider);
  }

  async getAllProviders(): Promise<IAIProvider[]> {
    const providers: IAIProvider[] = [];
    providers.push(await this.getDefaultProvider());

    if (this.config.fallbackProvider) {
      const fallback = await this.createProvider(this.config.fallbackProvider);
      if (!providers.some((p) => p.id === fallback.id)) {
        providers.push(fallback);
      }
    }

    return providers;
  }

  registerProvider(provider: IAIProvider): void {
    const existing = this.instances.get(provider.id);
    if (existing) return;
    this.instances.set(provider.id, provider);
  }

  async getProvider(providerId: string): Promise<IAIProvider | null> {
    try {
      return await this.createProvider(providerId);
    } catch {
      return null;
    }
  }

  async getFallbackProvider(primaryId: string): Promise<IAIProvider | null> {
    const fallbackId = this.config.fallbackProvider;
    if (!fallbackId || fallbackId === primaryId) return null;
    return this.getProvider(fallbackId);
  }

  getCached(providerId: string): IAIProvider | null {
    return this.instances.get(providerId) ?? null;
  }

  isProviderRegistered(providerId: string): boolean {
    return this.registry.has(providerId);
  }

  private registerDefaults(): void {
    this.registry.set("claude", ClaudeAIProvider as unknown as AIProviderConstructor);
    this.registry.set("gemini", GeminiAIProvider as unknown as AIProviderConstructor);
    this.registry.set("mock", MockAIProvider as unknown as AIProviderConstructor);
  }
}

let globalFactory: AIProviderFactory | null = null;

export function getAIProviderFactory(config?: AIProviderFactoryConfig): AIProviderFactory {
  if (!globalFactory) {
    if (!config) {
      throw new ConfigurationError(
        "AIProviderFactory",
        "Factory not initialized. Provide config on first call."
      );
    }
    globalFactory = new AIProviderFactory(config);
  }
  return globalFactory;
}

export function resetAIProviderFactory(): void {
  globalFactory = null;
}
