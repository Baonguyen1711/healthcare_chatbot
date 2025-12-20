// queue-service/handlers/api.ts

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    adminAdvanceQueue,
    getStatus,
    reissueTicket,
    checkIn,
} from "../services/queueService";
import { formatResponse } from "../../shared/response";

const HARDCODED_USER_ID = "user-123456";
const HARDCODED_ADMIN_ID = "admin-001";

// ===== 1. CHECK-IN (Lấy số) =====
export const checkInHandler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || "{}");

        // Validate required fields
        if (!body.fullName) {
            return formatResponse(400, {
                success: false,
                error: "FULL_NAME_REQUIRED",
            });
        }
        if (!body.phoneNumber) {
            return formatResponse(400, {
                success: false,
                error: "PHONE_NUMBER_REQUIRED",
            });
        }
        if (!body.queueType) {
            return formatResponse(400, {
                success: false,
                error: "QUEUE_TYPE_REQUIRED",
            });
        }

        const userId = body.userId || HARDCODED_USER_ID;

        const result = await checkIn(userId, {
            fullName: body.fullName,
            phoneNumber: body.phoneNumber,
            nationalId: body.nationalId,
            queueType: body.queueType,
            visitDate: body.visitDate,
        });

        return formatResponse(200, { success: true, data: result });
    } catch (err: any) {
        console.error("checkIn error:", err);
        return formatResponse(400, {
            success: false,
            error: err.message || "CHECK_IN_FAILED",
        });
    }
};

// ===== 2. GET STATUS (Kiểm tra STT) =====
export const getStatusHandler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const query = event.queryStringParameters || {};

        if (!query.queueType) {
            return formatResponse(400, {
                success: false,
                error: "QUEUE_TYPE_REQUIRED",
            });
        }

        const userId = query.userId || HARDCODED_USER_ID;

        const result = await getStatus(userId, {
            queueType: query.queueType as any,
            visitDate: query.visitDate,
        });

        return formatResponse(200, { success: true, data: result });
    } catch (err: any) {
        console.error("getStatus error:", err);
        return formatResponse(400, {
            success: false,
            error: err.message || "GET_STATUS_FAILED",
        });
    }
};

// ===== 3. REISSUE TICKET (Lấy lại số) =====
export const reissueHandler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || "{}");

        if (!body.queueType) {
            return formatResponse(400, {
                success: false,
                error: "QUEUE_TYPE_REQUIRED",
            });
        }

        const userId = body.userId || HARDCODED_USER_ID;

        const result = await reissueTicket(userId, {
            queueType: body.queueType,
            visitDate: body.visitDate,
        });

        return formatResponse(200, { success: true, data: result });
    } catch (err: any) {
        console.error("reissue error:", err);
        return formatResponse(400, {
            success: false,
            error: err.message || "REISSUE_FAILED",
        });
    }
};

// ===== 4. ADMIN ADVANCE QUEUE (Tăng STT) =====
export const advanceQueueHandler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || "{}");

        if (!body.queueType) {
            return formatResponse(400, {
                success: false,
                error: "QUEUE_TYPE_REQUIRED",
            });
        }

        const adminUserId = body.adminUserId || HARDCODED_ADMIN_ID;

        const result = await adminAdvanceQueue(adminUserId, {
            queueType: body.queueType,
            visitDate: body.visitDate,
            step: body.step,
        });

        return formatResponse(200, { success: true, data: result });
    } catch (err: any) {
        console.error("advanceQueue error:", err);
        return formatResponse(400, {
            success: false,
            error: err.message || "ADVANCE_QUEUE_FAILED",
        });
    }
};
