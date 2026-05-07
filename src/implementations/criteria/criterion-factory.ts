/**
 * Criterion Factory
 * Creates and manages concrete criterion instances
 *
 * Supports:
 * - Dynamic criterion instantiation by name
 * - Criterion registration for custom implementations
 * - Batch criterion creation from strategy definitions
 */

import { ICriterion, ICriterionFactory } from "@core/criterion";
import { ProviderFactoryError, ConfigurationError } from "@core/errors";
import { DividendYieldCriterion } from "./dividend-yield-criterion";

/**
 * Registry of available criterion implementations
 */
type CriterionConstructor = new () => ICriterion;

/**
 * Criterion factory
 */
export class CriterionFactory implements ICriterionFactory {
  private registry: Map<string, CriterionConstructor> = new Map();
  private instances: Map<string, ICriterion> = new Map();
  private initialized = false;

  constructor() {
    this.registerDefaults();
  }

  /**
   * Create a criterion by name
   */
  async createCriterion(criterionName: string): Promise<ICriterion> {
    try {
      // Return cached instance if available
      if (this.instances.has(criterionName)) {
        return this.instances.get(criterionName)!;
      }

      // Get constructor from registry
      const constructor = this.registry.get(criterionName);
      if (!constructor) {
        throw new Error(`Criterion "${criterionName}" not registered`);
      }

      // Create and initialize instance
      const instance = new constructor();
      await instance.initialize();

      // Cache instance
      this.instances.set(criterionName, instance);

      return instance;
    } catch (error) {
      throw new ProviderFactoryError(
        "Criterion",
        criterionName,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get all available criterion names
   */
  getAllAvailable(): Promise<string[]> {
    return Promise.resolve(Array.from(this.registry.keys()));
  }

  /**
   * Register a criterion implementation
   */
  registerCriterion(name: string, constructor: CriterionConstructor): void {
    this.registry.set(name, constructor);
  }

  /**
   * Check if criterion is registered
   */
  isCriterionRegistered(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Get criterion from cache (or null if not loaded)
   */
  getCached(criterionName: string): ICriterion | null {
    return this.instances.get(criterionName) ?? null;
  }

  /**
   * Initialize all registered criteria
   */
  async initializeAll(): Promise<void> {
    if (this.initialized) return;

    for (const [name, constructor] of this.registry.entries()) {
      try {
        const instance = new constructor();
        await instance.initialize();
        this.instances.set(name, instance);
      } catch (error) {
        throw new ConfigurationError(
          "CriterionFactory",
          `Failed to initialize criterion "${name}"`
        );
      }
    }

    this.initialized = true;
  }

  /**
   * Health check all criteria
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, instance] of this.instances.entries()) {
      try {
        const healthy = await instance.isHealthy();
        results.set(name, healthy);
      } catch (error) {
        results.set(name, false);
      }
    }

    return results;
  }

  /**
   * Register default criterion implementations
   */
  private registerDefaults(): void {
    this.registerCriterion("dividend_yield", DividendYieldCriterion);
  }
}

/**
 * Global singleton instance
 */
let globalFactory: CriterionFactory | null = null;

/**
 * Get global criterion factory instance
 */
export function getCriterionFactory(): CriterionFactory {
  if (!globalFactory) {
    globalFactory = new CriterionFactory();
  }
  return globalFactory;
}

/**
 * Reset global factory (useful for testing)
 */
export function resetCriterionFactory(): void {
  globalFactory = null;
}
