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
    CheckinRequestOtpInput,
    QueueType,
    ReissueTicketInput,
    TicketStatusQueryInput,
    TicketStatusResponse,
    VerifyAndIssueTicketInput,
} from "../models/queueModels";

const IS_OFFLINE = process.env.IS_OFFLINE === "true";

const clientConfig: any = {
    region: process.env.AWS_REGION || "ap-southeast-1",
};

if (IS_OFFLINE) {
    console.log(
        "🚀 [OFFLINE MODE] Connecting to DynamoDB Local at http://localhost:8000"
    );

    clientConfig.endpoint = "http://localhost:8000"; // Bắt buộc trỏ vào cổng 8000
    clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "fake",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "fake",
    };
}

const client = new DynamoDBClient(clientConfig);

const ddb = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
});

const QUEUES_TABLE = process.env.QUEUES_TABLE || "Queues";
const TICKETS_TABLE = process.env.TICKETS_TABLE || "Tickets";
const PATIENTS_TABLE = process.env.PATIENTS_TABLE || "Patients";
const OTP_TABLE = process.env.OTP_TABLE || "OtpRequests";

function buildQueueId(visitDate: string, queueType: QueueType): string {
    return `DATE#${visitDate}#TYPE#${queueType}`;
}

function formatTicketCode(queueType: QueueType, ticketNumber: number): string {
    return `${queueType}-${ticketNumber.toString().padStart(3, "0")}`;
}

function parseTicketCode(ticketCode: string): {
    queueType: QueueType;
    ticketNumber: number;
} {
    const [prefix, num] = ticketCode.split("-");
    const queueType = prefix as QueueType;
    const ticketNumber = parseInt(num, 10);
    if (!["BHYT", "DV"].includes(queueType) || isNaN(ticketNumber)) {
        throw new Error("INVALID_TICKET_CODE");
    }
    return { queueType, ticketNumber };
}

function today(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestOtpForCheckin(
    input: CheckinRequestOtpInput
): Promise<{ phoneNumber: string; otpCode: string; expiredAt: string }> {
    const { phoneNumber } = input;
    const code = generateOtpCode();
    const now = new Date();
    const createdAt = now.toISOString();
    const expiredAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

    const ttl = Math.floor(now.getTime() / 1000) + 10 * 60;

    await ddb.send(
        new PutCommand({
            TableName: OTP_TABLE,
            Item: {
                PhoneNumber: phoneNumber,
                CreatedAt: createdAt,
                OtpCode: code,
                Purpose: "CHECKIN",
                IsVerified: false,
                ExpiredAt: expiredAt,
                Attempts: 0,
                Ttl: ttl,
            },
        })
    );

    return { phoneNumber, otpCode: code, expiredAt };
}

async function getCurrentOtp(phoneNumber: string): Promise<any | null> {
    const result = await ddb.send(
        new GetCommand({
            TableName: OTP_TABLE,
            Key: {
                PhoneNumber: phoneNumber,
            },
        })
    );

    return result.Item || null;
}

export async function verifyOtpAndIssueTicket(
    input: VerifyAndIssueTicketInput
): Promise<{
    ticketCode: string;
    ticketNumber: number;
    queueType: QueueType;
    visitDate: string;
}> {
    const { fullName, phoneNumber, nationalId, queueType, otpCode } = input;

    const visitDate = input.visitDate || today();
    const now = new Date();

    const otp = await getCurrentOtp(phoneNumber);
    if (!otp || otp.Purpose !== "CHECKIN") {
        throw new Error("OTP_NOT_FOUND");
    }

    if (otp.IsVerified) {
        throw new Error("OTP_ALREADY_USED");
    }

    if (new Date(otp.ExpiredAt) < now) {
        throw new Error("OTP_EXPIRED");
    }

    if (otp.OtpCode !== otpCode) {
        await ddb.send(
            new UpdateCommand({
                TableName: OTP_TABLE,
                Key: {
                    PhoneNumber: phoneNumber,
                },
                UpdateExpression:
                    "SET Attempts = if_not_exists(Attempts, :zero) + :one",
                ExpressionAttributeValues: {
                    ":zero": 0,
                    ":one": 1,
                },
            })
        );
        throw new Error("OTP_INVALID");
    }

    await ddb.send(
        new UpdateCommand({
            TableName: OTP_TABLE,
            Key: { PhoneNumber: phoneNumber },
            UpdateExpression: "SET IsVerified = :true, VerifiedAt = :vAt",
            ExpressionAttributeValues: {
                ":true": true,
                ":vAt": now.toISOString(),
            },
        })
    );

    await ddb.send(
        new PutCommand({
            TableName: PATIENTS_TABLE,
            Item: {
                PhoneNumber: phoneNumber,
                FullName: fullName,
                NationalId: nationalId,
                CreatedAt: now.toISOString(),
            },
        })
    );

    const queueId = buildQueueId(visitDate, queueType);

    const queueResult = await ddb.send(
        new GetCommand({
            TableName: QUEUES_TABLE,
            Key: { QueueId: queueId },
        })
    );

    let lastIssuedNumber = 0;

    if (!queueResult.Item) {
        await ddb.send(
            new PutCommand({
                TableName: QUEUES_TABLE,
                Item: {
                    QueueId: queueId,
                    VisitDate: visitDate,
                    QueueType: queueType,
                    Prefix: queueType,
                    CurrentNumber: 0,
                    LastIssuedNumber: 0,
                    IsActive: true,
                    CreatedAt: now.toISOString(),
                },
            })
        );
    } else {
        lastIssuedNumber = queueResult.Item.LastIssuedNumber || 0;
    }

    const ticketNumber = lastIssuedNumber + 1;
    const ticketCode = formatTicketCode(queueType, ticketNumber);

    await ddb.send(
        new PutCommand({
            TableName: TICKETS_TABLE,
            Item: {
                QueueId: queueId,
                TicketNumber: ticketNumber, // SK
                TicketCode: ticketCode,
                VisitDate: visitDate,
                QueueType: queueType,
                Status: "WAITING", // WAITING | CALLING | DONE | CANCELLED | NO_SHOW
                IssuedAt: now.toISOString(),
                PatientPhone: phoneNumber,
            },
        })
    );

    await ddb.send(
        new UpdateCommand({
            TableName: QUEUES_TABLE,
            Key: { QueueId: queueId },
            UpdateExpression: "SET LastIssuedNumber = :n",
            ExpressionAttributeValues: {
                ":n": ticketNumber,
            },
        })
    );

    return {
        ticketCode,
        ticketNumber,
        queueType,
        visitDate,
    };
}

// 3. Tra cứu trạng thái hàng chờ
export async function getTicketStatus(
    input: TicketStatusQueryInput
): Promise<TicketStatusResponse> {
    const { ticketCode } = input;
    const visitDate = input.visitDate || today();

    const { queueType, ticketNumber } = parseTicketCode(ticketCode);
    const queueId = buildQueueId(visitDate, queueType);

    // Lấy queue
    const queueResult = await ddb.send(
        new GetCommand({
            TableName: QUEUES_TABLE,
            Key: { QueueId: queueId },
        })
    );
    if (!queueResult.Item) {
        throw new Error("QUEUE_NOT_FOUND");
    }
    const queue = queueResult.Item;

    const currentNumber: number = queue.CurrentNumber || 0;

    // Lấy ticket
    const ticketResult = await ddb.send(
        new GetCommand({
            TableName: TICKETS_TABLE,
            Key: { QueueId: queueId, TicketNumber: ticketNumber },
        })
    );

    if (!ticketResult.Item) {
        throw new Error("TICKET_NOT_FOUND");
    }
    const ticket = ticketResult.Item;

    let logicalStatus: string = ticket.Status;

    if (ticket.Status === "WAITING") {
        if (currentNumber === ticketNumber) {
            logicalStatus = "CALLING";
        } else if (currentNumber > ticketNumber) {
            logicalStatus = "DONE";
        }
    }

    if (logicalStatus !== ticket.Status) {
        await ddb.send(
            new UpdateCommand({
                TableName: TICKETS_TABLE,
                Key: { QueueId: queueId, TicketNumber: ticketNumber },
                UpdateExpression: "SET #s = :status",
                ExpressionAttributeNames: { "#s": "Status" },
                ExpressionAttributeValues: {
                    ":status": logicalStatus,
                },
            })
        );
    }

    // Đếm số người trước bạn (WAITING + CALLING), ticketNumber < your ticketNumber
    const listResult = await ddb.send(
        new QueryCommand({
            TableName: TICKETS_TABLE,
            KeyConditionExpression: "QueueId = :qid AND TicketNumber < :tnum",
            ExpressionAttributeValues: {
                ":qid": queueId,
                ":tnum": ticketNumber,
                ":waiting": "WAITING",
                ":calling": "CALLING",
            },
            FilterExpression: "#s = :waiting OR #s = :calling",
            ExpressionAttributeNames: {
                "#s": "Status",
            },
        })
    );

    const waitingBefore = (listResult.Items || []).length;

    return {
        ticketCode,
        ticketNumber,
        queueType,
        visitDate,
        ticketStatus: logicalStatus,
        currentNumber,
        waitingBefore,
    };
}

export async function reissueTicket(input: ReissueTicketInput): Promise<{
    oldTicketCode: string;
    newTicketCode: string;
    visitDate: string;
    queueType: QueueType;
}> {
    const phoneNumber = input.phoneNumber;
    const visitDate = input.visitDate || today();
    const queueType = input.queueType as QueueType | undefined;

    const queryParams: any = {
        TableName: TICKETS_TABLE,
        IndexName: "PatientPhoneIndex",
        KeyConditionExpression: "PatientPhone = :p",
        ExpressionAttributeValues: {
            ":p": phoneNumber,
            ":waiting": "WAITING",
            ":visitDate": visitDate,
        },
        FilterExpression:
            "#status = :waiting AND VisitDate = :visitDate" +
            (queueType ? " AND QueueType = :qType" : ""),
        ExpressionAttributeNames: {
            "#status": "Status",
        },
        ScanIndexForward: false,
        Limit: 1,
    };

    if (queueType) {
        queryParams.ExpressionAttributeValues[":qType"] = queueType;
    }

    const ticketList = await ddb.send(new QueryCommand(queryParams));

    if (!ticketList.Items || ticketList.Items.length === 0) {
        throw new Error("NO_WAITING_TICKET_FOR_PHONE");
    }

    const oldTicket = ticketList.Items[0];
    const oldTicketCode: string = oldTicket.TicketCode;
    const oldTicketNumber: number = oldTicket.TicketNumber;
    const effectiveQueueType: QueueType = oldTicket.QueueType;
    const queueId: string = oldTicket.QueueId;

    // 4.2. Huỷ số cũ
    await ddb.send(
        new UpdateCommand({
            TableName: TICKETS_TABLE,
            Key: { QueueId: queueId, TicketNumber: oldTicketNumber },
            UpdateExpression:
                "SET #s = :cancelled, Notes = :note, CancelledAt = :ts",
            ExpressionAttributeNames: {
                "#s": "Status",
            },
            ExpressionAttributeValues: {
                ":cancelled": "CANCELLED",
                ":note": "Reissued by chatbot",
                ":ts": new Date().toISOString(),
            },
        })
    );

    // 4.3. Lấy queue & cấp số mới
    const queueResult = await ddb.send(
        new GetCommand({
            TableName: QUEUES_TABLE,
            Key: { QueueId: queueId },
        })
    );

    if (!queueResult.Item) {
        throw new Error("QUEUE_NOT_FOUND");
    }

    const lastIssued = queueResult.Item.LastIssuedNumber || 0;
    const newTicketNumber = lastIssued + 1;
    const newTicketCode = formatTicketCode(effectiveQueueType, newTicketNumber);
    const now = new Date().toISOString();

    await ddb.send(
        new PutCommand({
            TableName: TICKETS_TABLE,
            Item: {
                QueueId: queueId,
                TicketNumber: newTicketNumber,
                TicketCode: newTicketCode,
                VisitDate: visitDate,
                QueueType: effectiveQueueType,
                Status: "WAITING",
                IssuedAt: now,
                PatientPhone: phoneNumber,
                ReissuedFromTicketCode: oldTicketCode,
            },
        })
    );

    await ddb.send(
        new UpdateCommand({
            TableName: QUEUES_TABLE,
            Key: { QueueId: queueId },
            UpdateExpression: "SET LastIssuedNumber = :n",
            ExpressionAttributeValues: {
                ":n": newTicketNumber,
            },
        })
    );

    return {
        oldTicketCode,
        newTicketCode,
        visitDate,
        queueType: effectiveQueueType,
    };
}

export async function adminAdvanceQueue(
    input: AdminAdvanceQueueInput
): Promise<{ queueId: string; currentNumber: number }> {
    const { queueType } = input;
    const visitDate = input.visitDate || today();
    const step = input.step ?? 1;

    const queueId = buildQueueId(visitDate, queueType);

    const updateRes = await ddb.send(
        new UpdateCommand({
            TableName: QUEUES_TABLE,
            Key: { QueueId: queueId },
            UpdateExpression:
                "SET CurrentNumber = if_not_exists(CurrentNumber, :zero) + :step",
            ExpressionAttributeValues: {
                ":zero": 0,
                ":step": step,
            },
            ReturnValues: "ALL_OLD",
        })
    );

    const oldCurrent: number = updateRes.Attributes?.CurrentNumber || 0;
    const lastIssued: number = updateRes.Attributes?.LastIssuedNumber || 0;
    const newCurrent = oldCurrent + step;

    if (oldCurrent > 0 && oldCurrent <= lastIssued) {
        await ddb.send(
            new UpdateCommand({
                TableName: TICKETS_TABLE,
                Key: { QueueId: queueId, TicketNumber: oldCurrent },
                UpdateExpression: "SET #s = :done",
                ExpressionAttributeNames: { "#s": "Status" },
                ExpressionAttributeValues: { ":done": "DONE" },
            })
        );
    }

    if (newCurrent > 0 && newCurrent <= lastIssued) {
        await ddb.send(
            new UpdateCommand({
                TableName: TICKETS_TABLE,
                Key: { QueueId: queueId, TicketNumber: newCurrent },
                UpdateExpression: "SET #s = :calling",
                ExpressionAttributeNames: { "#s": "Status" },
                ExpressionAttributeValues: { ":calling": "CALLING" },
            })
        );
    }

    return {
        queueId,
        currentNumber: newCurrent,
    };
}
