// feedback-service/models/feedbackModels.ts

export type FeedbackCategory =
    | "SERVICE_QUALITY" // Chất lượng dịch vụ
    | "DOCTOR_EXPERTISE" // Chuyên môn bác sĩ
    | "FACILITY" // Cơ sở vật chất
    | "WAIT_TIME" // Thời gian chờ
    | "STAFF_ATTITUDE" // Thái độ nhân viên
    | "CLEANLINESS" // Vệ sinh
    | "OTHER"; // Khác

export type FeedbackStatus = "PENDING" | "REVIEWED" | "RESOLVED";

// 1. Submit Feedback Input
export interface SubmitFeedbackInput {
    visitDate: string; // YYYY-MM-DD
    category: FeedbackCategory;
    rating: number; // 1-5 sao
    comment: string;
    doctorName?: string;
    department?: string;
    images?: string[]; // Base64 hoặc S3 URLs
    isAnonymous?: boolean;
}

// 2. Get User Feedbacks Input
export interface GetUserFeedbacksInput {
    limit?: number;
    lastEvaluatedKey?: string;
}

// 3. Admin Get All Feedbacks Input
export interface AdminGetFeedbacksInput {
    status?: FeedbackStatus;
    category?: FeedbackCategory;
    minRating?: number;
    maxRating?: number;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    lastEvaluatedKey?: string;
}

// 4. Update Feedback Status Input
export interface UpdateFeedbackStatusInput {
    feedbackId: string;
    status: FeedbackStatus;
    adminNote?: string;
}

// Response Types
export interface FeedbackResponse {
    feedbackId: string;
    userId: string;
    userName?: string;
    userPhone?: string;
    visitDate: string;
    category: FeedbackCategory;
    rating: number;
    comment: string;
    doctorName?: string;
    department?: string;
    images?: string[];
    isAnonymous: boolean;
    status: FeedbackStatus;
    adminNote?: string;
    createdAt: string;
    updatedAt: string;
}

export interface FeedbackListResponse {
    feedbacks: FeedbackResponse[];
    lastEvaluatedKey?: string;
    total?: number;
}

// Statistics Response
export interface FeedbackStatistics {
    totalFeedbacks: number;
    averageRating: number;
    ratingDistribution: {
        "1": number;
        "2": number;
        "3": number;
        "4": number;
        "5": number;
    };
    categoryDistribution: Record<FeedbackCategory, number>;
    statusDistribution: Record<FeedbackStatus, number>;
    recentTrend: {
        date: string;
        count: number;
        avgRating: number;
    }[];
}

// Error codes specific to feedback
export type FeedbackErrorCode =
    | "INVALID_RATING"
    | "COMMENT_TOO_SHORT"
    | "COMMENT_TOO_LONG"
    | "INVALID_CATEGORY"
    | "FEEDBACK_NOT_FOUND"
    | "DUPLICATE_FEEDBACK"
    | "UNAUTHORIZED_ACCESS"
    | "IMAGE_UPLOAD_FAILED"
    | "TOO_MANY_IMAGES";
