import { GoogleGenAI } from "@google/genai";
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
import { AIProviderError } from "@core/errors";
import { BaseAIProvider } from "./base-ai-provider";

export interface GeminiAIProviderConfig {
  apiKey?: string;
  model?: string;
}

const DEFAULT_MODEL = "gemini-2.5-pro";

export class GeminiAIProvider extends BaseAIProvider {
  readonly id = "gemini";
  readonly name = "Gemini (Google)";
  readonly model: string;

  private readonly apiKey: string | undefined;
  private client: GoogleGenAI | null = null;

  constructor(config?: GeminiAIProviderConfig) {
    super();
    this.apiKey =
      config?.apiKey ??
      process.env["GEMINI_API_KEY"] ??
      process.env["GOOGLE_API_KEY"] ??
      process.env["GOOGLE_AI_API_KEY"];
    this.model = config?.model ?? DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.client = new GoogleGenAI({ apiKey: this.apiKey });
  }

  private getClient(): GoogleGenAI {
    this.ensureInitialized();
    if (!this.client) {
      throw new AIProviderError("NOT_INITIALIZED", "Gemini client not created");
    }
    return this.client;
  }

  private async ask(prompt: string): Promise<string> {
    const response = await this.getClient().models.generateContent({
      model: this.model,
      contents: prompt,
    });
    const text = response.text;
    if (!text) {
      throw new AIProviderError("EMPTY_RESPONSE", "Gemini returned no text content");
    }
    return text;
  }

  private parseJSON<T>(raw: string): T {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
    const jsonStr = match ? match[1] : raw;
    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      throw new AIProviderError("PARSE_ERROR", "Failed to parse Gemini JSON response");
    }
  }

  async analyzePortfolio(
    stocks: PortfolioStock[],
    context: PortfolioContext
  ): Promise<PortfolioAnalysis> {
    try {
      const prompt = `You are a dividend investment analyst. Analyze this portfolio and return JSON matching the PortfolioAnalysis schema.

Portfolio: ${JSON.stringify(stocks, null, 2)}
Context: ${JSON.stringify(context, null, 2)}

Return JSON with: summary, strengths[], weaknesses[], opportunities[], threats[], recommendations[], rebalancingSuggestions[{symbol,action,reason,targetAllocation,currentAllocation}], riskAssessment, diversificationScore (0-1).`;

      const raw = await this.ask(prompt);
      return this.parseJSON<PortfolioAnalysis>(raw);
    } catch (error) {
      this.handleError("analyzePortfolio", error);
    }
  }

  async explainStock(symbol: string, marketId: string, data: StockData): Promise<StockExplanation> {
    try {
      const prompt = `You are a stock analyst. Explain this stock for a dividend investor and return JSON.

Symbol: ${symbol} (${marketId})
Data: ${JSON.stringify(data, null, 2)}

Return JSON with: symbol, companyName, summary, fundamentalAnalysis, technicalAnalysis, riskFactors[], opportunities[], investmentOutlook, recommendation (strong_buy|buy|hold|sell|strong_sell), targetPrice, upside, downside, confidence (0-1).`;

      const raw = await this.ask(prompt);
      return this.parseJSON<StockExplanation>(raw);
    } catch (error) {
      this.handleError("explainStock", error);
    }
  }

  async generateRecommendation(
    symbol: string,
    marketId: string,
    criteria: CriterionResult[],
    context: RecommendationContext
  ): Promise<AIRecommendation> {
    try {
      const prompt = `You are a dividend investment advisor. Generate a recommendation and return JSON.

Symbol: ${symbol} (${marketId})
Criteria results: ${JSON.stringify(criteria, null, 2)}
Context: ${JSON.stringify(context, null, 2)}

Return JSON with: symbol, marketId, recommendation (buy|hold|sell), recommendedAmount, confidence (low|medium|high), score (0-1), reasoning{fundamental,technical,dividend,valuation,overall}, keyStrengths[], keyConcerns[], targetPrice, upside, downside, investmentHorizon, alternatives[], metadata{modelUsed,analysisDate,dataSourcesUsed[],assumptions[]}.`;

      const raw = await this.ask(prompt);
      const parsed = this.parseJSON<AIRecommendation>(raw);
      parsed.metadata = {
        ...parsed.metadata,
        modelUsed: this.model,
        analysisDate: new Date(),
      };
      return parsed;
    } catch (error) {
      this.handleError("generateRecommendation", error);
    }
  }

  async validateCriteria(
    criteria: CriterionConfig[],
    data: StockData
  ): Promise<CriteriaValidation> {
    try {
      const prompt = `You are a financial analyst. Validate these investment criteria thresholds against this stock data and return JSON.

Criteria: ${JSON.stringify(criteria, null, 2)}
Stock data: ${JSON.stringify(data, null, 2)}

Return JSON with: valid (boolean), issues[{criterion,issue,severity(error|warning)}], suggestions[].`;

      const raw = await this.ask(prompt);
      return this.parseJSON<CriteriaValidation>(raw);
    } catch (error) {
      this.handleError("validateCriteria", error);
    }
  }

  async assessPortfolioRisk(portfolio: PortfolioStock[]): Promise<RiskAssessment> {
    try {
      const prompt = `You are a risk analyst. Assess the risk of this portfolio and return JSON.

Portfolio: ${JSON.stringify(portfolio, null, 2)}

Return JSON with: overallRisk (low|moderate|high), sectorConcentration (0-1), marketConcentration (0-1), correlationRisk, diversificationScore (0-1), recommendations[].`;

      const raw = await this.ask(prompt);
      return this.parseJSON<RiskAssessment>(raw);
    } catch (error) {
      this.handleError("assessPortfolioRisk", error);
    }
  }

  async interpretIndicator(indicator: TechnicalIndicator): Promise<string> {
    try {
      const prompt = `Explain this technical indicator for a dividend investor in 2-3 concise sentences:

${JSON.stringify(indicator, null, 2)}`;

      return await this.ask(prompt);
    } catch (error) {
      this.handleError("interpretIndicator", error);
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const response = await this.getClient().models.generateContent({
        model: this.model,
        contents: "ping",
      });
      return {
        healthy: !!response.text,
        status: "operational",
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        status: "down",
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : "unknown error",
      };
    }
  }

  getCapabilities(): AICapabilities {
    return {
      supportsPortfolioAnalysis: true,
      supportsStockExplanation: true,
      supportsRecommendationGeneration: true,
      supportsCriteriaValidation: true,
      supportsRiskAssessment: true,
      supportsNaturalLanguageInput: true,
      maxTokensPerRequest: 65536,
      supportedModels: ["gemini-2.5-pro", "gemini-2.5-flash"],
      concurrentRequests: 10,
    };
  }

  getRateLimitStatus(): Promise<RateLimitStatus> {
    return Promise.resolve({
      requestsRemaining: 1500,
      requestsTotal: 1500,
      resetAt: new Date(Date.now() + 60_000),
      percentage: 100,
    });
  }
}
