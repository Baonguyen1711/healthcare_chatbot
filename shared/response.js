"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatResponse = void 0;
const formatResponse = (statusCode, body, headers) => ({
    statusCode,
    headers: {
        "Access-Control-Allow-Origin": "*", // or your frontend URL
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
});
exports.formatResponse = formatResponse;
