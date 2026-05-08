/**
 * Data Provider Factory
 * Creates and manages data provider instances
 *
 * Supports:
 * - Dynamic provider instantiation by type
 * - Provider registration for custom implementations
 * - Fallback provider selection
 * - Configuration management
 */

import { ProviderFactoryError, ConfigurationError } from "@core/errors";
import { DataProviderNGXPulse } from "./ngx-pulse-provider";
import { DataProviderMock } from "./mock-data-provider";

/**
 * Data provider type
 */
export type DataProviderType = "ngx_pulse" | "alpha_vantage" | "finnhub" | "polygon" | "mock";

/**
 * Minimal interface for a data provider (used by this factory)
 */
export interface IDataProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  initialize(): Promise<void>;
  healthCheck(): Promise<{ healthy: boolean; status: string }>;
}

/**
 * Provider constructor
 */
type DataProviderConstructor = new (config?: Record<string, unknown>) => IDataProvider;

/**
 * Data provider factory configuration
 */
export interface DataProviderFactoryConfig {
  primaryProvider: DataProviderType;
  fallbackProviders?: DataProviderType[];
  configs?: Record<string, Record<string, unknown>>;
}

/**
 * Data provider factory
 */
export class DataProviderFactory {
  private registry: Map<string, DataProviderConstructor> = new Map();
  private instances: Map<string, IDataProvider> = new Map();
  private initPromises: Map<string, Promise<IDataProvider>> = new Map();
  private config: DataProviderFactoryConfig;
  private primaryProvider: IDataProvider | null = null;

  constructor(config: DataProviderFactoryConfig) {
    this.config = config;
    this.registerDefaults();
  }

  /**
   * Create a data provider by type
   */
  createProvider(providerType: DataProviderType): Promise<IDataProvider> {
    // Return cached instance if available
    if (this.instances.has(providerType)) {
      return Promise.resolve(this.instances.get(providerType)!);
    }

    // Check for in-flight initialization
    if (this.initPromises.has(providerType)) {
      return this.initPromises.get(providerType)!;
    }

    // Get constructor from registry
    const ctor = this.registry.get(providerType);
    if (!ctor) {
      const error = new ProviderFactoryError(
        "DataProvider",
        providerType,
        new Error(`Data provider "${providerType}" not registered`)
      );
      return Promise.reject(error);
    }

    // Create and initialize instance
    const promise = (async (): Promise<IDataProvider> => {
      const providerConfig = this.config.configs?.[providerType] ?? {};
      const instance = new ctor(providerConfig);

      try {
        await instance.initialize();
        this.instances.set(providerType, instance);
        return instance;
      } catch (error) {
        this.initPromises.delete(providerType);
        throw error;
      }
    })().catch((error: unknown) => {
      this.initPromises.delete(providerType);
      throw new ProviderFactoryError(
        "DataProvider",
        providerType,
        error instanceof Error ? error : new Error(String(error))
      );
    });

    this.initPromises.set(providerType, promise);
    return promise;
  }

  /**
   * Get primary data provider
   */
  async getPrimaryProvider(): Promise<IDataProvider> {
    if (!this.primaryProvider) {
      this.primaryProvider = await this.createProvider(this.config.primaryProvider);
    }
    return this.primaryProvider;
  }

  /**
   * Get all configured providers
   */
  async getAllProviders(): Promise<IDataProvider[]> {
    const providers: IDataProvider[] = [];

    // Add primary
    providers.push(await this.getPrimaryProvider());

    // Add fallbacks
    if (this.config.fallbackProviders) {
      for (const type of this.config.fallbackProviders) {
        const provider = await this.createProvider(type);
        if (!providers.some((p) => p.id === provider.id)) {
          providers.push(provider);
        }
      }
    }

    return providers;
  }

  /**
   * Get fallback provider (if primary fails)
   */
  async getFallbackProvider(_primaryType?: DataProviderType): Promise<IDataProvider | null> {
    const fallbacks = this.config.fallbackProviders;
    if (!fallbacks || fallbacks.length === 0) {
      return null;
    }

    try {
      return await this.createProvider(fallbacks[0]);
    } catch {
      return null;
    }
  }

  /**
   * Register a custom data provider
   */
  registerProvider(name: string, ctor: DataProviderConstructor): void {
    this.registry.set(name, ctor);
  }

  /**
   * Check if provider is registered
   */
  isProviderRegistered(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Get provider from cache (or null if not loaded)
   */
  getCached(providerType: DataProviderType): IDataProvider | null {
    return this.instances.get(providerType) ?? null;
  }

  /**
   * Health check primary provider
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    primaryProvider: string;
    status: string;
  }> {
    try {
      const provider = await this.getPrimaryProvider();
      const result = await provider.healthCheck();

      return {
        healthy: result.healthy,
        primaryProvider: this.config.primaryProvider,
        status: result.status,
      };
    } catch {
      return {
        healthy: false,
        primaryProvider: this.config.primaryProvider,
        status: "down",
      };
    }
  }

  /**
   * Register default data providers
   */
  private registerDefaults(): void {
    this.registerProvider("ngx_pulse", DataProviderNGXPulse as unknown as DataProviderConstructor);
    this.registerProvider("mock", DataProviderMock as unknown as DataProviderConstructor);
  }
}

/**
 * Global singleton instance
 */
let globalFactory: DataProviderFactory | null = null;

/**
 * Get global data provider factory
 */
export function getDataProviderFactory(config?: DataProviderFactoryConfig): DataProviderFactory {
  if (!globalFactory) {
    if (!config) {
      throw new ConfigurationError(
        "DataProviderFactory",
        "Factory not initialized. Provide config on first call."
      );
    }
    globalFactory = new DataProviderFactory(config);
  }
  return globalFactory;
}

/**
 * Reset global factory (useful for testing)
 */
export function resetDataProviderFactory(): void {
  globalFactory = null;
}
