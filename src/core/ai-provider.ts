/**
 * AI Provider Interface
 * Defines contract for AI service implementations
 * Examples: ClaudeProvider, GeminiProvider, OpenAIProvider
 */

import { StockSymbol, MarketId, Score, DateOnly, ConfidenceLevel } from "@/types/common";
import { RiskTolerance } from "@/types/users";

/**
 * AI provider implementation contract
 */
export interface IAIProvider {
  /**
   * Provider identifier
   * e.g., "claude", "gemini", "openai"
   */
  readonly id: string;

  /**
   * Provider display name
   */
  readonly name: string;

  /**
   * Current model name
   * e.g., "claude-opus-4-6", "gpt-4", "gemini-pro"
   */
  readonly model: string;

  /**
   * Check if provider is properly configured with API credentials
   */
  isConfigured(): boolean;

  /**
   * Analyze a portfolio and provide insights
   *
   * @param stocks - List of stocks in portfolio
   * @param context - Portfolio metrics and context
   * @returns Analysis with recommendations and insights
   */
  analyzePortfolio(stocks: PortfolioStock[], context: PortfolioContext): Promise<PortfolioAnalysis>;

  /**
   * Explain a stock: fundamental analysis, outlook, risks
   *
   * @param symbol - Stock symbol
   * @param marketId - Market identifier
   * @param data - Stock data (financials, prices, etc.)
   * @returns Natural language explanation and assessment
   */
  explainStock(symbol: StockSymbol, marketId: MarketId, data: StockData): Promise<StockExplanation>;

  /**
   * Generate investment recommendation for a stock
   *
   * @param symbol - Stock symbol
   * @param marketId - Market identifier
   * @param criteria - Criterion evaluation results
   * @param context - Market and strategy context
   * @returns Recommendation with reasoning and metadata
   */
  generateRecommendation(
    symbol: StockSymbol,
    marketId: MarketId,
    criteria: CriterionResult[],
    context: RecommendationContext
  ): Promise<AIRecommendation>;

  /**
   * Validate criteria thresholds and provide feedback
   *
   * @param criteria - Criteria to evaluate
   * @param data - Stock data to test against
   * @returns Validation result with suggestions for improvement
   */
  validateCriteria(criteria: CriterionConfig[], data: StockData): Promise<CriteriaValidation>;

  /**
   * Assess portfolio risk and diversification
   *
   * @param portfolio - Portfolio holdings
   * @returns Risk assessment with recommendations
   */
  assessPortfolioRisk(portfolio: PortfolioStock[]): Promise<RiskAssessment>;

  /**
   * Generate text explanation of a technical indicator
   *
   * @param indicator - Indicator name and value
   * @returns Natural language interpretation
   */
  interpretIndicator(indicator: TechnicalIndicator): Promise<string>;

  /**
   * Initialize provider (test connection, validate config, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Test API connection and rate limits
   */
  healthCheck(): Promise<HealthCheckResult>;

  /**
   * Get provider capabilities
   */
  getCapabilities(): AICapabilities;

  /**
   * Get current API usage/rate limit status
   */
  getRateLimitStatus(): Promise<RateLimitStatus>;
}

/**
 * Portfolio stock
 */
export interface PortfolioStock {
  symbol: StockSymbol;
  marketId: MarketId;
  quantity: number;
  currentPrice: number;
  purchasePrice: number;
  sector?: string;
}

/**
 * Portfolio context for analysis
 */
export interface PortfolioContext {
  totalValue: number;
  totalInvested: number;
  unrealizedGain: number;
  dividendYield: number;
  annualDividendGoal: number;
  monthlyInvestmentAmount: number;
  strategy: string;
  riskTolerance: RiskTolerance;
}

/**
 * Portfolio analysis result
 */
export interface PortfolioAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
  rebalancingSuggestions: RebalancingSuggestion[];
  riskAssessment: string;
  diversificationScore: Score;
}

/**
 * Rebalancing suggestion
 */
export interface RebalancingSuggestion {
  symbol: StockSymbol;
  action: "buy" | "sell" | "hold";
  reason: string;
  targetAllocation: number;
  currentAllocation: number;
}

/**
 * Stock explanation from AI
 */
export interface StockExplanation {
  symbol: StockSymbol;
  companyName?: string;
  summary: string;
  fundamentalAnalysis: string;
  technicalAnalysis: string;
  riskFactors: string[];
  opportunities: string[];
  investmentOutlook: string;
  recommendation: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  targetPrice?: number;
  upside?: number;
  downside?: number;
  confidence: Score;
}

/**
 * AI-generated recommendation
 */
export interface AIRecommendation {
  symbol: StockSymbol;
  marketId: MarketId;
  recommendation: "buy" | "hold" | "sell";
  recommendedAmount?: number;
  confidence: ConfidenceLevel;
  score: Score;
  reasoning: {
    fundamental: string;
    technical: string;
    dividend: string;
    valuation: string;
    overall: string;
  };
  keyStrengths: string[];
  keyConcerns: string[];
  targetPrice?: number;
  upside?: number;
  downside?: number;
  investmentHorizon?: "short-term" | "medium-term" | "long-term";
  alternatives?: AlternativeRecommendation[];
  metadata: {
    modelUsed: string;
    analysisDate: Date;
    dataSourcesUsed: string[];
    assumptions: string[];
  };
}

/**
 * Alternative recommendation
 */
export interface AlternativeRecommendation {
  symbol: StockSymbol;
  recommendation: "buy" | "hold" | "sell";
  reasoning: string;
  score: Score;
}

/**
 * Stock data for analysis
 */
export interface StockData {
  symbol: StockSymbol;
  marketId: MarketId;
  name?: string;
  sector?: string;
  price: number;
  peRatio?: number;
  earnings?: number;
  revenue?: number;
  dividend?: number;
  dividendYield?: number;
  debtToEquity?: number;
  priceHistory?: Array<{ date: DateOnly; close: number }>;
}

/**
 * Criterion result
 */
export interface CriterionResult {
  criterionName: string;
  passed: boolean;
  score: Score;
  explanation: string;
}

/**
 * Criterion configuration
 */
export interface CriterionConfig {
  name: string;
  displayName: string;
  thresholdMin?: number;
  thresholdMax?: number;
  weight: number;
}

/**
 * Criteria validation result
 */
export interface CriteriaValidation {
  valid: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  criterion: string;
  issue: string;
  severity: "error" | "warning";
}

/**
 * Recommendation context
 */
export interface RecommendationContext {
  strategyId: string;
  strategyName: string;
  marketSentiment: string;
  macroContext?: string;
  userRiskTolerance: RiskTolerance;
}

/**
 * Technical indicator
 */
export interface TechnicalIndicator {
  name: string;
  value: number;
  signal?: number;
  period?: number;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  overallRisk: "low" | "moderate" | "high";
  sectorConcentration: number;
  marketConcentration: number;
  correlationRisk: string;
  diversificationScore: Score;
  recommendations: string[];
}

/**
 * AI provider capabilities
 */
export interface AICapabilities {
  supportsPortfolioAnalysis: boolean;
  supportsStockExplanation: boolean;
  supportsRecommendationGeneration: boolean;
  supportsCriteriaValidation: boolean;
  supportsRiskAssessment: boolean;
  supportsNaturalLanguageInput: boolean;
  maxTokensPerRequest?: number;
  supportedModels: string[];
  concurrentRequests: number;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  apiStatus: "operational" | "degraded" | "down";
  lastCheck: Date;
  responseTime?: number;
  error?: string;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  requestsRemaining: number;
  requestsTotal: number;
  resetAt: Date;
  percentage: number;
}

/**
 * AI provider factory
 */
export interface IAIProviderFactory {
  /**
   * Create a provider by ID
   */
  createProvider(providerId: string): Promise<IAIProvider>;

  /**
   * Get default provider
   */
  getDefaultProvider(): Promise<IAIProvider>;

  /**
   * Get all available providers
   */
  getAllProviders(): Promise<IAIProvider[]>;

  /**
   * Register a new provider
   */
  registerProvider(provider: IAIProvider): void;

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): Promise<IAIProvider | null>;

  /**
   * Get fallback provider
   */
  getFallbackProvider(primaryId: string): Promise<IAIProvider | null>;
}
