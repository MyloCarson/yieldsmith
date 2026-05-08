import {
  IAIProvider,
  PortfolioStock,
  PortfolioContext,
  PortfolioAnalysis,
  StockData,
  StockExplanation,
  CriterionResult,
  RecommendationContext,
  AIRecommendation,
  CriterionConfig,
  CriteriaValidation,
  RiskAssessment,
  TechnicalIndicator,
  AICapabilities,
  RateLimitStatus,
  HealthCheckResult,
} from "@core/ai-provider";
import { AIProviderError, ConfigurationError } from "@core/errors";

export abstract class BaseAIProvider implements IAIProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly model: string;

  protected initialized = false;

  abstract isConfigured(): boolean;

  initialize(): Promise<void> {
    if (!this.isConfigured()) {
      throw new ConfigurationError(this.id, "Missing required API credentials");
    }
    this.initialized = true;
    return Promise.resolve();
  }

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new AIProviderError(
        "NOT_INITIALIZED",
        `Provider "${this.id}" has not been initialized`
      );
    }
  }

  protected handleError(operation: string, error: unknown): never {
    if (error instanceof AIProviderError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new AIProviderError("AI_REQUEST_FAILED", `${this.id} ${operation} failed: ${msg}`, {
      retryable: true,
    });
  }

  abstract analyzePortfolio(
    stocks: PortfolioStock[],
    context: PortfolioContext
  ): Promise<PortfolioAnalysis>;

  abstract explainStock(
    symbol: string,
    marketId: string,
    data: StockData
  ): Promise<StockExplanation>;

  abstract generateRecommendation(
    symbol: string,
    marketId: string,
    criteria: CriterionResult[],
    context: RecommendationContext
  ): Promise<AIRecommendation>;

  abstract validateCriteria(
    criteria: CriterionConfig[],
    data: StockData
  ): Promise<CriteriaValidation>;

  abstract assessPortfolioRisk(portfolio: PortfolioStock[]): Promise<RiskAssessment>;

  abstract interpretIndicator(indicator: TechnicalIndicator): Promise<string>;

  abstract healthCheck(): Promise<HealthCheckResult>;

  abstract getCapabilities(): AICapabilities;

  abstract getRateLimitStatus(): Promise<RateLimitStatus>;
}
