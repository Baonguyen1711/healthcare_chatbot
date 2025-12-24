// feedback-service/services/feedbackService.ts

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    QueryCommand,
    UpdateCommand,
    ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import {
    SubmitFeedbackInput,
    FeedbackResponse,
    FeedbackListResponse,
    AdminGetFeedbacksInput,
    UpdateFeedbackStatusInput,
    FeedbackStatistics,
    FeedbackCategory,
    FeedbackStatus,
} from "./feedbackModels";
import { v4 as uuidv4 } from "uuid";
import { fail } from "../queue-service/services/errors";

const IS_OFFLINE = process.env.IS_OFFLINE === "true";

const clientConfig: any = {
    region: process.env.AWS_REGION || "us-east-1",
};

if (IS_OFFLINE) {
    console.log("[OFFLINE MODE] Connecting to DynamoDB Local");
    clientConfig.endpoint = "http://localhost:8000";
    clientConfig.credentials = {
        accessKeyId: "fakeMyKey",
        secretAccessKey: "fakeSecretKey",
    };
}

const client = new DynamoDBClient(clientConfig);
const ddb = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
});

const FEEDBACKS_TABLE = process.env.FEEDBACKS_TABLE || "Feedbacks";

// Constants
const MIN_COMMENT_LENGTH = 10;
const MAX_COMMENT_LENGTH = 2000;
const MAX_IMAGES = 5;

// ===== 1. SUBMIT FEEDBACK =====

export async function submitFeedback(
    userId: string,
    input: SubmitFeedbackInput
): Promise<FeedbackResponse> {
    const {
        visitDate,
        category,
        rating,
        comment,
        doctorName,
        department,
        images,
        isAnonymous = false,
    } = input;

    console.log(`[submitFeedback] userId=${userId}, category=${category}`);

    // Validations
    if (rating < 1 || rating > 5) {
        throw fail("INVALID_RATING", 400, { rating });
    }

    if (comment.length < MIN_COMMENT_LENGTH) {
        throw fail("COMMENT_TOO_SHORT", 400, {
            minLength: MIN_COMMENT_LENGTH,
            actualLength: comment.length,
        });
    }

    if (comment.length > MAX_COMMENT_LENGTH) {
        throw fail("COMMENT_TOO_LONG", 400, {
            maxLength: MAX_COMMENT_LENGTH,
            actualLength: comment.length,
        });
    }

    if (images && images.length > MAX_IMAGES) {
        throw fail("TOO_MANY_IMAGES", 400, {
            maxImages: MAX_IMAGES,
            provided: images.length,
        });
    }

    // Check duplicate feedback for same visit date
    const existingFeedbacks = await ddb.send(
        new QueryCommand({
            TableName: FEEDBACKS_TABLE,
            KeyConditionExpression: "UserId = :uid",
            FilterExpression: "VisitDate = :vdate",
            ExpressionAttributeValues: {
                ":uid": userId,
                ":vdate": visitDate,
            },
        })
    );

    if (existingFeedbacks.Items && existingFeedbacks.Items.length > 0) {
        throw fail("DUPLICATE_FEEDBACK", 400, {
            message: "Bạn đã gửi phản hồi cho ngày khám này rồi",
        });
    }

    // Get patient info if not anonymous
    let userName: string | undefined;
    let userPhone: string | undefined;

    const now = new Date().toISOString();
    const feedbackId = uuidv4();

    const feedbackItem = {
        FeedbackId: feedbackId,
        UserId: userId,
        UserName: !isAnonymous ? userName : undefined,
        UserPhone: !isAnonymous ? userPhone : undefined,
        VisitDate: visitDate,
        Category: category,
        Rating: rating,
        Comment: comment,
        DoctorName: doctorName,
        Department: department,
        Images: images,
        IsAnonymous: isAnonymous,
        Status: "PENDING" as FeedbackStatus,
        CreatedAt: now,
        UpdatedAt: now,
    };

    await ddb.send(
        new PutCommand({
            TableName: FEEDBACKS_TABLE,
            Item: feedbackItem,
        })
    );

    console.log(`[submitFeedback] Created feedback: ${feedbackId}`);

    return mapToFeedbackResponse(feedbackItem);
}

// ===== 2. GET USER FEEDBACKS =====

export async function getUserFeedbacks(
    userId: string,
    limit: number = 20
): Promise<FeedbackListResponse> {
    console.log(`[getUserFeedbacks] userId=${userId}`);

    const result = await ddb.send(
        new QueryCommand({
            TableName: FEEDBACKS_TABLE,
            KeyConditionExpression: "UserId = :uid",
            ExpressionAttributeValues: { ":uid": userId },
            ScanIndexForward: false,
            Limit: limit,
        })
    );

    const feedbacks = (result.Items || []).map(mapToFeedbackResponse);

    return {
        feedbacks,
        lastEvaluatedKey: result.LastEvaluatedKey
            ? JSON.stringify(result.LastEvaluatedKey)
            : undefined,
    };
}

// ===== 3. GET SINGLE FEEDBACK =====

export async function getFeedback(
    feedbackId: string,
    userId?: string
): Promise<FeedbackResponse> {
    console.log(`[getFeedback] feedbackId=${feedbackId}`);

    // Query by FeedbackId using GSI
    const result = await ddb.send(
        new QueryCommand({
            TableName: FEEDBACKS_TABLE,
            IndexName: "FeedbackIdIndex",
            KeyConditionExpression: "FeedbackId = :fid",
            ExpressionAttributeValues: {
                ":fid": feedbackId,
            },
        })
    );

    if (!result.Items || result.Items.length === 0) {
        throw fail("FEEDBACK_NOT_FOUND", 404, { feedbackId });
    }

    const feedback = result.Items[0];

    // Authorization check if userId provided
    if (userId && feedback.UserId !== userId) {
        throw fail("UNAUTHORIZED_ACCESS", 403, {
            message: "Bạn không có quyền xem phản hồi này",
        });
    }

    return mapToFeedbackResponse(feedback);
}

// ===== 4. ADMIN GET ALL FEEDBACKS =====

export async function adminGetFeedbacks(
    input: AdminGetFeedbacksInput
): Promise<FeedbackListResponse> {
    const {
        status,
        category,
        minRating,
        maxRating,
        fromDate,
        toDate,
        limit = 50,
    } = input;

    console.log(`[adminGetFeedbacks] filters:`, input);

    // Build filter expressions
    const filterExpressions: string[] = [];
    const expressionValues: any = {};

    if (status) {
        filterExpressions.push("#status = :status");
        expressionValues[":status"] = status;
    }

    if (category) {
        filterExpressions.push("Category = :category");
        expressionValues[":category"] = category;
    }

    if (minRating) {
        filterExpressions.push("Rating >= :minRating");
        expressionValues[":minRating"] = minRating;
    }

    if (maxRating) {
        filterExpressions.push("Rating <= :maxRating");
        expressionValues[":maxRating"] = maxRating;
    }

    if (fromDate) {
        filterExpressions.push("VisitDate >= :fromDate");
        expressionValues[":fromDate"] = fromDate;
    }

    if (toDate) {
        filterExpressions.push("VisitDate <= :toDate");
        expressionValues[":toDate"] = toDate;
    }

    const scanParams: any = {
        TableName: FEEDBACKS_TABLE,
        Limit: limit,
    };

    if (filterExpressions.length > 0) {
        scanParams.FilterExpression = filterExpressions.join(" AND ");
        scanParams.ExpressionAttributeValues = expressionValues;

        if (status) {
            scanParams.ExpressionAttributeNames = { "#status": "Status" };
        }
    }

    const result = await ddb.send(new ScanCommand(scanParams));

    const feedbacks = (result.Items || [])
        .map(mapToFeedbackResponse)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
        feedbacks,
        total: result.Count,
        lastEvaluatedKey: result.LastEvaluatedKey
            ? JSON.stringify(result.LastEvaluatedKey)
            : undefined,
    };
}

// ===== 5. UPDATE FEEDBACK STATUS =====

export async function updateFeedbackStatus(
    adminUserId: string,
    input: UpdateFeedbackStatusInput
): Promise<FeedbackResponse> {
    const { feedbackId, status, adminNote } = input;

    console.log(
        `[updateFeedbackStatus] feedbackId=${feedbackId}, status=${status}`
    );

    // Get feedback first to validate it exists
    const existingFeedback = await getFeedback(feedbackId);

    const now = new Date().toISOString();

    // Query to get the actual item with composite key
    const queryResult = await ddb.send(
        new QueryCommand({
            TableName: FEEDBACKS_TABLE,
            IndexName: "FeedbackIdIndex",
            KeyConditionExpression: "FeedbackId = :fid",
            ExpressionAttributeValues: {
                ":fid": feedbackId,
            },
        })
    );

    if (!queryResult.Items || queryResult.Items.length === 0) {
        throw fail("FEEDBACK_NOT_FOUND", 404, { feedbackId });
    }

    const item = queryResult.Items[0];

    await ddb.send(
        new UpdateCommand({
            TableName: FEEDBACKS_TABLE,
            Key: {
                UserId: item.UserId,
                CreatedAt: item.CreatedAt,
            },
            UpdateExpression:
                "SET #status = :status, UpdatedAt = :now, AdminNote = :note, ReviewedBy = :admin, ReviewedAt = :now",
            ExpressionAttributeNames: {
                "#status": "Status",
            },
            ExpressionAttributeValues: {
                ":status": status,
                ":now": now,
                ":note": adminNote || null,
                ":admin": adminUserId,
            },
        })
    );

    // Return updated feedback
    return getFeedback(feedbackId);
}

// ===== 6. GET FEEDBACK STATISTICS =====

export async function getFeedbackStatistics(
    fromDate?: string,
    toDate?: string
): Promise<FeedbackStatistics> {
    console.log(
        `[getFeedbackStatistics] fromDate=${fromDate}, toDate=${toDate}`
    );

    const scanParams: any = {
        TableName: FEEDBACKS_TABLE,
    };

    // Add date filters if provided
    if (fromDate || toDate) {
        const filters: string[] = [];
        const values: any = {};

        if (fromDate) {
            filters.push("VisitDate >= :from");
            values[":from"] = fromDate;
        }
        if (toDate) {
            filters.push("VisitDate <= :to");
            values[":to"] = toDate;
        }

        scanParams.FilterExpression = filters.join(" AND ");
        scanParams.ExpressionAttributeValues = values;
    }

    const result = await ddb.send(new ScanCommand(scanParams));
    const feedbacks = result.Items || [];

    // Calculate statistics
    const totalFeedbacks = feedbacks.length;
    const totalRating = feedbacks.reduce((sum, f) => sum + (f.Rating || 0), 0);
    const averageRating = totalFeedbacks > 0 ? totalRating / totalFeedbacks : 0;

    // Rating distribution
    const ratingDistribution = {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
    };

    feedbacks.forEach((f) => {
        if (f.Rating >= 1 && f.Rating <= 5) {
            ratingDistribution[
                String(f.Rating) as keyof typeof ratingDistribution
            ]++;
        }
    });

    // Category distribution
    const categoryDistribution: Record<FeedbackCategory, number> = {
        SERVICE_QUALITY: 0,
        DOCTOR_EXPERTISE: 0,
        FACILITY: 0,
        WAIT_TIME: 0,
        STAFF_ATTITUDE: 0,
        CLEANLINESS: 0,
        OTHER: 0,
    };

    feedbacks.forEach((f) => {
        if (f.Category && categoryDistribution.hasOwnProperty(f.Category)) {
            categoryDistribution[f.Category as FeedbackCategory]++;
        }
    });

    // Status distribution
    const statusDistribution: Record<FeedbackStatus, number> = {
        PENDING: 0,
        REVIEWED: 0,
        RESOLVED: 0,
    };

    feedbacks.forEach((f) => {
        if (f.Status && statusDistribution.hasOwnProperty(f.Status)) {
            statusDistribution[f.Status as FeedbackStatus]++;
        }
    });

    // Recent trend (last 7 days)
    const recentTrend = calculateRecentTrend(feedbacks);

    return {
        totalFeedbacks,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
        categoryDistribution,
        statusDistribution,
        recentTrend,
    };
}

// ===== Helper Functions =====

function mapToFeedbackResponse(item: any): FeedbackResponse {
    return {
        feedbackId: item.FeedbackId,
        userId: item.UserId,
        userName: item.UserName,
        userPhone: item.UserPhone,
        visitDate: item.VisitDate,
        category: item.Category,
        rating: item.Rating,
        comment: item.Comment,
        doctorName: item.DoctorName,
        department: item.Department,
        images: item.Images,
        isAnonymous: item.IsAnonymous || false,
        status: item.Status,
        adminNote: item.AdminNote,
        createdAt: item.CreatedAt,
        updatedAt: item.UpdatedAt,
    };
}

function calculateRecentTrend(feedbacks: any[]) {
    const trend: { date: string; count: number; avgRating: number }[] = [];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
    });

    last7Days.forEach((date) => {
        const dayFeedbacks = feedbacks.filter((f) => f.VisitDate === date);
        const count = dayFeedbacks.length;
        const avgRating =
            count > 0
                ? dayFeedbacks.reduce((sum, f) => sum + f.Rating, 0) / count
                : 0;

        trend.push({
            date,
            count,
            avgRating: Math.round(avgRating * 10) / 10,
        });
    });

    return trend;
}
