/**
 * AI provider types (Claude, Gemini, OpenAI)
 */

import { StockSymbol, MarketId, JSONValue } from "./common";

/**
 * AI provider options
 */
export type AIProviderType = "claude" | "gemini" | "openai";

/**
 * AI analysis request
 */
export interface AIAnalysisRequest {
  symbol: StockSymbol;
  market_id: MarketId;
  analysis_type: AnalysisType;
  context: AnalysisContext;
  parameters?: AIParameters;
}

/**
 * Type of analysis to perform
 */
export type AnalysisType =
  | "recommendation"
  | "explain_stock"
  | "validate_criteria"
  | "generate_insight"
  | "risk_assessment"
  | "portfolio_analysis";

/**
 * Analysis context (stock data)
 */
export interface AnalysisContext {
  current_price: number;
  dividend_yield: number;
  pe_ratio: number;
  earnings_growth: number;
  debt_to_equity: number;
  price_trend: string;
  sentiment: string;
  news_summary?: string;
  financial_health: Record<string, unknown>;
  technical_analysis: Record<string, unknown>;
}

/**
 * AI parameters for analysis
 */
export interface AIParameters {
  tone?: "technical" | "casual" | "formal";
  depth?: "brief" | "moderate" | "detailed";
  focus?: string[];
  exclude?: string[];
  max_tokens?: number;
  temperature?: number;
}

/**
 * AI analysis response
 */
export interface AIAnalysisResponse {
  provider: AIProviderType;
  model: string;
  analysis_type: AnalysisType;
  result: AIAnalysisResult;
  metadata: {
    tokens_used: number;
    processing_time_ms: number;
    confidence: number;
  };
}

/**
 * Analysis result (AI output)
 */
export interface AIAnalysisResult {
  summary: string;
  key_points: string[];
  recommendation?: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  confidence_score: number;
  reasoning: string;
  risks: string[];
  opportunities: string[];
  data: JSONValue;
}

/**
 * AI recommendation response (specialized)
 */
export interface AIRecommendationResponse {
  symbol: StockSymbol;
  market_id: MarketId;
  recommendation: "buy" | "hold" | "sell";
  amount: number;
  reasoning: {
    fundamental: string;
    technical: string;
    dividend: string;
    risk: string;
  };
  confidence: "high" | "medium" | "low";
  target_price?: number;
  upside_downside?: number;
  key_catalysts: string[];
  key_risks: string[];
  alternative_recommendations: Array<{
    symbol: StockSymbol;
    confidence: number;
    reason: string;
  }>;
}

/**
 * AI provider interface (contract for all AI providers)
 */
export interface IAIProvider {
  provider: AIProviderType;
  model: string;
  isConfigured(): boolean;
  analyzePortfolio(
    stocks: Array<{ symbol: StockSymbol; market_id: MarketId }>
  ): Promise<AIAnalysisResponse>;
  explainStock(symbol: StockSymbol, market_id: MarketId): Promise<AIAnalysisResponse>;
  generateRecommendation(
    symbol: StockSymbol,
    market_id: MarketId,
    context: AnalysisContext
  ): Promise<AIRecommendationResponse>;
  validateCriteria(
    symbol: StockSymbol,
    market_id: MarketId,
    criteria: Record<string, unknown>
  ): Promise<AIAnalysisResponse>;
  assessRisk(context: AnalysisContext): Promise<AIAnalysisResponse>;
}

/**
 * Claude-specific types
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Claude {
  export interface Config {
    apiKey: string;
    model: "claude-opus-4-6" | "claude-sonnet-4-6" | "claude-haiku-4-5-20251001";
    maxTokens?: number;
    temperature?: number;
  }

  export interface Message {
    role: "user" | "assistant";
    content: string;
  }
}

/**
 * Gemini-specific types
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Gemini {
  export interface Config {
    apiKey: string;
    model: "gemini-pro" | "gemini-pro-vision";
    maxTokens?: number;
    temperature?: number;
  }
}

/**
 * OpenAI-specific types
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace OpenAI {
  export interface Config {
    apiKey: string;
    model: "gpt-4" | "gpt-3.5-turbo";
    maxTokens?: number;
    temperature?: number;
  }
}

/**
 * AI provider configuration
 */
export interface AIProviderConfig {
  provider: AIProviderType;
  enabled: boolean;
  config: Claude.Config | Gemini.Config | OpenAI.Config | Record<string, unknown>;
  fallback_to?: AIProviderType;
}

/**
 * AI provider factory config (from config files)
 */
export interface AIConfig {
  default_provider: AIProviderType;
  providers: AIProviderConfig[];
  retry_on_failure: boolean;
  fallback_strategy: "first_available" | "random" | "specific";
}
