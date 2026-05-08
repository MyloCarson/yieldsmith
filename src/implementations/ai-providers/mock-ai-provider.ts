import {
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
import { Score, StockSymbol, MarketId } from "@/types/common";
import { BaseAIProvider } from "./base-ai-provider";

export class MockAIProvider extends BaseAIProvider {
  readonly id = "mock";
  readonly name = "Mock AI Provider";
  readonly model = "mock-v1";

  isConfigured(): boolean {
    return true;
  }

  analyzePortfolio(
    stocks: PortfolioStock[],
    _context: PortfolioContext
  ): Promise<PortfolioAnalysis> {
    return Promise.resolve({
      summary: `Mock analysis for ${stocks.length}-stock portfolio.`,
      strengths: ["Steady dividend payers", "Diversified sectors"],
      weaknesses: ["Concentration in one market"],
      opportunities: ["Emerging market exposure"],
      threats: ["Interest rate sensitivity"],
      recommendations: ["Hold current positions", "Consider adding defensive stocks"],
      rebalancingSuggestions: [],
      riskAssessment: "Moderate risk with consistent dividend income.",
      diversificationScore: 0.65 as Score,
    });
  }

  explainStock(symbol: string, marketId: string, _data: StockData): Promise<StockExplanation> {
    return Promise.resolve({
      symbol: symbol as StockSymbol,
      companyName: `${symbol} Inc.`,
      summary: `Mock explanation for ${symbol} on ${marketId}.`,
      fundamentalAnalysis: "Strong fundamentals with consistent earnings.",
      technicalAnalysis: "Trading above 200-day moving average.",
      riskFactors: ["Market volatility", "Sector rotation"],
      opportunities: ["Dividend growth potential", "Undervalued relative to peers"],
      investmentOutlook: "Positive long-term outlook for dividend investors.",
      recommendation: "buy",
      targetPrice: 100,
      upside: 10,
      downside: 5,
      confidence: 0.7 as Score,
    });
  }

  generateRecommendation(
    symbol: string,
    marketId: string,
    criteria: CriterionResult[],
    _context: RecommendationContext
  ): Promise<AIRecommendation> {
    const passCount = criteria.filter((c) => c.passed).length;
    const score = criteria.length > 0 ? passCount / criteria.length : 0.5;

    return Promise.resolve({
      symbol: symbol as StockSymbol,
      marketId: marketId as MarketId,
      recommendation: score >= 0.6 ? "buy" : score >= 0.4 ? "hold" : "sell",
      confidence: score >= 0.6 ? "high" : "medium",
      score: score as Score,
      reasoning: {
        fundamental: "Mock fundamental analysis.",
        technical: "Mock technical analysis.",
        dividend: "Mock dividend analysis.",
        valuation: "Mock valuation analysis.",
        overall: `${passCount} of ${criteria.length} criteria passed.`,
      },
      keyStrengths: criteria.filter((c) => c.passed).map((c) => c.criterionName),
      keyConcerns: criteria.filter((c) => !c.passed).map((c) => c.criterionName),
      investmentHorizon: "long-term",
      alternatives: [],
      metadata: {
        modelUsed: this.model,
        analysisDate: new Date(),
        dataSourcesUsed: ["mock"],
        assumptions: ["This is mock data for testing purposes"],
      },
    });
  }

  validateCriteria(criteria: CriterionConfig[], _data: StockData): Promise<CriteriaValidation> {
    return Promise.resolve({
      valid: true,
      issues: [],
      suggestions: criteria.map((c) => `${c.displayName} thresholds look reasonable.`),
    });
  }

  assessPortfolioRisk(portfolio: PortfolioStock[]): Promise<RiskAssessment> {
    const sectors = new Set(portfolio.map((s) => s.sector ?? "unknown"));
    const sectorConcentration = 1 / sectors.size;

    return Promise.resolve({
      overallRisk:
        sectorConcentration > 0.5 ? "high" : sectorConcentration > 0.3 ? "moderate" : "low",
      sectorConcentration,
      marketConcentration: 0.8,
      correlationRisk: "Moderate correlation among holdings.",
      diversificationScore: (1 - sectorConcentration) as Score,
      recommendations: ["Consider diversifying across more sectors."],
    });
  }

  interpretIndicator(indicator: TechnicalIndicator): Promise<string> {
    return Promise.resolve(
      `Mock interpretation: ${indicator.name} is at ${indicator.value}, which indicates neutral momentum.`
    );
  }

  healthCheck(): Promise<HealthCheckResult> {
    return Promise.resolve({ healthy: true, status: "operational", lastCheck: new Date() });
  }

  getCapabilities(): AICapabilities {
    return {
      supportsPortfolioAnalysis: true,
      supportsStockExplanation: true,
      supportsRecommendationGeneration: true,
      supportsCriteriaValidation: true,
      supportsRiskAssessment: true,
      supportsNaturalLanguageInput: false,
      maxTokensPerRequest: 0,
      supportedModels: ["mock-v1"],
      concurrentRequests: 100,
    };
  }

  getRateLimitStatus(): Promise<RateLimitStatus> {
    return Promise.resolve({
      requestsRemaining: 9999,
      requestsTotal: 9999,
      resetAt: new Date(Date.now() + 3_600_000),
      percentage: 100,
    });
  }
}
