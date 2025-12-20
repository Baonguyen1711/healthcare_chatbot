// queue-service/models/queueModels.ts

export type QueueType = "BHYT" | "DV";

export type TicketStatus =
    | "WAITING"
    | "CALLING"
    | "DONE"
    | "CANCELLED"
    | "MISSED";

// 1. Check-in (lấy số)
export interface CheckInInput {
    fullName: string;
    phoneNumber: string;
    nationalId?: string;
    queueType: QueueType;
    visitDate?: string; // YYYY-MM-DD, default today
}

// 2. Get status (kiểm tra STT)
export interface StatusQueryInput {
    queueType: QueueType;
    visitDate?: string; // YYYY-MM-DD, default today
}

// 3. Reissue ticket (lấy lại số)
export interface ReissueTicketInput {
    queueType: QueueType;
    visitDate?: string; // YYYY-MM-DD, default today
}

// 4. Admin advance queue
export interface AdminAdvanceQueueInput {
    queueType: QueueType;
    visitDate?: string; // YYYY-MM-DD, default today
    step?: number; // default = 1
}

// Response khi get status hoặc check-in
export interface TicketResponse {
    ticketCode: string;
    ticketNumber: number;
    queueType: QueueType;
    visitDate: string;
    ticketStatus: TicketStatus;
    currentNumber: number; // STT hiện tại của hàng chờ
    waitingBefore: number; // số VÉ WAITING thực tế
    estimatedWaitMinutes: number; // thời gian ước tính (bao gồm cả người hiện tại)
    issuedAt: string;
    calledAt?: string;
    patientInfo: {
        fullName: string;
        phoneNumber: string;
        nationalId?: string;
    };
}

// Admin advance response
export interface AdminAdvanceResponse {
    queueId: string;
    queueType: QueueType;
    visitDate: string;
    previousNumber: number;
    currentNumber: number;
    lastIssuedNumber: number;
    updatedAt: string;
}
