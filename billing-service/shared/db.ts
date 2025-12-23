// src/models/base.model.ts
import { dbDocClient } from "./dbConnection";
import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  PutCommandInput,
  GetCommandInput,
  DeleteCommandInput,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

export async function dbQuery<T>(
  tableName: string,
  keyName: string,
  keyValue: string,
  options: Partial<Omit<QueryCommandInput, "TableName" | "KeyConditionExpression" | "ExpressionAttributeValues">> = {}
): Promise<T[]> {
  const params: QueryCommandInput = {
    TableName: tableName,
    KeyConditionExpression: `${keyName} = :v`,
    ExpressionAttributeValues: { ":v": keyValue },
    ...options, // allows adding FilterExpression, ProjectionExpression, etc.
  };

  const result = await dbDocClient.send(new QueryCommand(params));
  return (result.Items as T[]) || [];
}

export async function dbPut<T extends Record<string, any>>(
  tableName: string,
  item: T
): Promise<void> {
  const params: PutCommandInput = {
    TableName: tableName,
    Item: item,
  };
  await dbDocClient.send(new PutCommand(params));
}

export async function dbGet<T>(tableName: string, key: Record<string, any>): Promise<T | null> {
  const params: GetCommandInput = {
    TableName: tableName,
    Key: key,
  };
  const result = await dbDocClient.send(new GetCommand(params));
  return (result.Item as T) || null;
}

export async function dbDelete(tableName: string, key: Record<string, any>): Promise<void> {
  const params: DeleteCommandInput = {
    TableName: tableName,
    Key: key,
  };
  await dbDocClient.send(new DeleteCommand(params));
}

// export async function dbQuery<T>(
//   tableName: string,
//   query: Omit<QueryCommandInput, "TableName">
// ): Promise<T[]> {
//   const params: QueryCommandInput = {
//     TableName: tableName,
//     ...query,
//   };
//   const result = await dbDocClient.send(new QueryCommand(params));
//   return (result.Items as T[]) || [];
// }
