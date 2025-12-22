import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { verifyToken } from "../shared/verifyJwt";
import { formatResponse } from "../shared/response";

type LambdaHandler = (event: APIGatewayProxyEvent, userId: string) => Promise<APIGatewayProxyResult>;

export const withAuth = (handler: LambdaHandler) => {
    return async (event: APIGatewayProxyEvent) => {
        try {
            const authHeader = event.headers?.authorization || event.headers?.Authorization;
            if (!authHeader) {
                return formatResponse(401, { message: "Missing Authorization header" });
            }

            const token = authHeader.split(" ")[1];
            const decoded = await verifyToken<{ sub: string; email?: string; role?: string }>(token);

            const userId = decoded.sub;
            if (!userId) {
                return formatResponse(401, { message: "Invalid token payload" });
            }

            // Call the actual handler and pass userId
            return await handler(event, userId);
        } catch (err: any) {
            return formatResponse(401, { message: "Unauthorized", detail: err.message });
        }
    };
};

export const withAuthAndRole = (handler: LambdaHandler, allowedRoles: string[]) => {
    return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        try {
            const authHeader = event.headers?.authorization || event.headers?.Authorization;
            if (!authHeader) {
                return formatResponse(401, { message: "Missing Authorization header" });
            }

            const token = authHeader.split(" ")[1];
            if (!token) {
                return formatResponse(401, { message: "Missing token" });
            }

            // Verify JWT and get decoded payload
            const decoded = await verifyToken<{ sub: string; email?: string; role?: string; "custom:role"?: string; "cognito:groups"?: string[]; }>(token);

            // Extract role from token
            const userRole = decoded["custom:role"] || decoded["cognito:groups"]?.[0];
            if (!userRole) {
                return formatResponse(401, { message: "Role not found in token" });
            }

            // Check if role is allowed
            if (!allowedRoles.includes(userRole)) {
                return formatResponse(403, { message: "User does not have permission" });
            }

            // Extract userId
            const userId = decoded.sub;
            if (!userId) {
                return formatResponse(401, { message: "Invalid token payload" });
            }

            // Call the original handler
            return handler(event, userId);
        } catch (err: any) {
            return formatResponse(401, { message: err.message });
        }
    };
};
