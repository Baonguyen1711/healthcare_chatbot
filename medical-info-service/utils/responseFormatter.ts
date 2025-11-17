import { APIGatewayProxyResult } from "aws-lambda";

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    pagination?: PaginationMetadata;
    cache?: CacheMetadata;
  };
}

export interface PaginationMetadata {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface CacheMetadata {
  cached: boolean;
  cachedAt?: string;
  ttl?: number;
}

/**
 * Format success response
 */
export const formatSuccessResponse = (
  data: any,
  statusCode: number = 200,
  metadata?: Partial<ApiResponse["metadata"]>
): APIGatewayProxyResult => {
  const response: ApiResponse = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
    },
    body: JSON.stringify(response),
  };
};

/**
 * Format error response
 */
export const formatErrorResponse = (
  statusCode: number,
  message: string,
  code?: string,
  details?: any
): APIGatewayProxyResult => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: code || `ERROR_${statusCode}`,
      message,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
    body: JSON.stringify(response),
  };
};

/**
 * Format paginated response
 */
export const formatPaginatedResponse = (
  data: any[],
  total: number,
  limit: number,
  offset: number,
  statusCode: number = 200
): APIGatewayProxyResult => {
  const hasMore = offset + data.length < total;

  return formatSuccessResponse(data, statusCode, {
    pagination: {
      total,
      limit,
      offset,
      hasMore,
    },
  });
};

/**
 * Format cached response
 */
export const formatCachedResponse = (
  data: any,
  cached: boolean,
  cachedAt?: string,
  ttl?: number,
  statusCode: number = 200
): APIGatewayProxyResult => {
  return formatSuccessResponse(data, statusCode, {
    cache: {
      cached,
      cachedAt,
      ttl,
    },
  });
};

/**
 * Format list response with metadata
 */
export const formatListResponse = (
  items: any[],
  metadata?: {
    total?: number;
    category?: string;
    source?: string;
    cached?: boolean;
  },
  statusCode: number = 200
): APIGatewayProxyResult => {
  return formatSuccessResponse(
    {
      items,
      count: items.length,
      ...metadata,
    },
    statusCode
  );
};

/**
 * Format created response (201)
 */
export const formatCreatedResponse = (
  data: any,
  location?: string
): APIGatewayProxyResult => {
  const response = formatSuccessResponse(data, 201);
  if (location) {
    response.headers = {
      ...response.headers,
      Location: location,
    };
  }

  return response;
};

/**
 * Format no content response (204)
 */
export const formatNoContentResponse = (): APIGatewayProxyResult => {
  return {
    statusCode: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: "",
  };
};

/**
 * Format validation error response
 */
export const formatValidationErrorResponse = (
  errors: string[]
): APIGatewayProxyResult => {
  return formatErrorResponse(400, "Validation failed", "VALIDATION_ERROR", {
    errors,
  });
};

/**
 * Format not found response
 */
export const formatNotFoundResponse = (
  resource: string,
  id?: string
): APIGatewayProxyResult => {
  const message = id
    ? `${resource} with ID ${id} not found`
    : `${resource} not found`;
  return formatErrorResponse(404, message, "NOT_FOUND");
};

/**
 * Format unauthorized response
 */
export const formatUnauthorizedResponse = (
  message: string = "Unauthorized access"
): APIGatewayProxyResult => {
  return formatErrorResponse(401, message, "UNAUTHORIZED");
};

/**
 * Format forbidden response
 */
export const formatForbiddenResponse = (
  message: string = "Access forbidden"
): APIGatewayProxyResult => {
  return formatErrorResponse(403, message, "FORBIDDEN");
};

/**
 * Format rate limit response
 */
export const formatRateLimitResponse = (
  retryAfter: number = 60
): APIGatewayProxyResult => {
  const response = formatErrorResponse(
    429,
    "Too many requests",
    "RATE_LIMIT_EXCEEDED",
    { retryAfter }
  );

  response.headers = {
    ...response.headers,
    "Retry-After": retryAfter.toString(),
  };

  return response;
};

/**
 * Format server error response
 */
export const formatServerErrorResponse = (
  message: string = "Internal server error",
  includeDetails: boolean = false,
  details?: any
): APIGatewayProxyResult => {
  return formatErrorResponse(
    500,
    message,
    "INTERNAL_ERROR",
    includeDetails ? details : undefined
  );
};

/**
 * Format service unavailable response
 */
export const formatServiceUnavailableResponse = (
  message: string = "Service temporarily unavailable"
): APIGatewayProxyResult => {
  return formatErrorResponse(503, message, "SERVICE_UNAVAILABLE");
};

/**
 * Format CORS preflight response
 */
export const formatCorsPreflightResponse = (): APIGatewayProxyResult => {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
    body: "",
  };
};

/**
 * Helper to add custom headers to any response
 */
export const addHeaders = (
  response: APIGatewayProxyResult,
  headers: Record<string, string>
): APIGatewayProxyResult => {
  return {
    ...response,
    headers: {
      ...response.headers,
      ...headers,
    },
  };
};

/**
 * Helper to format health check response
 */
export const formatHealthCheckResponse = (
  status: "healthy" | "unhealthy",
  checks?: Record<string, boolean>
): APIGatewayProxyResult => {
  const statusCode = status === "healthy" ? 200 : 503;
  return formatSuccessResponse(
    {
      status,
      checks,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    statusCode
  );
};
