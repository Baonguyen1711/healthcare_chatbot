// queue-service/shared/errors.ts

export type ErrorCode =
    | "QUEUE_CLOSED_FOR_TODAY"
    | "NO_TICKET_FOUND"
    | "NO_ACTIVE_TICKET_FOUND"
    | "NO_WAITING_TICKET_TO_REISSUE"
    | "MAX_REISSUE_LIMIT_REACHED"
    | "CANNOT_REISSUE_NEAR_YOUR_TURN"
    | "QUEUE_NOT_FOUND"
    | "INVALID_STEP"
    | "STEP_TOO_LARGE"
    | "NO_TICKETS_ISSUED_YET"
    | "QUEUE_ALREADY_FINISHED"
    | "INTERNAL_ERROR"
    | "DUPLICATE_FEEDBACK"
    | "TOO_MANY_IMAGES"
    | "INVALID_IMAGE_FORMAT"
    | "COMMENT_TOO_LONG"
    | "COMMENT_TOO_SHORT"
    | "INVALID_RATING"
    | "UNAUTHORIZED_ACCESS"
    | "FEEDBACK_NOT_FOUND"
    | "INVALID_CATEGORY"
    | "IMAGE_UPLOAD_FAILED";

export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    public readonly details?: any;

    constructor(
        code: ErrorCode,
        message: string,
        statusCode = 400,
        details?: any
    ) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}

// Map code -> user-friendly message
export const ErrorMessages: Record<ErrorCode, string> = {
    QUEUE_CLOSED_FOR_TODAY:
        "Hôm nay quầy đã đóng. Bạn vui lòng quay lại vào ngày mai nhé.",
    NO_TICKET_FOUND:
        "Mình chưa tìm thấy số của bạn hôm nay. Bạn muốn check-in để lấy số không?",
    NO_ACTIVE_TICKET_FOUND:
        "Bạn có số nhưng hiện không còn ở trạng thái chờ/gọi (có thể đã hoàn tất, bị lỡ hoặc bị hủy).",
    NO_WAITING_TICKET_TO_REISSUE:
        "Bạn không có số đang chờ để cấp lại (chỉ cấp lại khi số đang ở trạng thái chờ).",
    MAX_REISSUE_LIMIT_REACHED:
        "Bạn đã cấp lại số quá số lần cho phép trong hôm nay.",
    CANNOT_REISSUE_NEAR_YOUR_TURN:
        "Số của bạn đã gần đến lượt nên không thể cấp lại. Bạn vui lòng chờ gọi số nhé.",
    QUEUE_NOT_FOUND:
        "Không tìm thấy hàng đợi tương ứng. Vui lòng thử lại hoặc đổi loại khám.",
    INVALID_STEP: "Bước nhảy không hợp lệ.",
    STEP_TOO_LARGE: "Bước nhảy quá lớn. Vui lòng thử lại với số nhỏ hơn.",
    NO_TICKETS_ISSUED_YET: "Hiện chưa phát số nào cho hàng đợi này.",
    QUEUE_ALREADY_FINISHED: "Hàng đợi hôm nay đã chạy đến số cuối cùng.",
    INTERNAL_ERROR: "Có lỗi hệ thống. Bạn vui lòng thử lại sau.",
    DUPLICATE_FEEDBACK: "Bạn đã gửi phản hồi cho lần khám này rồi.",
    TOO_MANY_IMAGES:
        "Bạn đã gửi quá nhiều hình ảnh kèm theo phản hồi. Vui lòng giảm bớt.",
    INVALID_IMAGE_FORMAT:
        "Định dạng hình ảnh không hợp lệ. Vui lòng chỉ gửi hình ảnh dưới dạng Base64 hoặc URL.",
    COMMENT_TOO_LONG:
        "Nhận xét của bạn quá dài. Vui lòng giới hạn trong 1000 ký tự.",
    COMMENT_TOO_SHORT:
        "Nhận xét của bạn quá ngắn. Vui lòng nhập thêm chi tiết.",
    INVALID_RATING: "Đánh giá không hợp lệ. Vui lòng chọn từ 1 đến 5.",
    UNAUTHORIZED_ACCESS: "Bạn không có quyền truy cập phản hồi này.",
    FEEDBACK_NOT_FOUND: "Không tìm thấy phản hồi tương ứng.",
    INVALID_CATEGORY: "Danh mục phản hồi không hợp lệ.",
    IMAGE_UPLOAD_FAILED: "Tải lên hình ảnh kèm theo phản hồi thất bại.",
};

// Helper tạo AppError nhanh
export const fail = (
    code: ErrorCode,
    statusCode = 400,
    details?: any,
    messageOverride?: string
) => {
    return new AppError(
        code,
        messageOverride ?? ErrorMessages[code],
        statusCode,
        details
    );
};

// Type guard
export const isAppError = (e: any): e is AppError => {
    return e && typeof e === "object" && "code" in e && "statusCode" in e;
};
