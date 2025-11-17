export type QueueType = "BHYT" | "DV";

export interface CheckinRequestOtpInput {
    phoneNumber: string;
}

export interface VerifyAndIssueTicketInput {
    fullName: string;
    phoneNumber: string;
    nationalId?: string;
    queueType: QueueType;
    visitDate?: string; // YYYY-MM-DD
    otpCode: string;
}

export interface TicketStatusQueryInput {
    ticketCode: string; // "BHYT-023"
    visitDate: string; // YYYY-MM-DD
}

export interface ReissueTicketInput {
    phoneNumber: string;
    queueType?: QueueType;
    visitDate: string; // YYYY-MM-DD
}

export interface AdminAdvanceQueueInput {
    queueType: QueueType;
    visitDate: string; // YYYY-MM-DD
    step?: number; // default = 1
}

export interface TicketStatusResponse {
    ticketCode: string;
    ticketNumber: number;
    queueType: QueueType;
    visitDate: string;
    ticketStatus: string;
    currentNumber: number;
    waitingBefore: number;
}
