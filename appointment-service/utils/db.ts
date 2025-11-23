import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";
// Load biến môi trường
dotenv.config();


const client = new DynamoDBClient({
  region: process.env.MY_AWS_REGION, // bắt buộc
});

export const ddbDocClient = DynamoDBDocumentClient.from(client);
export const TABLE_NAME = process.env.APPOINTMENT_TABLE!;
