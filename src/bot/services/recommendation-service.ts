import { StockSymbol, MarketId } from "@/types/common";
import { RiskTolerance } from "@/types/users";
import { CriterionResult, AIRecommendation } from "@core/ai-provider";
import { AIProviderFactory } from "@/implementations/ai-providers/ai-provider-factory";
import { StockService, StockEvaluation } from "./stock-service";

export interface RecommendationResult {
  evaluation: StockEvaluation;
  recommendation: AIRecommendation;
}

export class RecommendationService {
  constructor(
    private readonly stockService: StockService,
    private readonly aiFactory: AIProviderFactory
  ) {}

  async validateSymbol(symbol: StockSymbol): Promise<boolean> {
    return this.stockService.validateSymbol(symbol);
  }

  async getRecommendation(
    symbol: StockSymbol,
    marketId: MarketId,
    riskTolerance: RiskTolerance = "moderate"
  ): Promise<RecommendationResult> {
    const evaluation = await this.stockService.evaluateStock(symbol, marketId);

    const criteriaResults: CriterionResult[] = evaluation.evaluations.map((e) => ({
      criterionName: e.criterionName,
      passed: e.passed,
      score: e.score,
      explanation: e.explanation,
    }));

    const aiProvider = await this.aiFactory.getDefaultProvider();
    const recommendation = await aiProvider.generateRecommendation(
      symbol,
      marketId,
      criteriaResults,
      {
        strategyId: "dividend_growth",
        strategyName: "Dividend Growth Strategy",
        marketSentiment: "neutral",
        userRiskTolerance: riskTolerance,
      }
    );

    return { evaluation, recommendation };
  }
}
