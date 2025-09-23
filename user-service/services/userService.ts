import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient, TABLE_NAME } from "../utils/db";

export const addUserService = async (user: { userId: string; name: string; email: string }) => {
  return ddbDocClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...user,
        createdAt: new Date().toISOString(),
      },
      ConditionExpression: "attribute_not_exists(userId)", 
    })
  );
};

export const getUserService = async (userId: string) => {
  const result = await ddbDocClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId },
    })
  );
  return result.Item;
};
