// feedback-service/handlers/feedbackApi.ts

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    submitFeedback,
    getUserFeedbacks,
    getFeedback,
    adminGetFeedbacks,
    updateFeedbackStatus,
    getFeedbackStatistics,
} from "./feedbackService";
import { formatResponse } from "../shared/response";
import { fail, isAppError } from "../queue-service/services/errors";
import { withAuth } from "../shared/authRequire";

function badRequest(code: string, message: string, details?: any) {
    return formatResponse(400, {
        success: false,
        error: { code, message, details },
    });
}

function toErrorResponse(err: any): APIGatewayProxyResult {
    console.error("API error:", err);

    if (isAppError(err)) {
        return formatResponse(err.statusCode, {
            success: false,
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
            },
        });
    }

    if (err?.name === "SyntaxError") {
        return badRequest(
            "INVALID_JSON",
            "Dữ liệu gửi lên không hợp lệ (JSON)."
        );
    }

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

// ===== 1. SUBMIT FEEDBACK =====

const submitFeedbackCore = async (
    event: APIGatewayProxyEvent,
    userId: string
): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || "{}");

        if (!body.visitDate) {
            return badRequest(
                "VISIT_DATE_REQUIRED",
                "Vui lòng chọn ngày khám."
            );
        }

        if (!body.category) {
            return badRequest(
                "CATEGORY_REQUIRED",
                "Vui lòng chọn danh mục phản hồi."
            );
        }

        if (!body.rating || body.rating < 1 || body.rating > 5) {
            return badRequest(
                "INVALID_RATING",
                "Đánh giá phải từ 1 đến 5 sao."
            );
        }

        if (!body.comment) {
            return badRequest(
                "COMMENT_REQUIRED",
                "Vui lòng nhập nhận xét của bạn."
            );
        }

        const result = await submitFeedback(userId, {
            visitDate: body.visitDate,
            category: body.category,
            rating: body.rating,
            comment: body.comment,
            doctorName: body.doctorName,
            department: body.department,
            images: body.images,
            isAnonymous: body.isAnonymous || false,
        });

        return formatResponse(201, { success: true, data: result });
    } catch (err: any) {
        return toErrorResponse(err);
    }
};

export const submitFeedbackHandler = withAuth(submitFeedbackCore);

// ===== 2. GET USER FEEDBACKS =====

const getUserFeedbacksCore = async (
    event: APIGatewayProxyEvent,
    userId: string
): Promise<APIGatewayProxyResult> => {
    try {
        const query = event.queryStringParameters || {};
        const limit = query.limit ? parseInt(query.limit) : 20;

        const result = await getUserFeedbacks(userId, limit);

        return formatResponse(200, { success: true, data: result });
    } catch (err: any) {
        return toErrorResponse(err);
    }
};

export const getUserFeedbacksHandler = withAuth(getUserFeedbacksCore);

// ===== 3. GET SINGLE FEEDBACK =====

const getFeedbackCore = async (
    event: APIGatewayProxyEvent,
    userId: string
): Promise<APIGatewayProxyResult> => {
    try {
        const feedbackId = event.pathParameters?.feedbackId;

        if (!feedbackId) {
            return badRequest(
                "FEEDBACK_ID_REQUIRED",
                "Vui lòng cung cấp ID phản hồi."
            );
        }

        const result = await getFeedback(feedbackId, userId);

        return formatResponse(200, { success: true, data: result });
    } catch (err: any) {
        return toErrorResponse(err);
    }
};

export const getFeedbackHandler = withAuth(getFeedbackCore);

// ===== 4. ADMIN GET ALL FEEDBACKS =====

export const adminGetFeedbacksHandler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const query = event.queryStringParameters || {};

        const result = await adminGetFeedbacks({
            status: query.status as any,
            category: query.category as any,
            minRating: query.minRating ? parseInt(query.minRating) : undefined,
            maxRating: query.maxRating ? parseInt(query.maxRating) : undefined,
            fromDate: query.fromDate,
            toDate: query.toDate,
            limit: query.limit ? parseInt(query.limit) : 50,
        });

        return formatResponse(200, { success: true, data: result });
    } catch (err: any) {
        return toErrorResponse(err);
    }
};

// ===== 5. UPDATE FEEDBACK STATUS =====

export const updateFeedbackStatusHandler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || "{}");
        const adminUserId = body.adminUserId || "admin-001";

        if (!body.feedbackId) {
            return badRequest(
                "FEEDBACK_ID_REQUIRED",
                "Vui lòng cung cấp ID phản hồi."
            );
        }

        if (!body.status) {
            return badRequest(
                "STATUS_REQUIRED",
                "Vui lòng cung cấp trạng thái mới."
            );
        }

        const result = await updateFeedbackStatus(adminUserId, {
            feedbackId: body.feedbackId,
            status: body.status,
            adminNote: body.adminNote,
        });

        return formatResponse(200, { success: true, data: result });
    } catch (err: any) {
        return toErrorResponse(err);
    }
};

// ===== 6. GET STATISTICS =====

export const getStatisticsHandler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const query = event.queryStringParameters || {};

        const result = await getFeedbackStatistics(
            query.fromDate,
            query.toDate
        );

        return formatResponse(200, { success: true, data: result });
    } catch (err: any) {
        return toErrorResponse(err);
    }
};
