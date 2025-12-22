import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { formatResponse } from "../utils/response";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE = process.env.BILLS_TABLE;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log("Event:", JSON.stringify(event));

    try {
        const { userId, visitId } = event.pathParameters || {};

        if (!userId || !visitId) {
            return formatResponse(400, { message: "Missing userId or visitId" });
        }

        const command = new GetCommand({
            TableName: TABLE,
            Key: { userId, visitId },
        });

        const result = await docClient.send(command);

        if (!result.Item) {
            return formatResponse(404, {
                message: "Không tìm thấy hóa đơn viện phí cho lần khám này.",
            });
        }

        return formatResponse(200, result.Item);
    } catch (err: any) {
        console.error("Error getBillByVisit:", err);
        return formatResponse(500, {
            message: "Internal server error",
            error: err.message,
        });
    }
};
