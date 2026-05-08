/**
 * Unified Error Classes for All Providers
 *
 * All provider implementations throw from this error hierarchy
 * to ensure consistent error handling across the system.
 *
 * Error pattern:
 * - ProviderError (base)
 *   ├── MarketError
 *   ├── DataProviderError
 *   ├── StrategyError
 *   ├── CriterionError
 *   ├── AIProviderError
 *   └── NotificationError
 */

/**
 * Base provider error class
 * All provider-specific errors extend this
 */
export class ProviderError extends Error {
  /**
   * Error code for programmatic handling
   * Examples: "MARKET_CLOSED", "INVALID_SYMBOL", "RATE_LIMITED", "SERVICE_DOWN"
   */
  readonly code: string;

  /**
   * Whether the operation can be safely retried
   */
  readonly retryable: boolean;

  /**
   * Milliseconds to wait before retrying (if applicable)
   */
  readonly retryAfterMs?: number;

  /**
   * Additional context about the error
   */
  readonly context?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    options?: {
      retryable?: boolean;
      retryAfterMs?: number;
      context?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.retryAfterMs = options?.retryAfterMs;
    this.context = options?.context;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ProviderError.prototype);
  }

  /**
   * Check if error is retryable and return delay
   */
  canRetry(): { retryable: boolean; delayMs: number } {
    return {
      retryable: this.retryable,
      delayMs: this.retryAfterMs ?? 1000,
    };
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      retryAfterMs: this.retryAfterMs,
      context: this.context,
    };
  }
}

/**
 * Market-specific errors
 */
export class MarketError extends ProviderError {
  constructor(
    code: string,
    message: string,
    options?: {
      retryable?: boolean;
      retryAfterMs?: number;
      context?: Record<string, unknown>;
    }
  ) {
    super(code, message, options);
    this.name = "MarketError";
    Object.setPrototypeOf(this, MarketError.prototype);
  }
}

/**
 * Market closed error - market is not currently trading
 */
export class MarketClosedError extends MarketError {
  constructor(message = "Market is currently closed", context?: Record<string, unknown>) {
    super("MARKET_CLOSED", message, { retryable: true, context });
    this.name = "MarketClosedError";
    Object.setPrototypeOf(this, MarketClosedError.prototype);
  }
}

/**
 * Invalid symbol error - symbol not found or invalid format
 */
export class InvalidSymbolError extends MarketError {
  constructor(symbol: string, context?: Record<string, unknown>) {
    super("INVALID_SYMBOL", `Symbol "${symbol}" is not valid for this market`, {
      context: { symbol, ...context },
    });
    this.name = "InvalidSymbolError";
    Object.setPrototypeOf(this, InvalidSymbolError.prototype);
  }
}

/**
 * Data provider errors
 */
export class DataProviderError extends ProviderError {
  constructor(
    code: string,
    message: string,
    options?: {
      retryable?: boolean;
      retryAfterMs?: number;
      context?: Record<string, unknown>;
    }
  ) {
    super(code, message, options);
    this.name = "DataProviderError";
    Object.setPrototypeOf(this, DataProviderError.prototype);
  }
}

/**
 * Data not found error - requested data doesn't exist
 */
export class DataNotFoundError extends DataProviderError {
  constructor(dataType: string, identifier: string, context?: Record<string, unknown>) {
    super("DATA_NOT_FOUND", `${dataType} not found: ${identifier}`, {
      context: { dataType, identifier, ...context },
    });
    this.name = "DataNotFoundError";
    Object.setPrototypeOf(this, DataNotFoundError.prototype);
  }
}

/**
 * Rate limited error - API rate limit exceeded
 */
export class RateLimitError extends DataProviderError {
  constructor(resetAtMs: number, context?: Record<string, unknown>) {
    super("RATE_LIMITED", "API rate limit exceeded", {
      retryable: true,
      retryAfterMs: Math.max(0, resetAtMs - Date.now()),
      context,
    });
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Strategy evaluation errors
 */
export class StrategyError extends ProviderError {
  constructor(
    code: string,
    message: string,
    options?: {
      retryable?: boolean;
      retryAfterMs?: number;
      context?: Record<string, unknown>;
    }
  ) {
    super(code, message, options);
    this.name = "StrategyError";
    Object.setPrototypeOf(this, StrategyError.prototype);
  }
}

/**
 * Strategy not found error
 */
export class StrategyNotFoundError extends StrategyError {
  constructor(strategyId: string, context?: Record<string, unknown>) {
    super("STRATEGY_NOT_FOUND", `Strategy "${strategyId}" not found`, {
      context: { strategyId, ...context },
    });
    this.name = "StrategyNotFoundError";
    Object.setPrototypeOf(this, StrategyNotFoundError.prototype);
  }
}

/**
 * Criterion evaluation errors
 */
export class CriterionError extends ProviderError {
  constructor(
    code: string,
    message: string,
    options?: {
      retryable?: boolean;
      retryAfterMs?: number;
      context?: Record<string, unknown>;
    }
  ) {
    super(code, message, options);
    this.name = "CriterionError";
    Object.setPrototypeOf(this, CriterionError.prototype);
  }
}

/**
 * Criterion validation error - missing required context data
 */
export class CriterionValidationError extends CriterionError {
  readonly missingFields: string[];

  constructor(criterionName: string, missingFields: string[], context?: Record<string, unknown>) {
    super(
      "CRITERION_VALIDATION_FAILED",
      `Criterion "${criterionName}" validation failed. Missing: ${missingFields.join(", ")}`,
      { context: { criterionName, missingFields, ...context } }
    );
    this.missingFields = missingFields;
    this.name = "CriterionValidationError";
    Object.setPrototypeOf(this, CriterionValidationError.prototype);
  }
}

/**
 * AI provider errors
 */
export class AIProviderError extends ProviderError {
  constructor(
    code: string,
    message: string,
    options?: {
      retryable?: boolean;
      retryAfterMs?: number;
      context?: Record<string, unknown>;
    }
  ) {
    super(code, message, options);
    this.name = "AIProviderError";
    Object.setPrototypeOf(this, AIProviderError.prototype);
  }
}

/**
 * AI model error - model not available or misconfigured
 */
export class AIModelError extends AIProviderError {
  constructor(model: string, context?: Record<string, unknown>) {
    super("AI_MODEL_ERROR", `AI model "${model}" is not available or misconfigured`, {
      retryable: true,
      context: { model, ...context },
    });
    this.name = "AIModelError";
    Object.setPrototypeOf(this, AIModelError.prototype);
  }
}

/**
 * Notification provider errors
 */
export class NotificationError extends ProviderError {
  constructor(
    code: string,
    message: string,
    options?: {
      retryable?: boolean;
      retryAfterMs?: number;
      context?: Record<string, unknown>;
    }
  ) {
    super(code, message, options);
    this.name = "NotificationError";
    Object.setPrototypeOf(this, NotificationError.prototype);
  }
}

/**
 * Invalid recipient error - recipient not found or invalid
 */
export class InvalidRecipientError extends NotificationError {
  constructor(recipientId: string, context?: Record<string, unknown>) {
    super("INVALID_RECIPIENT", `Recipient "${recipientId}" is not valid`, {
      context: { recipientId, ...context },
    });
    this.name = "InvalidRecipientError";
    Object.setPrototypeOf(this, InvalidRecipientError.prototype);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends ProviderError {
  constructor(providerType: string, message: string, context?: Record<string, unknown>) {
    super("CONFIGURATION_ERROR", `${providerType} configuration error: ${message}`, {
      context: { providerType, ...context },
    });
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Factory pattern error - provider creation failed
 */
export class ProviderFactoryError extends ProviderError {
  constructor(
    providerType: string,
    providerId: string,
    cause: Error,
    context?: Record<string, unknown>
  ) {
    super(
      "PROVIDER_FACTORY_ERROR",
      `Failed to create ${providerType} provider "${providerId}": ${cause.message}`,
      {
        retryable: cause instanceof ProviderError ? cause.retryable : true,
        context: { providerType, providerId, originalError: cause.message, ...context },
      }
    );
    this.name = "ProviderFactoryError";
    Object.setPrototypeOf(this, ProviderFactoryError.prototype);
  }
}

/**
 * Timeout error - operation exceeded time limit
 */
export class TimeoutError extends ProviderError {
  constructor(operation: string, timeoutMs: number, context?: Record<string, unknown>) {
    super("TIMEOUT", `Operation "${operation}" exceeded timeout of ${timeoutMs}ms`, {
      retryable: true,
      context: { operation, timeoutMs, ...context },
    });
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Type guard to check if error is a ProviderError
 */
export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}

/**
 * Type guard for specific error types
 */
export function isRetryableError(error: unknown): boolean {
  if (isProviderError(error)) {
    return error.retryable;
  }
  return false;
}

/**
 * Extract retry delay from error (or default)
 */
export function getRetryDelay(error: unknown, defaultMs = 1000): number {
  if (isProviderError(error)) {
    return error.retryAfterMs ?? defaultMs;
  }
  return defaultMs;
}
