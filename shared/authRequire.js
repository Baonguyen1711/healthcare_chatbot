"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAuthAndRole = exports.withAuth = void 0;
const verifyJwt_1 = require("../shared/verifyJwt");
const response_1 = require("../shared/response");
const withAuth = (handler) => {
    return async (event) => {
        try {
            const authHeader = event.headers?.authorization || event.headers?.Authorization;
            if (!authHeader) {
                return (0, response_1.formatResponse)(401, { message: "Missing Authorization header" });
            }
            const token = authHeader.split(" ")[1];
            const decoded = await (0, verifyJwt_1.verifyToken)(token);
            const userId = decoded.sub;
            if (!userId) {
                return (0, response_1.formatResponse)(401, { message: "Invalid token payload" });
            }
            // Call the actual handler and pass userId
            return await handler(event, userId);
        }
        catch (err) {
            return (0, response_1.formatResponse)(401, { message: "Unauthorized", detail: err.message });
        }
    };
};
exports.withAuth = withAuth;
const withAuthAndRole = (handler, allowedRoles) => {
    return async (event) => {
        try {
            const authHeader = event.headers?.authorization || event.headers?.Authorization;
            if (!authHeader) {
                return (0, response_1.formatResponse)(401, { message: "Missing Authorization header" });
            }
            const token = authHeader.split(" ")[1];
            if (!token) {
                return (0, response_1.formatResponse)(401, { message: "Missing token" });
            }
            // Verify JWT and get decoded payload
            const decoded = await (0, verifyJwt_1.verifyToken)(token);
            // Extract role from token
            const userRole = decoded["custom:role"] || decoded["cognito:groups"]?.[0];
            if (!userRole) {
                return (0, response_1.formatResponse)(401, { message: "Role not found in token" });
            }
            // Check if role is allowed
            if (!allowedRoles.includes(userRole)) {
                return (0, response_1.formatResponse)(403, { message: "User does not have permission" });
            }
            // Extract userId
            const userId = decoded.sub;
            if (!userId) {
                return (0, response_1.formatResponse)(401, { message: "Invalid token payload" });
            }
            // Call the original handler
            return handler(event, userId);
        }
        catch (err) {
            return (0, response_1.formatResponse)(401, { message: err.message });
        }
    };
};
exports.withAuthAndRole = withAuthAndRole;
