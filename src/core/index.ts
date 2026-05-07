/**
 * Core Interfaces
 * Central export for all core pluggable interfaces
 *
 * Example:
 *   import { IMarket, ICriterion, IAIProvider } from '@core';
 */

// Shared types (import first — used by other core modules)
export {
  HealthCheckResult,
  IMarket,
  IMarketFactory,
  MarketHours,
  MarketConfig,
  MarketCapabilities,
} from "./market";

// Criterion abstraction
export {
  ICriterion,
  ICriterionFactory,
  CriterionCategory,
  CriterionContext,
  CriterionStockData,
  CriterionFinancials,
  CriterionDividend,
  CriterionTechnical,
  CriterionHistorical,
  CriterionPortfolioContext,
  CriterionEvaluation,
  CriterionMetadata,
  CriterionThresholds,
} from "./criterion";

// AI provider abstraction
export {
  IAIProvider,
  IAIProviderFactory,
  PortfolioStock,
  PortfolioContext as AIPortfolioContext,
  PortfolioAnalysis,
  RebalancingSuggestion,
  StockExplanation,
  AIRecommendation,
  AlternativeRecommendation,
  StockData as AIStockData,
  CriterionResult as AICriterionResult,
  CriterionConfig,
  CriteriaValidation,
  ValidationIssue as AIValidationIssue,
  RecommendationContext,
  TechnicalIndicator,
  RiskAssessment,
  AICapabilities,
  HealthCheckResult as AIHealthCheckResult,
  RateLimitStatus as AIRateLimitStatus,
} from "./ai-provider";

// Notification provider abstraction
export {
  INotificationProvider,
  INotificationProviderFactory,
  NotificationOptions,
  NotificationButton,
  RichNotificationContent,
  DeliveryResult,
  DeliveryStatus,
  RateLimitInfo,
  HealthCheckResult as NotificationHealthCheckResult,
  NotificationCapabilities,
} from "./notification-provider";
