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
import { DividendCoverageCriterion } from "./dividend-coverage-criterion";
import { DividendGrowthCriterion } from "./dividend-growth-criterion";
import { PayoutRatioCriterion } from "./payout-ratio-criterion";
import { PERatioCriterion } from "./pe-ratio-criterion";
import { BookValueCriterion } from "./book-value-criterion";
import { DebtToEquityCriterion } from "./debt-to-equity-criterion";
import { VolatilityCriterion } from "./volatility-criterion";
import { LiquidityCriterion } from "./liquidity-criterion";
import { EarningsGrowthCriterion } from "./earnings-growth-criterion";
import { ROECriterion } from "./roe-criterion";
import { QualityScoreCriterion } from "./quality-score-criterion";
import { SectorConcentrationCriterion } from "./sector-concentration-criterion";

/**
 * Criterion constructor or lazy loader
 */
type CriterionConstructor = new () => ICriterion;
type CriterionProvider = CriterionConstructor | (() => CriterionConstructor);

/**
 * Criterion factory
 */
export class CriterionFactory implements ICriterionFactory {
  private registry: Map<string, CriterionProvider> = new Map();
  private instances: Map<string, ICriterion> = new Map();
  private initPromises: Map<string, Promise<ICriterion>> = new Map();
  private initialized = false;

  constructor() {
    this.registerDefaults();
  }

  /**
   * Create a criterion by name
   */
  createCriterion(criterionName: string): Promise<ICriterion> {
    if (this.instances.has(criterionName)) {
      return Promise.resolve(this.instances.get(criterionName)!);
    }

    if (!this.initPromises.has(criterionName)) {
      const constructor = this.registry.get(criterionName);
      if (!constructor) {
        return Promise.reject(
          new ProviderFactoryError(
            "Criterion",
            criterionName,
            new Error(`Criterion "${criterionName}" not registered`)
          )
        );
      }

      const promise = (async (): Promise<ICriterion> => {
        // Resolve constructor: if provider is a function, call it; otherwise use directly
        const ctor =
          typeof constructor === "function" && constructor.prototype === undefined
            ? (constructor as () => CriterionConstructor)()
            : (constructor as CriterionConstructor);

        const instance = new ctor();
        await instance.initialize();
        this.instances.set(criterionName, instance);
        return instance;
      })().catch((error: unknown) => {
        this.initPromises.delete(criterionName);
        throw new ProviderFactoryError(
          "Criterion",
          criterionName,
          error instanceof Error ? error : new Error(String(error))
        );
      });

      this.initPromises.set(criterionName, promise);
    }

    return this.initPromises.get(criterionName)!;
  }

  /**
   * Get all available criterion names
   */
  getAllAvailable(): Promise<string[]> {
    return Promise.resolve(Array.from(this.registry.keys()));
  }

  /**
   * Register a criterion implementation (direct constructor or lazy loader)
   */
  registerCriterion(name: string, provider: CriterionProvider): void {
    this.registry.set(name, provider);
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

    for (const [name, provider] of this.registry.entries()) {
      try {
        // Resolve constructor: if provider is a function, call it; otherwise use directly
        const ctor =
          typeof provider === "function" && provider.prototype === undefined
            ? (provider as () => CriterionConstructor)()
            : (provider as CriterionConstructor);

        const instance = new ctor();
        await instance.initialize();
        this.instances.set(name, instance);
      } catch (error) {
        throw new ConfigurationError(
          "CriterionFactory",
          `Failed to initialize criterion "${name}": ${error instanceof Error ? error.message : String(error)}`
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
    // Dividend criteria
    this.registerCriterion("dividend_yield", DividendYieldCriterion);
    this.registerCriterion("dividend_coverage", DividendCoverageCriterion);
    this.registerCriterion("dividend_growth", DividendGrowthCriterion);
    this.registerCriterion("payout_ratio", PayoutRatioCriterion);

    // Valuation criteria
    this.registerCriterion("pe_ratio", PERatioCriterion);
    this.registerCriterion("book_value", BookValueCriterion);

    // Financial health/Risk criteria
    this.registerCriterion("debt_to_equity", DebtToEquityCriterion);
    this.registerCriterion("volatility", VolatilityCriterion);
    this.registerCriterion("liquidity", LiquidityCriterion);

    // Growth criteria
    this.registerCriterion("earnings_growth", EarningsGrowthCriterion);
    this.registerCriterion("roe", ROECriterion);

    // Quality criteria
    this.registerCriterion("quality_score", QualityScoreCriterion);

    // Portfolio criteria
    this.registerCriterion("sector_concentration", SectorConcentrationCriterion);
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
