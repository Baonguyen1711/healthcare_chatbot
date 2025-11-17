import { DynamoDB } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import {
  MedicalInfo,
  SearchQuery,
  MedicalCategory,
} from "../models/medicalInfo.model";

const dynamoDB = new DynamoDB.DocumentClient();
const tableName = process.env.DYNAMODB_TABLE!;

export class MedicalInfoService {
  async getById(id: string): Promise<MedicalInfo | null> {
    const params = {
      TableName: tableName,
      Key: { id },
    };

    const result = await dynamoDB.get(params).promise();

    if (result.Item) {
      // Increment view count
      await this.incrementViews(id);
    }

    return (result.Item as MedicalInfo) || null;
  }

  async search(query: SearchQuery): Promise<MedicalInfo[]> {
    let params: any = {
      TableName: tableName,
      Limit: query.limit || 20,
    };

    if (query.category) {
      params.IndexName = "CategoryIndex";
      params.KeyConditionExpression = "category = :category";
      params.ExpressionAttributeValues = {
        ":category": query.category,
      };
    }

    // Add filters
    const filterExpressions: string[] = [];
    const expressionValues: any = params.ExpressionAttributeValues || {};

    if (query.keyword) {
      filterExpressions.push(
        "(contains(title, :keyword) OR contains(content, :keyword) OR contains(tags, :keyword))"
      );
      expressionValues[":keyword"] = query.keyword;
    }

    if (query.source) {
      filterExpressions.push("source = :source");
      expressionValues[":source"] = query.source;
    }

    if (query.language) {
      filterExpressions.push("language = :language");
      expressionValues[":language"] = query.language;
    }

    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(" AND ");
      params.ExpressionAttributeValues = expressionValues;
    }

    const result = query.category
      ? await dynamoDB.query(params).promise()
      : await dynamoDB.scan(params).promise();

    return result.Items as MedicalInfo[];
  }

  async getByCategory(
    category: MedicalCategory,
    limit: number = 20
  ): Promise<MedicalInfo[]> {
    const params = {
      TableName: tableName,
      IndexName: "CategoryIndex",
      KeyConditionExpression: "category = :category",
      ExpressionAttributeValues: {
        ":category": category,
      },
      Limit: limit,
      ScanIndexForward: false, // Get newest first
    };

    const result = await dynamoDB.query(params).promise();
    return result.Items as MedicalInfo[];
  }

  async create(
    info: Omit<MedicalInfo, "id" | "views" | "lastUpdated">
  ): Promise<MedicalInfo> {
    const medicalInfo: MedicalInfo = {
      ...info,
      id: uuidv4(),
      views: 0,
      lastUpdated: new Date().toISOString(),
    };

    await dynamoDB
      .put({
        TableName: tableName,
        Item: medicalInfo,
      })
      .promise();

    return medicalInfo;
  }

  async update(
    id: string,
    updates: Partial<MedicalInfo>
  ): Promise<MedicalInfo> {
    const updateExpression: string[] = [];
    const expressionAttributeValues: any = {};
    const expressionAttributeNames: any = {};

    Object.keys(updates).forEach((key, index) => {
      updateExpression.push(`#attr${index} = :val${index}`);
      expressionAttributeNames[`#attr${index}`] = key;
      expressionAttributeValues[`:val${index}`] =
        updates[key as keyof MedicalInfo];
    });

    // Always update lastUpdated
    updateExpression.push(`#lastUpdated = :lastUpdated`);
    expressionAttributeNames["#lastUpdated"] = "lastUpdated";
    expressionAttributeValues[":lastUpdated"] = new Date().toISOString();

    const params = {
      TableName: tableName,
      Key: { id },
      UpdateExpression: `SET ${updateExpression.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamoDB.update(params).promise();
    return result.Attributes as MedicalInfo;
  }

  async incrementViews(id: string): Promise<void> {
    await dynamoDB
      .update({
        TableName: tableName,
        Key: { id },
        UpdateExpression: "ADD #views :increment",
        ExpressionAttributeNames: {
          "#views": "views",
        },
        ExpressionAttributeValues: {
          ":increment": 1,
        },
      })
      .promise();
  }

  async getPopularTopics(limit: number = 10): Promise<MedicalInfo[]> {
    const params = {
      TableName: tableName,
      Limit: 100, // Get more items to sort
    };

    const result = await dynamoDB.scan(params).promise();
    const items = result.Items as MedicalInfo[];

    // Sort by views and return top items
    return items.sort((a, b) => b.views - a.views).slice(0, limit);
  }
}
