"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const authRequire_1 = require("../../../shared/authRequire");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const TABLE = process.env.BILLS_TABLE;
// Handler chính - nhận userId từ withAuth middleware
const getLatestBillHandler = async (event, userId) => {
    console.log("Event:", JSON.stringify(event));
    console.log("Authenticated userId:", userId);
    try {
        // Query tất cả lần khám của user, lấy lần mới nhất
        const command = new lib_dynamodb_1.QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: "userId = :u",
            ExpressionAttributeValues: {
                ":u": userId,
            },
            ScanIndexForward: false, // false = sort giảm dần theo sort key
            Limit: 1,
        });
        const result = await docClient.send(command);
        if (!result.Items || result.Items.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                },
                body: JSON.stringify({
                    message: "Không tìm thấy dữ liệu viện phí cho user này.",
                }),
            };
        }
        const bill = result.Items[0];
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({
                userId: bill.userId,
                visitId: bill.visitId,
                visitDate: bill.visitDate,
                hospitalName: bill.hospitalName,
                services: bill.services,
                totalBasePrice: bill.totalBasePrice,
                totalInsuranceCovered: bill.totalInsuranceCovered,
                totalPatientPay: bill.totalPatientPay,
                insuranceType: bill.insuranceType,
                note: bill.note,
            }),
        };
    }
    catch (err) {
        console.error("Error getLatestBill:", err);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({
                message: "Internal server error",
                error: err.message,
            }),
        };
    }
};
// Export handler với authentication middleware
exports.handler = (0, authRequire_1.withAuth)(getLatestBillHandler);
