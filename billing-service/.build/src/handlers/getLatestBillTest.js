"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const response_1 = require("../utils/response");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const TABLE = process.env.BILLS_TABLE;
// Handler test - không cần authentication, luôn dùng userId = U001
// Endpoint: GET /billing/test/latest
const handler = async (event) => {
    console.log("Test endpoint called:", JSON.stringify(event));
    try {
        const userId = "04782488-f0a1-704c-2e53-d814ba71593b"; // Hardcoded cho test
        console.log("Testing with userId:", userId);
        // Query DynamoDB để lấy tất cả bills của user U001
        const command = new lib_dynamodb_1.QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": userId,
            },
            ScanIndexForward: false, // Sort descending by visitId
        });
        const result = await docClient.send(command);
        if (!result.Items || result.Items.length === 0) {
            return (0, response_1.formatResponse)(404, {
                message: "Không tìm thấy dữ liệu viện phí cho user U001.",
                userId: userId,
            });
        }
        // Lấy bill mới nhất (đã sort descending)
        const bill = result.Items[0];
        return (0, response_1.formatResponse)(200, {
            message: "Test endpoint - userId hardcoded to U001",
            userId: bill.userId,
            visitId: bill.visitId,
            visitDate: bill.visitDate,
            hospitalId: bill.hospitalId,
            hospitalName: bill.hospitalName,
            hospitalAddress: bill.hospitalAddress,
            doctorName: bill.doctorName,
            department: bill.department,
            diagnosis: bill.diagnosis,
            services: bill.services,
            totalBasePrice: bill.totalBasePrice,
            totalInsuranceCovered: bill.totalInsuranceCovered,
            totalPatientPay: bill.totalPatientPay,
            insuranceType: bill.insuranceType,
            insuranceNumber: bill.insuranceNumber,
            paymentStatus: bill.paymentStatus,
            paymentMethod: bill.paymentMethod,
            paymentDate: bill.paymentDate,
            note: bill.note,
        });
    }
    catch (err) {
        console.error("Error in test endpoint:", err);
        return (0, response_1.formatResponse)(500, {
            message: "Internal server error",
            error: err.message,
            stack: err.stack,
        });
    }
};
exports.handler = handler;
