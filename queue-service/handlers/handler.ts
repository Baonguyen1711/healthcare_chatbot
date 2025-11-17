// queue-service/handlers/handler.ts

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    adminAdvanceQueue,
    getTicketStatus,
    reissueTicket,
    requestOtpForCheckin,
    verifyOtpAndIssueTicket,
} from "../services/queueService";

function jsonResponse(statusCode: number, body: any): APIGatewayProxyResult {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify(body),
    };
}

export const requestOtp = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || "{}");
        const result = await requestOtpForCheckin({
            phoneNumber: body.phoneNumber,
        });
        return jsonResponse(200, {
            success: true,
            data: result,
        });
    } catch (err: any) {
        console.error(err);
        return jsonResponse(400, {
            success: false,
            error: err.message || "REQUEST_OTP_FAILED",
        });
    }
};

export const verifyAndIssue = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || "{}");
        const result = await verifyOtpAndIssueTicket(body);
        return jsonResponse(200, {
            success: true,
            data: result,
        });
    } catch (err: any) {
        console.error(err);
        return jsonResponse(400, {
            success: false,
            error: err.message || "ISSUE_TICKET_FAILED",
        });
    }
};

export const getStatus = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const query = event.queryStringParameters || {};
        const ticketCode = query.ticketCode as string;
        const visitDate = (query.visitDate as string) || undefined;

        const result = await getTicketStatus({
            ticketCode,
            visitDate,
        });

        return jsonResponse(200, {
            success: true,
            data: result,
        });
    } catch (err: any) {
        console.error(err);
        return jsonResponse(400, {
            success: false,
            error: err.message || "GET_STATUS_FAILED",
        });
    }
};

export const reissue = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || "{}");
        // body cần: { phoneNumber, visitDate?, queueType? }
        const result = await reissueTicket(body);
        return jsonResponse(200, {
            success: true,
            data: result,
        });
    } catch (err: any) {
        console.error(err);
        return jsonResponse(400, {
            success: false,
            error: err.message || "REISSUE_FAILED",
        });
    }
};

export const advanceQueue = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || "{}");
        // body: { queueType, visitDate?, step? }
        const result = await adminAdvanceQueue(body);
        return jsonResponse(200, {
            success: true,
            data: result,
        });
    } catch (err: any) {
        console.error(err);
        return jsonResponse(400, {
            success: false,
            error: err.message || "ADVANCE_QUEUE_FAILED",
        });
    }
};
