import { DynamoDB } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import {
  MedicalInfo,
  MedicalCategory,
  SearchQuery,
} from "../models/medicalInfo.model";

const dynamo = new DynamoDB.DocumentClient();
const TABLE = process.env.DYNAMODB_TABLE!;

export class MedicalInfoService {
  // ============================
  // GET ITEM BY ID
  // ============================
  async getById(id: string): Promise<MedicalInfo | null> {
    const params = {
      TableName: TABLE,
      Key: { id },
    };

    const result = await dynamo.get(params).promise();

    if (!result.Item) return null;

    // Increment view count (non-blocking)
    this.incrementViews(id);

    return result.Item as MedicalInfo;
  }

  // ============================
  // SEARCH ARTICLES
  // ============================
  async search(query: SearchQuery): Promise<MedicalInfo[]> {
    const params: any = {
      TableName: TABLE,
      Limit: query.limit ?? 20,
    };

    let isQuery = false;
    let filterExp: string[] = [];
    let expValues: any = {};
    let expNames: any = {};

    // Search by category (use GSI)
    if (query.category) {
      params.IndexName = "CategoryIndex";
      params.KeyConditionExpression = "category = :category";
      params.ExpressionAttributeValues = {
        ":category": query.category,
      };
      isQuery = true;
    }

    // Keyword search
    if (query.keyword) {
      filterExp.push(
        "(contains(title, :kw) OR contains(content, :kw) OR contains(tags, :kw))"
      );
      expValues[":kw"] = query.keyword;
    }

    if (query.source) {
      filterExp.push("source = :source");
      expValues[":source"] = query.source;
    }

    if (query.language) {
      filterExp.push("language = :lang");
      expValues[":lang"] = query.language;
    }

    if (filterExp.length > 0) {
      params.FilterExpression = filterExp.join(" AND ");
      params.ExpressionAttributeValues = {
        ...(params.ExpressionAttributeValues || {}),
        ...expValues,
      };
    }

    const result = isQuery
      ? await dynamo.query(params).promise()
      : await dynamo.scan(params).promise();

    return result.Items as MedicalInfo[];
  }

  // ============================
  // GET BY CATEGORY
  // ============================
  async getByCategory(
    category: MedicalCategory,
    limit: number = 20
  ): Promise<MedicalInfo[]> {
    const params = {
      TableName: TABLE,
      IndexName: "CategoryIndex",
      KeyConditionExpression: "category = :cat",
      ExpressionAttributeValues: { ":cat": category },
      Limit: limit,
      ScanIndexForward: false, // newest first
    };

    const result = await dynamo.query(params).promise();
    return result.Items as MedicalInfo[];
  }

  // ============================
  // CREATE NEW ARTICLE
  // ============================
  async create(
    info: Omit<MedicalInfo, "id" | "views" | "lastUpdated">
  ): Promise<MedicalInfo> {
    const item: MedicalInfo = {
      ...info,
      id: uuidv4(),
      views: 0,
      lastUpdated: new Date().toISOString(),
    };

    await dynamo
      .put({
        TableName: TABLE,
        Item: item,
      })
      .promise();

    return item;
  }

  // ============================
  // UPDATE ARTICLE
  // ============================
  async update(
    id: string,
    updates: Partial<MedicalInfo>
  ): Promise<MedicalInfo> {
    const updateExp: string[] = [];
    const names: any = {};
    const values: any = {};

    Object.entries(updates).forEach(([key, value], index) => {
      updateExp.push(`#f${index} = :v${index}`);
      names[`#f${index}`] = key;
      values[`:v${index}`] = value;
    });

    // always update lastUpdated
    updateExp.push(`#updated = :updated`);
    names["#updated"] = "lastUpdated";
    values[":updated"] = new Date().toISOString();

    const params = {
      TableName: TABLE,
      Key: { id },
      UpdateExpression: `SET ${updateExp.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamo.update(params).promise();
    return result.Attributes as MedicalInfo;
  }

  // ============================
  // INCREMENT VIEWS
  // ============================
  async incrementViews(id: string): Promise<void> {
    await dynamo
      .update({
        TableName: TABLE,
        Key: { id },
        UpdateExpression: "ADD views :inc",
        ExpressionAttributeValues: {
          ":inc": 1,
        },
      })
      .promise();
  }

  // ============================
  // POPULAR TOPICS BY VIEW COUNT
  // ============================
  async getPopularTopics(limit: number = 10): Promise<MedicalInfo[]> {
    const result = await dynamo
      .scan({
        TableName: TABLE,
        ProjectionExpression:
          "id, title, views, category, summary, publishedDate",
      })
      .promise();

    const sorted = (result.Items as MedicalInfo[]).sort(
      (a, b) => b.views - a.views
    );

    return sorted.slice(0, limit);
  }
}
