// queue-service/handlers/api.ts

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    adminAdvanceQueue,
    getStatus,
    reissueTicket,
    checkIn,
} from "../services/queueService";
import { formatResponse } from "../../shared/response";
import { isAppError, fail } from "../services/errors";
import { withAuth } from "../../shared/authRequire";

const HARDCODED_USER_ID = "user-123456";
const HARDCODED_ADMIN_ID = "admin-001";

function badRequest(code: string, message: string, details?: any) {
    return formatResponse(400, {
        success: false,
        error: { code, message, details },
    });
}

function toErrorResponse(err: any): APIGatewayProxyResult {
    console.error("API error:", err);

    // AppError từ service -> trả đúng status + message
    if (isAppError(err)) {
        return formatResponse(err.statusCode, {
            success: false,
            error: {
                code: err.code,
                message: err.message,
                details: err.details, // optional
            },
        });
    }

    // Parse JSON lỗi khi body không hợp lệ
    if (err?.name === "SyntaxError") {
        return badRequest(
            "INVALID_JSON",
            "Dữ liệu gửi lên không hợp lệ (JSON)."
        );
    }

    // Fallback lỗi hệ thống
    const internal = fail("INTERNAL_ERROR", 500, {
        raw: err?.message ?? String(err),
    });
    return formatResponse(internal.statusCode, {
        success: false,
        error: {
            code: internal.code,
            message: internal.message,
            details: internal.details,
        },
    });
}
const checkInCore = async (
    event: APIGatewayProxyEvent,
    userId: string
): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || "{}");

        if (!body.fullName) {
            return badRequest(
                "FULL_NAME_REQUIRED",
                "Bạn vui lòng cung cấp họ tên."
            );
        }
        if (!body.phoneNumber) {
            return badRequest(
                "PHONE_NUMBER_REQUIRED",
                "Bạn vui lòng cung cấp số điện thoại."
            );
        }
        if (!body.nationalId) {
            return badRequest(
                "NATIONAL_ID_REQUIRED",
                "Bạn vui lòng cung cấp CCCD/CMND."
            );
        }
        if (!body.queueType) {
            return badRequest(
                "QUEUE_TYPE_REQUIRED",
                "Bạn vui lòng chọn loại khám (BHYT hoặc Dịch vụ)."
            );
        }

        // userId lấy từ JWT (withAuth), không lấy từ body/query nữa
        const result = await checkIn(userId, {
            fullName: body.fullName,
            phoneNumber: body.phoneNumber,
            nationalId: body.nationalId,
            queueType: body.queueType,
            visitDate: body.visitDate,
        });

        return formatResponse(200, { success: true, data: result });
    } catch (err: any) {
        return toErrorResponse(err);
    }
};

export const checkInHandler = withAuth(checkInCore);

// ===== 2) GET STATUS (Kiểm tra STT) =====
const getStatusCore = async (
    event: APIGatewayProxyEvent,
    userId: string
): Promise<APIGatewayProxyResult> => {
    try {
        const query = event.queryStringParameters || {};

        if (!query.queueType) {
            return badRequest(
                "QUEUE_TYPE_REQUIRED",
                "Bạn vui lòng chọn loại khám (BHYT hoặc Dịch vụ)."
            );
        }

        const result = await getStatus(userId, {
            queueType: query.queueType as any,
            visitDate: query.visitDate,
        });

        return formatResponse(200, { success: true, data: result });
    } catch (err: any) {
        return toErrorResponse(err);
    }
};

export const getStatusHandler = withAuth(getStatusCore);

// ===== 3) REISSUE TICKET (Lấy lại số) =====
const reissueCore = async (
    event: APIGatewayProxyEvent,
    userId: string
): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || "{}");

        if (!body.queueType) {
            return badRequest(
                "QUEUE_TYPE_REQUIRED",
                "Bạn vui lòng chọn loại khám (BHYT hoặc Dịch vụ)."
            );
        }

        const result = await reissueTicket(userId, {
            queueType: body.queueType,
            visitDate: body.visitDate,
        });

        return formatResponse(200, { success: true, data: result });
    } catch (err: any) {
        return toErrorResponse(err);
    }
};

export const reissueHandler = withAuth(reissueCore);

// ===== 4. ADMIN ADVANCE QUEUE (Tăng STT) =====
export const advanceQueueHandler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || "{}");

        if (!body.queueType) {
            return badRequest(
                "QUEUE_TYPE_REQUIRED",
                "Bạn vui lòng chọn loại hàng đợi (BHYT hoặc Dịch vụ)."
            );
        }

        const adminUserId = body.adminUserId || HARDCODED_ADMIN_ID;

        const result = await adminAdvanceQueue(adminUserId, {
            queueType: body.queueType,
            visitDate: body.visitDate,
            step: body.step,
        });

        return formatResponse(200, { success: true, data: result });
    } catch (err: any) {
        return toErrorResponse(err);
    }
};
