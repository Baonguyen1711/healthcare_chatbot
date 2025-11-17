import { APIGatewayProxyResult } from "aws-lambda";

export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR",
  CACHE_ERROR = "CACHE_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  INVALID_REQUEST = "INVALID_REQUEST",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
}

export interface AppError {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: any;
  timestamp: string;
}

export class ErrorHandler {
  /**
   * Create a standardized error object
   */
  static createError(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any
  ): AppError {
    return {
      code,
      message,
      statusCode,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(errors: string[]): AppError {
    return this.createError(
      ErrorCode.VALIDATION_ERROR,
      "Validation failed",
      400,
      { errors }
    );
  }

  /**
   * Handle not found errors
   */
  static handleNotFoundError(resource: string, id?: string): AppError {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    return this.createError(ErrorCode.NOT_FOUND, message, 404);
  }

  /**
   * Handle database errors
   */
  static handleDatabaseError(error: any): AppError {
    console.error("Database error:", error);
    return this.createError(
      ErrorCode.DATABASE_ERROR,
      "Database operation failed",
      500,
      {
        errorName: error.name,
        errorMessage: error.message,
      }
    );
  }

  /**
   * Handle external API errors
   */
  static handleExternalApiError(source: string, error: any): AppError {
    console.error(`External API error from ${source}:`, error);
    return this.createError(
      ErrorCode.EXTERNAL_API_ERROR,
      `Failed to fetch data from ${source}`,
      502,
      {
        source,
        errorMessage: error.message,
      }
    );
  }

  /**
   * Handle cache errors
   */
  static handleCacheError(error: any): AppError {
    console.error("Cache error:", error);
    // Cache errors should not break the main flow
    // Log it but return a non-critical error
    return this.createError(
      ErrorCode.CACHE_ERROR,
      "Cache operation failed",
      500,
      {
        errorMessage: error.message,
        note: "Request proceeded without cache",
      }
    );
  }

  /**
   * Handle rate limit errors
   */
  static handleRateLimitError(limit: number, period: string): AppError {
    return this.createError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded: ${limit} requests per ${period}`,
      429,
      {
        limit,
        period,
        retryAfter: 60, // seconds
      }
    );
  }

  /**
   * Handle timeout errors
   */
  static handleTimeoutError(operation: string): AppError {
    return this.createError(
      ErrorCode.TIMEOUT_ERROR,
      `Operation timed out: ${operation}`,
      504
    );
  }

  /**
   * Handle invalid request errors
   */
  static handleInvalidRequestError(message: string, details?: any): AppError {
    return this.createError(ErrorCode.INVALID_REQUEST, message, 400, details);
  }

  /**
   * Handle unauthorized errors
   */
  static handleUnauthorizedError(
    message: string = "Unauthorized access"
  ): AppError {
    return this.createError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  /**
   * Handle generic errors
   */
  static handleGenericError(error: any): AppError {
    console.error("Unhandled error:", error);
    // Don't expose internal error details to clients
    return this.createError(
      ErrorCode.INTERNAL_ERROR,
      "An unexpected error occurred",
      500,
      process.env.NODE_ENV === "development"
        ? {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
          }
        : undefined
    );
  }

  /**
   * Convert AppError to API Gateway response
   */
  static toApiGatewayResponse(error: AppError): APIGatewayProxyResult {
    return {
      statusCode: error.statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        timestamp: error.timestamp,
      }),
    };
  }

  /**
   * Safe error handler wrapper for Lambda handlers
   */
  static async handleAsync<T>(
    fn: () => Promise<T>,
    errorContext?: string
  ): Promise<T | AppError> {
    try {
      return await fn();
    } catch (error: any) {
      if (errorContext) {
        console.error(`Error in ${errorContext}:`, error);
      }

      // Check if it's already an AppError
      if (error.code && Object.values(ErrorCode).includes(error.code)) {
        return error as AppError;
      }

      // Handle specific AWS SDK errors
      if (error.code === "ResourceNotFoundException") {
        return this.handleNotFoundError("Resource");
      }

      if (error.code === "ValidationException") {
        return this.handleValidationError([error.message]);
      }

      if (error.code === "ProvisionedThroughputExceededException") {
        return this.handleRateLimitError(5, "second");
      }

      if (error.code === "TimeoutError" || error.code === "RequestTimeout") {
        return this.handleTimeoutError(errorContext || "operation");
      }

      // Handle network errors
      if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
        return this.handleExternalApiError("external service", error);
      }

      // Default to generic error
      return this.handleGenericError(error);
    }
  }

  /**
   * Log error with context
   */
  static logError(error: any, context?: Record<string, any>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
      },
      context,
    };

    console.error("Error logged:", JSON.stringify(logEntry, null, 2));

    // In production, you might want to send this to CloudWatch Logs Insights
    // or another monitoring service
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: any): boolean {
    const retryableCodes = [
      "ProvisionedThroughputExceededException",
      "ThrottlingException",
      "RequestTimeout",
      "ServiceUnavailable",
      "InternalServerError",
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * Retry logic wrapper
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        if (!this.isRetryable(error) || attempt === maxRetries) {
          throw error;
        }

        console.log(
          `Retry attempt ${attempt}/${maxRetries} after error:`,
          error.message
        );
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

/**
 * Decorator for error handling (if using decorators)
 */
export function HandleErrors(errorContext?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return ErrorHandler.handleAsync(
        () => originalMethod.apply(this, args),
        errorContext || `${target.constructor.name}.${propertyKey}`
      );
    };

    return descriptor;
  };
}
