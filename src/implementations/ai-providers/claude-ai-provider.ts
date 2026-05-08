import Anthropic from "@anthropic-ai/sdk";
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

export interface ClaudeAIProviderConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

const DEFAULT_MODEL = "claude-opus-4-7";
const DEFAULT_MAX_TOKENS = 4096;

export class ClaudeAIProvider extends BaseAIProvider {
  readonly id = "claude";
  readonly name = "Claude (Anthropic)";
  readonly model: string;

  private readonly apiKey: string | undefined;
  private readonly maxTokens: number;
  private client: Anthropic | null = null;

  constructor(config?: ClaudeAIProviderConfig) {
    super();
    this.apiKey = config?.apiKey ?? process.env["ANTHROPIC_API_KEY"];
    this.model = config?.model ?? DEFAULT_MODEL;
    this.maxTokens = config?.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.client = new Anthropic({ apiKey: this.apiKey });
  }

  private getClient(): Anthropic {
    this.ensureInitialized();
    if (!this.client) {
      throw new AIProviderError("NOT_INITIALIZED", "Claude client not created");
    }
    return this.client;
  }

  private async ask(prompt: string): Promise<string> {
    const response = await this.getClient().messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new AIProviderError("EMPTY_RESPONSE", "Claude returned no text content");
    }
    return textBlock.text;
  }

  private parseJSON<T>(raw: string): T {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
    const jsonStr = match ? match[1] : raw;
    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      throw new AIProviderError("PARSE_ERROR", `Failed to parse Claude JSON response`);
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
    _marketId: string,
    criteria: CriterionResult[],
    context: RecommendationContext
  ): Promise<AIRecommendation> {
    try {
      const prompt = `You are a friendly financial advisor helping an everyday Nigerian investor who has NO finance or trading background. They invest for dividend income on the Nigerian Stock Exchange (NGX).

IMPORTANT: Write ALL text in plain, simple English. No jargon. No technical terms. Imagine explaining this to a smart friend who has never traded stocks before. If you must mention something like "P/E ratio", explain what it means in simple words.

Stock: ${symbol} (NGX)
Criteria check results: ${JSON.stringify(criteria, null, 2)}
Context: ${JSON.stringify(context, null, 2)}

The investor's goals: build ₦500K/year in dividend income, medium risk, 2-3 year horizon. They care about: regular dividend payments, fair pricing, company stability.

Return JSON with:
- symbol, marketId
- recommendation: "buy", "hold", or "sell"
- recommendedAmount: null
- confidence: "low", "medium", or "high"
- score: number 0-1
- reasoning.overall: 2-3 plain sentences — the main reason for this recommendation, no jargon
- reasoning.dividend: 1 plain sentence about dividend payments (are they reliable? growing? risky?)
- reasoning.fundamental: 1 plain sentence about company health (is the company doing well?)
- reasoning.valuation: 1 plain sentence about whether the stock price is fair (cheap, expensive, or just right?)
- reasoning.technical: null
- keyStrengths: 2-3 bullet points in plain English — what makes this a good or bad investment
- keyConcerns: 2-3 bullet points in plain English — what risks or problems to watch out for
- targetPrice: estimated fair price in naira (or null if unknown)
- upside: null
- downside: null
- investmentHorizon: "short-term", "medium-term", or "long-term"
- alternatives: []
- metadata: {modelUsed: "", analysisDate: null, dataSourcesUsed: [], assumptions: []}`;

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
      const response = await this.getClient().messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: "user", content: "ping" }],
      });
      return {
        healthy: response.content.length > 0,
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
      maxTokensPerRequest: this.maxTokens,
      supportedModels: ["claude-opus-4-7", "claude-opus-4-6", "claude-sonnet-4-6"],
      concurrentRequests: 5,
    };
  }

  getRateLimitStatus(): Promise<RateLimitStatus> {
    return Promise.resolve({
      requestsRemaining: 1000,
      requestsTotal: 1000,
      resetAt: new Date(Date.now() + 60_000),
      percentage: 100,
    });
  }
}
