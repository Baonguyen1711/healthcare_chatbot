"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatHealthCheckResponse = exports.addHeaders = exports.formatCorsPreflightResponse = exports.formatServiceUnavailableResponse = exports.formatServerErrorResponse = exports.formatRateLimitResponse = exports.formatForbiddenResponse = exports.formatUnauthorizedResponse = exports.formatNotFoundResponse = exports.formatValidationErrorResponse = exports.formatNoContentResponse = exports.formatCreatedResponse = exports.formatListResponse = exports.formatCachedResponse = exports.formatPaginatedResponse = exports.formatErrorResponse = exports.formatSuccessResponse = void 0;
/**
 * Format success response
 */
var formatSuccessResponse = function (data, statusCode, metadata) {
    if (statusCode === void 0) { statusCode = 200; }
    var response = {
        success: true,
        data: data,
        metadata: __assign({ timestamp: new Date().toISOString() }, metadata),
    };
    return {
        statusCode: statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
        },
        body: JSON.stringify(response),
    };
};
exports.formatSuccessResponse = formatSuccessResponse;
/**
 * Format error response
 */
var formatErrorResponse = function (statusCode, message, code, details) {
    var response = {
        success: false,
        error: {
            code: code || "ERROR_".concat(statusCode),
            message: message,
            details: details,
        },
        metadata: {
            timestamp: new Date().toISOString(),
        },
    };
    return {
        statusCode: statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        body: JSON.stringify(response),
    };
};
exports.formatErrorResponse = formatErrorResponse;
/**
 * Format paginated response
 */
var formatPaginatedResponse = function (data, total, limit, offset, statusCode) {
    if (statusCode === void 0) { statusCode = 200; }
    var hasMore = offset + data.length < total;
    return (0, exports.formatSuccessResponse)(data, statusCode, {
        pagination: {
            total: total,
            limit: limit,
            offset: offset,
            hasMore: hasMore,
        },
    });
};
exports.formatPaginatedResponse = formatPaginatedResponse;
/**
 * Format cached response
 */
var formatCachedResponse = function (data, cached, cachedAt, ttl, statusCode) {
    if (statusCode === void 0) { statusCode = 200; }
    return (0, exports.formatSuccessResponse)(data, statusCode, {
        cache: {
            cached: cached,
            cachedAt: cachedAt,
            ttl: ttl,
        },
    });
};
exports.formatCachedResponse = formatCachedResponse;
/**
 * Format list response with metadata
 */
var formatListResponse = function (items, metadata, statusCode) {
    if (statusCode === void 0) { statusCode = 200; }
    return (0, exports.formatSuccessResponse)(__assign({ items: items, count: items.length }, metadata), statusCode);
};
exports.formatListResponse = formatListResponse;
/**
 * Format created response (201)
 */
var formatCreatedResponse = function (data, location) {
    var response = (0, exports.formatSuccessResponse)(data, 201);
    if (location) {
        response.headers = __assign(__assign({}, response.headers), { Location: location });
    }
    return response;
};
exports.formatCreatedResponse = formatCreatedResponse;
/**
 * Format no content response (204)
 */
var formatNoContentResponse = function () {
    return {
        statusCode: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
        },
        body: "",
    };
};
exports.formatNoContentResponse = formatNoContentResponse;
/**
 * Format validation error response
 */
var formatValidationErrorResponse = function (errors) {
    return (0, exports.formatErrorResponse)(400, "Validation failed", "VALIDATION_ERROR", {
        errors: errors,
    });
};
exports.formatValidationErrorResponse = formatValidationErrorResponse;
/**
 * Format not found response
 */
var formatNotFoundResponse = function (resource, id) {
    var message = id
        ? "".concat(resource, " with ID ").concat(id, " not found")
        : "".concat(resource, " not found");
    return (0, exports.formatErrorResponse)(404, message, "NOT_FOUND");
};
exports.formatNotFoundResponse = formatNotFoundResponse;
/**
 * Format unauthorized response
 */
var formatUnauthorizedResponse = function (message) {
    if (message === void 0) { message = "Unauthorized access"; }
    return (0, exports.formatErrorResponse)(401, message, "UNAUTHORIZED");
};
exports.formatUnauthorizedResponse = formatUnauthorizedResponse;
/**
 * Format forbidden response
 */
var formatForbiddenResponse = function (message) {
    if (message === void 0) { message = "Access forbidden"; }
    return (0, exports.formatErrorResponse)(403, message, "FORBIDDEN");
};
exports.formatForbiddenResponse = formatForbiddenResponse;
/**
 * Format rate limit response
 */
var formatRateLimitResponse = function (retryAfter) {
    if (retryAfter === void 0) { retryAfter = 60; }
    var response = (0, exports.formatErrorResponse)(429, "Too many requests", "RATE_LIMIT_EXCEEDED", { retryAfter: retryAfter });
    response.headers = __assign(__assign({}, response.headers), { "Retry-After": retryAfter.toString() });
    return response;
};
exports.formatRateLimitResponse = formatRateLimitResponse;
/**
 * Format server error response
 */
var formatServerErrorResponse = function (message, includeDetails, details) {
    if (message === void 0) { message = "Internal server error"; }
    if (includeDetails === void 0) { includeDetails = false; }
    return (0, exports.formatErrorResponse)(500, message, "INTERNAL_ERROR", includeDetails ? details : undefined);
};
exports.formatServerErrorResponse = formatServerErrorResponse;
/**
 * Format service unavailable response
 */
var formatServiceUnavailableResponse = function (message) {
    if (message === void 0) { message = "Service temporarily unavailable"; }
    return (0, exports.formatErrorResponse)(503, message, "SERVICE_UNAVAILABLE");
};
exports.formatServiceUnavailableResponse = formatServiceUnavailableResponse;
/**
 * Format CORS preflight response
 */
var formatCorsPreflightResponse = function () {
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Access-Control-Max-Age": "86400",
        },
        body: "",
    };
};
exports.formatCorsPreflightResponse = formatCorsPreflightResponse;
/**
 * Helper to add custom headers to any response
 */
var addHeaders = function (response, headers) {
    return __assign(__assign({}, response), { headers: __assign(__assign({}, response.headers), headers) });
};
exports.addHeaders = addHeaders;
/**
 * Helper to format health check response
 */
var formatHealthCheckResponse = function (status, checks) {
    var statusCode = status === "healthy" ? 200 : 503;
    return (0, exports.formatSuccessResponse)({
        status: status,
        checks: checks,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    }, statusCode);
};
exports.formatHealthCheckResponse = formatHealthCheckResponse;
//# sourceMappingURL=responseFormatter.js.map