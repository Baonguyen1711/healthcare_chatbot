"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const response_1 = require("../utils/response");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const TABLE = process.env.BILLS_TABLE;
const handler = async (event) => {
    console.log("Event:", JSON.stringify(event));
    try {
        const { userId, visitId } = event.pathParameters || {};
        if (!userId || !visitId) {
            return (0, response_1.formatResponse)(400, { message: "Missing userId or visitId" });
        }
        const command = new lib_dynamodb_1.GetCommand({
            TableName: TABLE,
            Key: { userId, visitId },
        });
        const result = await docClient.send(command);
        if (!result.Item) {
            return (0, response_1.formatResponse)(404, {
                message: "Không tìm thấy hóa đơn viện phí cho lần khám này.",
            });
        }
        return (0, response_1.formatResponse)(200, result.Item);
    }
    catch (err) {
        console.error("Error getBillByVisit:", err);
        return (0, response_1.formatResponse)(500, {
            message: "Internal server error",
            error: err.message,
        });
    }
};
exports.handler = handler;
