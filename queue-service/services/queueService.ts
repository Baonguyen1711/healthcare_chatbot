// queue-service/services/queueService.ts

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    QueryCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
    AdminAdvanceQueueInput,
    AdminAdvanceResponse,
    QueueType,
    ReissueTicketInput,
    StatusQueryInput,
    TicketResponse,
    CheckInInput,
    TicketStatus,
} from "../models/queueModels";
import { fail } from "./errors";

const IS_OFFLINE = process.env.IS_OFFLINE === "true";

const clientConfig: any = {
    region: process.env.AWS_REGION || "us-east-1",
};

if (IS_OFFLINE) {
    console.log(
        "🚀 [OFFLINE MODE] Connecting to DynamoDB Local at http://localhost:8000"
    );
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

const QUEUES_TABLE = process.env.QUEUES_TABLE || "Queues";
const TICKETS_TABLE = process.env.TICKETS_TABLE || "Tickets";
const PATIENTS_TABLE = process.env.PATIENTS_TABLE || "Patients";

// Constants
const DEFAULT_AVG_SERVICE_TIME_MINUTES = 5;
const MAX_REISSUE_COUNT = 3;
const QUEUE_CLOSE_HOUR = 24;

// ===== Helpers =====

function buildQueueId(visitDate: string, queueType: QueueType): string {
    return `DATE#${visitDate}#TYPE#${queueType}`;
}

function formatTicketCode(queueType: QueueType, ticketNumber: number): string {
    return `${queueType}-${ticketNumber.toString().padStart(3, "0")}`;
}

function today(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function isQueueOpen(): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour < QUEUE_CLOSE_HOUR;
}

// ===== 1. CHECK-IN (Lấy số) =====

export async function checkIn(
    userId: string,
    input: CheckInInput
): Promise<TicketResponse> {
    const { fullName, phoneNumber, nationalId, queueType } = input;
    const visitDate = input.visitDate || today();
    const now = new Date();
    const queueId = buildQueueId(visitDate, queueType);

    console.log(
        `[checkIn] userId=${userId}, queueType=${queueType}, visitDate=${visitDate}`
    );

    // Validation: Queue phải đang mở
    if (visitDate === today() && !isQueueOpen()) {
        throw fail("QUEUE_CLOSED_FOR_TODAY", 400, { visitDate, queueType });
    }

    // Kiểm tra user đã có ticket ACTIVE chưa (WAITING hoặc CALLING)
    const existingTickets = await ddb.send(
        new QueryCommand({
            TableName: TICKETS_TABLE,
            IndexName: "UserIdIndex",
            KeyConditionExpression: "UserId = :uid AND VisitDate = :vdate",
            ExpressionAttributeValues: {
                ":uid": userId,
                ":vdate": visitDate,
            },
        })
    );

    console.log(
        `[checkIn] Found ${
            existingTickets.Items?.length || 0
        } total tickets for user`
    );

    // Filter để tìm ticket ACTIVE của cùng queueType
    if (existingTickets.Items && existingTickets.Items.length > 0) {
        const activeTicket = existingTickets.Items.find(
            (ticket) =>
                ticket.QueueType === queueType &&
                (ticket.Status === "WAITING" || ticket.Status === "CALLING")
        );

        if (activeTicket) {
            console.log(
                `[checkIn] User already has active ticket: ${activeTicket.TicketCode}`
            );
            return await buildTicketResponse(activeTicket, queueId);
        }
    }

    console.log("[checkIn] Creating new ticket...");

    // 1. Upsert thông tin bệnh nhân
    await ddb.send(
        new PutCommand({
            TableName: PATIENTS_TABLE,
            Item: {
                UserId: userId,
                PhoneNumber: phoneNumber,
                FullName: fullName,
                NationalId: nationalId,
                UpdatedAt: now.toISOString(),
            },
        })
    );

    // 2. Atomic tăng LastIssuedNumber
    const queueRes = await ddb.send(
        new UpdateCommand({
            TableName: QUEUES_TABLE,
            Key: { QueueId: queueId },
            UpdateExpression:
                "SET LastIssuedNumber = if_not_exists(LastIssuedNumber, :zero) + :one, " +
                "QueueType = if_not_exists(QueueType, :qType), " +
                "VisitDate = if_not_exists(VisitDate, :vDate), " +
                "Prefix = if_not_exists(Prefix, :prefix), " +
                "QueueStatus = if_not_exists(QueueStatus, :queueStatus), " +
                "CurrentNumber = if_not_exists(CurrentNumber, :zero), " +
                "CreatedAt = if_not_exists(CreatedAt, :createdAt), " +
                "UpdatedAt = :updatedAt, " +
                "AvgServiceTimeMinutes = if_not_exists(AvgServiceTimeMinutes, :avgTime)",
            ExpressionAttributeValues: {
                ":zero": 0,
                ":one": 1,
                ":qType": queueType,
                ":vDate": visitDate,
                ":prefix": queueType,
                ":queueStatus": "OPEN",
                ":createdAt": now.toISOString(),
                ":updatedAt": now.toISOString(),
                ":avgTime": DEFAULT_AVG_SERVICE_TIME_MINUTES,
            },
            ReturnValues: "ALL_NEW",
        })
    );

    const ticketNumber: number = queueRes.Attributes?.LastIssuedNumber || 1;
    const ticketCode = formatTicketCode(queueType, ticketNumber);

    console.log(`[checkIn] Issued ticket: ${ticketCode}`);

    // 3. Tạo ticket
    const ticketItem = {
        QueueId: queueId,
        TicketNumber: ticketNumber,
        TicketCode: ticketCode,
        VisitDate: visitDate,
        QueueType: queueType,
        Status: "WAITING" as TicketStatus,
        IssuedAt: now.toISOString(),
        UserId: userId,
        PatientPhone: phoneNumber,
        PatientName: fullName,
        NationalId: nationalId,
        ReissueCount: 0,
    };

    await ddb.send(
        new PutCommand({
            TableName: TICKETS_TABLE,
            Item: ticketItem,
        })
    );

    // Log audit
    await logAudit({
        action: "CHECK_IN",
        userId,
        queueId,
        ticketNumber,
        details: { ticketCode, queueType },
    });

    return await buildTicketResponse(ticketItem, queueId);
}

// ===== 2. GET STATUS (Kiểm tra STT) =====

export async function getStatus(
    userId: string,
    input: StatusQueryInput
): Promise<TicketResponse> {
    const { queueType } = input;
    const visitDate = input.visitDate || today();
    const queueId = buildQueueId(visitDate, queueType);

    console.log(
        `[getStatus] userId=${userId}, queueType=${queueType}, visitDate=${visitDate}`
    );

    // Lấy tất cả tickets của user trong ngày
    const ticketList = await ddb.send(
        new QueryCommand({
            TableName: TICKETS_TABLE,
            IndexName: "UserIdIndex",
            KeyConditionExpression: "UserId = :uid AND VisitDate = :vdate",
            ExpressionAttributeValues: {
                ":uid": userId,
                ":vdate": visitDate,
            },
            ScanIndexForward: false,
        })
    );

    console.log(`[getStatus] Found ${ticketList.Items?.length || 0} tickets`);

    if (!ticketList.Items || ticketList.Items.length === 0) {
        throw fail("NO_TICKET_FOUND", 404, { visitDate, queueType });
    }

    // Tìm ticket ACTIVE của queueType này
    const activeTicket = ticketList.Items.find(
        (ticket) =>
            ticket.QueueType === queueType &&
            (ticket.Status === "WAITING" || ticket.Status === "CALLING")
    );

    if (!activeTicket) {
        throw fail("NO_ACTIVE_TICKET_FOUND", 404, {
            visitDate,
            queueType,
            existingStatuses: ticketList.Items.map((t) => ({
                code: t.TicketCode,
                status: t.Status,
            })),
        });
    }

    return await buildTicketResponse(activeTicket, queueId);
}

// ===== 3. REISSUE TICKET (Lấy lại số) =====

export async function reissueTicket(
    userId: string,
    input: ReissueTicketInput
): Promise<TicketResponse> {
    const { queueType } = input;
    const visitDate = input.visitDate || today();
    const queueId = buildQueueId(visitDate, queueType);
    const now = new Date();

    console.log(`[reissueTicket] userId=${userId}, queueType=${queueType}`);

    // Validation: Queue phải đang mở
    if (visitDate === today() && !isQueueOpen()) {
        throw fail("QUEUE_CLOSED_FOR_TODAY", 400, { visitDate, queueType });
    }

    // Tìm ticket của user
    const ticketList = await ddb.send(
        new QueryCommand({
            TableName: TICKETS_TABLE,
            IndexName: "UserIdIndex",
            KeyConditionExpression: "UserId = :uid AND VisitDate = :vdate",
            ExpressionAttributeValues: {
                ":uid": userId,
                ":vdate": visitDate,
            },
            ScanIndexForward: false,
        })
    );

    if (!ticketList.Items || ticketList.Items.length === 0) {
        throw fail("NO_TICKET_FOUND", 404, { visitDate, queueType });
    }

    // Tìm ticket WAITING (chỉ cho phép reissue khi đang WAITING)
    const oldTicket = ticketList.Items.find(
        (ticket) =>
            ticket.QueueType === queueType && ticket.Status === "WAITING"
    );

    if (!oldTicket) {
        throw fail("NO_WAITING_TICKET_TO_REISSUE", 400, {
            visitDate,
            queueType,
            found: ticketList.Items.map((t) => ({
                code: t.TicketCode,
                status: t.Status,
            })),
        });
    }

    // Validation: Kiểm tra số lần reissue
    const reissueCount = oldTicket.ReissueCount || 0;
    if (reissueCount >= MAX_REISSUE_COUNT) {
        throw fail("MAX_REISSUE_LIMIT_REACHED", 400, {
            max: MAX_REISSUE_COUNT,
            reissueCount,
        });
    }

    const oldTicketNumber: number = oldTicket.TicketNumber;
    const oldTicketCode: string = oldTicket.TicketCode;

    console.log(
        `[reissueTicket] Cancelling old ticket: ${oldTicketCode} (reissue count: ${reissueCount})`
    );

    // Lấy thông tin queue để kiểm tra
    const queueRes = await ddb.send(
        new GetCommand({
            TableName: QUEUES_TABLE,
            Key: { QueueId: queueId },
        })
    );

    if (!queueRes.Item) {
        throw fail("QUEUE_NOT_FOUND", 404, { queueId, queueType, visitDate });
    }

    const currentNumber = queueRes.Item.CurrentNumber || 0;

    // Validation: Không cho reissue nếu đã gần đến lượt (trong 3 số)
    if (oldTicketNumber <= currentNumber + 3) {
        throw fail("CANNOT_REISSUE_NEAR_YOUR_TURN", 400, {
            oldTicketNumber,
            currentNumber,
            threshold: 3,
        });
    }

    // Huỷ số cũ - đánh dấu CANCELLED
    await ddb.send(
        new UpdateCommand({
            TableName: TICKETS_TABLE,
            Key: { QueueId: queueId, TicketNumber: oldTicketNumber },
            UpdateExpression:
                "SET #s = :cancelled, Notes = :note, CancelledAt = :ts",
            ExpressionAttributeNames: { "#s": "Status" },
            ExpressionAttributeValues: {
                ":cancelled": "CANCELLED",
                ":note": `Reissued by user (attempt ${reissueCount + 1})`,
                ":ts": now.toISOString(),
            },
        })
    );

    // Tăng LastIssuedNumber để lấy số mới
    const queueUpdateRes = await ddb.send(
        new UpdateCommand({
            TableName: QUEUES_TABLE,
            Key: { QueueId: queueId },
            UpdateExpression:
                "SET LastIssuedNumber = if_not_exists(LastIssuedNumber, :zero) + :one, " +
                "UpdatedAt = :now",
            ExpressionAttributeValues: {
                ":zero": 0,
                ":one": 1,
                ":now": now.toISOString(),
            },
            ReturnValues: "ALL_NEW",
        })
    );

    const newTicketNumber =
        queueUpdateRes.Attributes?.LastIssuedNumber || oldTicketNumber + 1;
    const newTicketCode = formatTicketCode(queueType, newTicketNumber);

    console.log(`[reissueTicket] Issued new ticket: ${newTicketCode}`);

    const newTicketItem = {
        QueueId: queueId,
        TicketNumber: newTicketNumber,
        TicketCode: newTicketCode,
        VisitDate: visitDate,
        QueueType: queueType,
        Status: "WAITING" as TicketStatus,
        IssuedAt: now.toISOString(),
        UserId: userId,
        PatientPhone: oldTicket.PatientPhone,
        PatientName: oldTicket.PatientName,
        NationalId: oldTicket.NationalId,
        ReissuedFromTicketCode: oldTicketCode,
        ReissueCount: reissueCount + 1,
    };

    await ddb.send(
        new PutCommand({
            TableName: TICKETS_TABLE,
            Item: newTicketItem,
        })
    );

    // Log audit
    await logAudit({
        action: "REISSUE",
        userId,
        queueId,
        ticketNumber: newTicketNumber,
        details: {
            oldTicketCode,
            newTicketCode,
            reissueCount: reissueCount + 1,
        },
    });

    return await buildTicketResponse(newTicketItem, queueId);
}

// ===== 4. ADMIN ADVANCE QUEUE =====

export async function adminAdvanceQueue(
    adminUserId: string,
    input: AdminAdvanceQueueInput
): Promise<AdminAdvanceResponse> {
    const { queueType } = input;
    const visitDate = input.visitDate || today();
    const step = input.step ?? 1;

    if (step <= 0) throw fail("INVALID_STEP", 400, { step });
    if (step > 10) throw fail("STEP_TOO_LARGE", 400, { step, max: 10 });

    const queueId = buildQueueId(visitDate, queueType);
    const now = new Date().toISOString();

    console.log(`[adminAdvanceQueue] queueId=${queueId}, step=${step}`);

    // Lấy thông tin queue hiện tại
    const queueRes = await ddb.send(
        new GetCommand({
            TableName: QUEUES_TABLE,
            Key: { QueueId: queueId },
        })
    );

    if (!queueRes.Item) {
        throw fail("QUEUE_NOT_FOUND", 404, { queueId, queueType, visitDate });
    }

    const currentNumber: number = queueRes.Item.CurrentNumber || 0;
    const lastIssued: number = queueRes.Item.LastIssuedNumber || 0;
    const previousNumber = currentNumber;

    // Validation: không có số nào để advance
    if (lastIssued === 0) throw fail("NO_TICKETS_ISSUED_YET", 400, { queueId });
    if (currentNumber >= lastIssued)
        throw fail("QUEUE_ALREADY_FINISHED", 400, {
            currentNumber,
            lastIssued,
        });

    // Tính số mới
    let newCurrentNumber = currentNumber + step;

    // Không cho vượt quá số cuối đã phát
    if (newCurrentNumber > lastIssued) {
        newCurrentNumber = lastIssued;
    }

    console.log(
        `[adminAdvanceQueue] ${previousNumber} → ${newCurrentNumber} (last: ${lastIssued})`
    );

    // Track thời gian để cập nhật avg service time
    let actualServiceTime: number | undefined;
    if (previousNumber > 0) {
        const prevTicket = await getTicketByNumber(queueId, previousNumber);
        if (prevTicket && prevTicket.CalledAt) {
            const calledTime = new Date(prevTicket.CalledAt).getTime();
            const nowTime = new Date().getTime();
            actualServiceTime = Math.round((nowTime - calledTime) / 60000); // minutes
        }
    }

    // Cập nhật CurrentNumber trong Queue + avg service time
    const updateExpr = actualServiceTime
        ? "SET CurrentNumber = :cn, UpdatedAt = :now, UpdatedBy = :admin, " +
          "AvgServiceTimeMinutes = :avgTime"
        : "SET CurrentNumber = :cn, UpdatedAt = :now, UpdatedBy = :admin";

    const exprValues: any = {
        ":cn": newCurrentNumber,
        ":now": now,
        ":admin": adminUserId,
    };

    if (actualServiceTime) {
        const oldAvg =
            queueRes.Item.AvgServiceTimeMinutes ||
            DEFAULT_AVG_SERVICE_TIME_MINUTES;
        const newAvg = Math.round(oldAvg * 0.7 + actualServiceTime * 0.3);
        exprValues[":avgTime"] = newAvg;
        console.log(
            `[adminAdvanceQueue] Updated avg service time: ${oldAvg} → ${newAvg} mins`
        );
    }

    await ddb.send(
        new UpdateCommand({
            TableName: QUEUES_TABLE,
            Key: { QueueId: queueId },
            UpdateExpression: updateExpr,
            ExpressionAttributeValues: exprValues,
        })
    );

    // Cập nhật trạng thái các tickets
    // 1. Đánh dấu số cũ (previousNumber) là DONE nếu > 0
    if (previousNumber > 0 && previousNumber <= lastIssued) {
        await updateTicketStatus(queueId, previousNumber, "DONE", now);
    }

    // 2. Đánh dấu các số bị bỏ qua (skip) là MISSED
    if (newCurrentNumber > previousNumber + 1) {
        for (let i = previousNumber + 1; i < newCurrentNumber; i++) {
            if (i <= lastIssued) {
                const skippedTicket = await getTicketByNumber(queueId, i);
                // Chỉ mark MISSED nếu ticket đang WAITING
                if (skippedTicket && skippedTicket.Status === "WAITING") {
                    await updateTicketStatus(queueId, i, "MISSED", now);
                }
            }
        }
    }

    // 3. Đánh dấu số hiện tại (newCurrentNumber) là CALLING
    if (newCurrentNumber > 0 && newCurrentNumber <= lastIssued) {
        await updateTicketStatus(queueId, newCurrentNumber, "CALLING", now);
    }

    // Log audit
    await logAudit({
        action: "ADVANCE_QUEUE",
        userId: adminUserId,
        queueId,
        ticketNumber: newCurrentNumber,
        details: {
            previousNumber,
            newCurrentNumber,
            step,
            actualServiceTime,
        },
    });

    return {
        queueId,
        queueType,
        visitDate,
        previousNumber,
        currentNumber: newCurrentNumber,
        lastIssuedNumber: lastIssued,
        updatedAt: now,
    };
}

// ===== Helper: Get Ticket By Number =====

async function getTicketByNumber(
    queueId: string,
    ticketNumber: number
): Promise<any | null> {
    try {
        const result = await ddb.send(
            new GetCommand({
                TableName: TICKETS_TABLE,
                Key: { QueueId: queueId, TicketNumber: ticketNumber },
            })
        );
        return result.Item || null;
    } catch (error) {
        console.error(`[getTicketByNumber] Error:`, error);
        return null;
    }
}

// ===== Helper: Update Ticket Status =====

async function updateTicketStatus(
    queueId: string,
    ticketNumber: number,
    status: TicketStatus,
    timestamp: string
): Promise<void> {
    const updateExpr =
        status === "CALLING"
            ? "SET #s = :status, CalledAt = :ts"
            : status === "DONE"
            ? "SET #s = :status, CompletedAt = :ts"
            : status === "MISSED"
            ? "SET #s = :status, MissedAt = :ts"
            : "SET #s = :status";

    await ddb.send(
        new UpdateCommand({
            TableName: TICKETS_TABLE,
            Key: { QueueId: queueId, TicketNumber: ticketNumber },
            UpdateExpression: updateExpr,
            ExpressionAttributeNames: { "#s": "Status" },
            ExpressionAttributeValues: {
                ":status": status,
                ...(updateExpr.includes(":ts") ? { ":ts": timestamp } : {}),
            },
        })
    );
}

// ===== Helper: Build Response =====

async function buildTicketResponse(
    ticket: any,
    queueId: string
): Promise<TicketResponse> {
    const ticketNumber: number = ticket.TicketNumber;
    const queueType: QueueType = ticket.QueueType;
    const visitDate: string = ticket.VisitDate;
    const ticketCode: string = ticket.TicketCode;

    // Lấy thông tin queue
    const queueRes = await ddb.send(
        new GetCommand({
            TableName: QUEUES_TABLE,
            Key: { QueueId: queueId },
        })
    );

    if (!queueRes.Item) throw new Error("QUEUE_NOT_FOUND");

    const queue = queueRes.Item;
    const currentNumber: number = queue.CurrentNumber || 0;
    const lastIssued: number = queue.LastIssuedNumber || 0;
    const avgServiceTime: number =
        queue.AvgServiceTimeMinutes || DEFAULT_AVG_SERVICE_TIME_MINUTES;

    // Tính trạng thái logic dựa trên CurrentNumber
    let logicalStatus: TicketStatus = ticket.Status;

    if (ticket.Status === "WAITING" || ticket.Status === "CALLING") {
        if (currentNumber === ticketNumber) {
            logicalStatus = "CALLING";
        } else if (currentNumber > ticketNumber) {
            // Đã qua số này rồi mà vẫn WAITING/CALLING → MISSED
            logicalStatus = "MISSED";
        } else {
            logicalStatus = "WAITING";
        }
    }

    if (logicalStatus !== ticket.Status) {
        await ddb.send(
            new UpdateCommand({
                TableName: TICKETS_TABLE,
                Key: { QueueId: queueId, TicketNumber: ticketNumber },
                UpdateExpression: "SET #s = :status",
                ExpressionAttributeNames: { "#s": "Status" },
                ExpressionAttributeValues: { ":status": logicalStatus },
            })
        );
    }

    // ĐẾM SỐ VÉ WAITING THỰC TẾ giữa currentNumber và ticketNumber
    let waitingBefore = 0;
    let estimatedWaitMinutes = 0;

    if (logicalStatus === "WAITING") {
        // Query tất cả tickets từ (currentNumber+1) đến (ticketNumber-1)
        const start = currentNumber + 1;
        const end = ticketNumber - 1;

        let betweenTicketsItems: any[] = [];

        if (start <= end) {
            const betweenTickets = await ddb.send(
                new QueryCommand({
                    TableName: TICKETS_TABLE,
                    KeyConditionExpression:
                        "QueueId = :qid AND TicketNumber BETWEEN :start AND :end",
                    ExpressionAttributeValues: {
                        ":qid": queueId,
                        ":start": start,
                        ":end": end,
                    },
                })
            );

            betweenTicketsItems = betweenTickets.Items ?? [];
        }

        // Chỉ đếm WAITING
        waitingBefore = betweenTicketsItems.filter(
            (t) => t.Status === "WAITING"
        ).length;
        estimatedWaitMinutes = (waitingBefore + 1) * avgServiceTime;

        // ESTIMATE TIME = (số người đang chờ + 1 người hiện tại) × avg time
        estimatedWaitMinutes = (waitingBefore + 1) * avgServiceTime;

        console.log(
            `[buildTicketResponse] Ticket ${ticketNumber}: waitingBefore=${waitingBefore}, estimate=${estimatedWaitMinutes}min`
        );
    } else if (logicalStatus === "CALLING") {
        // Đang gọi → 0 người chờ, estimate = 0
        waitingBefore = 0;
        estimatedWaitMinutes = 0;
    }

    return {
        ticketCode,
        ticketNumber,
        queueType,
        visitDate,
        ticketStatus: logicalStatus,
        currentNumber,
        waitingBefore,
        estimatedWaitMinutes,
        issuedAt: ticket.IssuedAt,
        calledAt: ticket.CalledAt,
        patientInfo: {
            fullName: ticket.PatientName,
            phoneNumber: ticket.PatientPhone,
            nationalId: ticket.NationalId,
        },
    };
}
// ===== Helper: Log Audit =====

interface AuditLogEntry {
    action: string;
    userId: string;
    queueId: string;
    ticketNumber?: number;
    details?: any;
}

async function logAudit(entry: AuditLogEntry): Promise<void> {
    try {
        const timestamp = new Date().toISOString();
        const logEntry = {
            AuditId: `${timestamp}#${entry.userId}#${entry.action}`,
            Timestamp: timestamp,
            Action: entry.action,
            UserId: entry.userId,
            QueueId: entry.queueId,
            TicketNumber: entry.ticketNumber,
            Details: entry.details,
        };

        console.log(`[AUDIT] ${entry.action}:`, JSON.stringify(logEntry));

        // // Optionally persist to DynamoDB audit table if configured
        // const AUDIT_TABLE = process.env.AUDIT_TABLE;
        // if (AUDIT_TABLE) {
        //     await ddb.send(
        //         new PutCommand({
        //             TableName: AUDIT_TABLE,
        //             Item: logEntry,
        //         })
        //     );
        // }
    } catch (error) {
        console.error("[AUDIT] Failed to log audit entry:", error);
    }
}
