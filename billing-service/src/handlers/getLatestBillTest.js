const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE = process.env.BILLS_TABLE;

// Handler test - không cần authentication, luôn dùng userId = U001
// Endpoint: GET /billing/test/latest
module.exports.handler = async (event) => {
    console.log("Test endpoint called:", JSON.stringify(event));

    try {
        const userId = "U001"; // Hardcoded cho test
        console.log("Testing with userId:", userId);

        // Query DynamoDB để lấy tất cả bills của user U001
        const command = new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": userId,
            },
            ScanIndexForward: false, // Sort descending by visitId
        });

        const result = await docClient.send(command);

        if (!result.Items || result.Items.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization",
                },
                body: JSON.stringify({
                    message: "Không tìm thấy dữ liệu viện phí cho user U001.",
                    userId: userId,
                }),
            };
        }

        // Lấy bill mới nhất (đã sort descending)
        const bill = result.Items[0];

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
            },
            body: JSON.stringify({
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
            }),
        };
    } catch (err) {
        console.error("Error in test endpoint:", err);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
            },
            body: JSON.stringify({
                message: "Internal server error",
                error: err.message,
                stack: err.stack,
            }),
        };
    }
};
