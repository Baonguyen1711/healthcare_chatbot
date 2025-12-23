import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { withAuth } from "../utils/authRequire";
import { formatResponse } from "../utils/response";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE = process.env.BILLS_TABLE;

// Handler chính logic - nhận userId đã verify từ withAuth
const getLatestBill = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
    console.log("Event:", JSON.stringify(event));
    console.log("Authorized UserId:", userId);

    try {
        const command = new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": userId,
            },
            ScanIndexForward: false, // Sort descending by visitId (lấy mới nhất)
            Limit: 1,
        });

        console.log("Querying DynamoDB...");
        const result = await docClient.send(command).catch(dbErr => {
            console.error("DynamoDB Query Error:", dbErr);
            throw new Error(`Database error: ${dbErr.message}`);
        });

        if (!result.Items || result.Items.length === 0) {
            console.log("No bills found for user:", userId);
            return formatResponse(404, {
                message: "Không tìm thấy dữ liệu viện phí cho user này.",
                requestedUserId: userId,
            });
        }

        const bill = result.Items[0];
        console.log("Found bill:", bill.visitId);

        return formatResponse(200, {
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

    } catch (err: any) {
        console.error("Error getLatestBill:", err);
        return formatResponse(500, {
            message: "Internal server error",
            error: err.message,
            stack: err.stack
        });
    }
};

// Export handler đã được wrap bởi withAuth
export const handler = withAuth(getLatestBill);
