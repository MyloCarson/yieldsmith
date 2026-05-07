/**
 * Core Interfaces
 * Central export for all core pluggable interfaces
 *
 * Example:
 *   import { IAIProvider, INotificationProvider } from '@core';
 */

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
