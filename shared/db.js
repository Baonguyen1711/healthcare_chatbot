"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbQuery = dbQuery;
exports.dbPut = dbPut;
exports.dbGet = dbGet;
exports.dbDelete = dbDelete;
// src/models/base.model.ts
const dbConnection_1 = require("./dbConnection");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
async function dbQuery(tableName, keyName, keyValue, options = {}) {
    const params = {
        TableName: tableName,
        KeyConditionExpression: `${keyName} = :v`,
        ExpressionAttributeValues: { ":v": keyValue },
        ...options, // allows adding FilterExpression, ProjectionExpression, etc.
    };
    const result = await dbConnection_1.dbDocClient.send(new lib_dynamodb_1.QueryCommand(params));
    return result.Items || [];
}
async function dbPut(tableName, item) {
    const params = {
        TableName: tableName,
        Item: item,
    };
    await dbConnection_1.dbDocClient.send(new lib_dynamodb_1.PutCommand(params));
}
async function dbGet(tableName, key) {
    const params = {
        TableName: tableName,
        Key: key,
    };
    const result = await dbConnection_1.dbDocClient.send(new lib_dynamodb_1.GetCommand(params));
    return result.Item || null;
}
async function dbDelete(tableName, key) {
    const params = {
        TableName: tableName,
        Key: key,
    };
    await dbConnection_1.dbDocClient.send(new lib_dynamodb_1.DeleteCommand(params));
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
