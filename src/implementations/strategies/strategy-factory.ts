/**
 * Strategy Factory
 * Creates and manages strategy instances with lazy loading
 *
 * Supports:
 * - Dynamic strategy instantiation by type
 * - Strategy registration for custom implementations
 * - Instance caching
 * - Concurrent initialization safety
 */

import { StrategyNotFoundError } from "@core/errors";
import { IStrategy, StrategyType } from "@core/strategy";
import { DividendGrowthStrategy } from "./dividend-growth-strategy";
import { SteadyDividendStrategy } from "./steady-dividend-strategy";
import { ValueDividendStrategy } from "./value-dividend-strategy";

/**
 * Strategy constructor type
 */
type StrategyConstructor = new () => IStrategy;

/**
 * Strategy constructor or lazy loader
 */
type StrategyProvider = StrategyConstructor | (() => StrategyConstructor);

/**
 * Strategy factory implementation
 */
export class StrategyFactory {
  private registry: Map<string, StrategyProvider> = new Map();
  private instances: Map<string, IStrategy> = new Map();
  private initPromises: Map<string, Promise<IStrategy>> = new Map();

  constructor() {
    this.registerDefaults();
  }

  /**
   * Create a strategy by type
   */
  createStrategy(strategyType: StrategyType): Promise<IStrategy> {
    const key = String(strategyType);

    // Return cached instance if available
    const cached = this.instances.get(key);
    if (cached) {
      return Promise.resolve(cached);
    }

    // Check for in-flight initialization
    if (this.initPromises.has(key)) {
      return this.initPromises.get(key)!;
    }

    // Get provider from registry
    const provider = this.registry.get(key);
    if (!provider) {
      return Promise.reject(
        new StrategyNotFoundError(strategyType, {
          message: `Strategy "${strategyType}" not registered`,
        })
      );
    }

    // Create and initialize instance
    const promise = (async (): Promise<IStrategy> => {
      // Resolve provider: if it's a function with no prototype, call it; otherwise use directly
      const ctor =
        typeof provider === "function" && provider.prototype === undefined
          ? (provider as () => StrategyConstructor)()
          : (provider as StrategyConstructor);

      const instance = new ctor();

      try {
        await instance.initialize();
        this.instances.set(key, instance);
        return instance;
      } catch (error) {
        this.initPromises.delete(key);
        throw error instanceof Error ? error : new Error(String(error));
      }
    })().catch((error: unknown) => {
      this.initPromises.delete(key);
      throw error;
    });

    this.initPromises.set(key, promise);
    return promise;
  }

  /**
   * Get all registered strategy types
   */
  getAllRegistered(): StrategyType[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Register a custom strategy
   */
  registerStrategy(type: StrategyType, provider: StrategyProvider): void {
    this.registry.set(String(type), provider);
  }

  /**
   * Check if strategy is registered
   */
  isRegistered(type: StrategyType): boolean {
    return this.registry.has(String(type));
  }

  /**
   * Get cached strategy (or null if not loaded)
   */
  getCached(strategyType: StrategyType): IStrategy | null {
    return this.instances.get(String(strategyType)) ?? null;
  }

  /**
   * Register default strategies
   */
  private registerDefaults(): void {
    this.registerStrategy(
      "dividend_growth",
      DividendGrowthStrategy as unknown as StrategyConstructor
    );
    this.registerStrategy(
      "steady_dividend",
      SteadyDividendStrategy as unknown as StrategyConstructor
    );
    this.registerStrategy(
      "value_dividend",
      ValueDividendStrategy as unknown as StrategyConstructor
    );
  }
}

/**
 * Global singleton instance
 */
let globalFactory: StrategyFactory | null = null;

/**
 * Get global strategy factory
 */
export function getStrategyFactory(): StrategyFactory {
  if (!globalFactory) {
    globalFactory = new StrategyFactory();
  }
  return globalFactory;
}

/**
 * Reset global factory (useful for testing)
 */
export function resetStrategyFactory(): void {
  globalFactory = null;
}
