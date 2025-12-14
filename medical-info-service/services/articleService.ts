import { DynamoDB } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import { Article, SearchQuery } from "../models/article.model";

const dynamo = new DynamoDB.DocumentClient();
const TABLE = process.env.DYNAMODB_TABLE!;

export class ArticleService {
  async getById(id: string): Promise<Article | null> {
    const result = await dynamo
      .get({
        TableName: TABLE,
        Key: { id },
      })
      .promise();

    if (!result.Item) return null;

    // Increment views
    await this.incrementViews(id);

    return result.Item as Article;
  }

  async create(
    article: Omit<Article, "id" | "views" | "createdAt">
  ): Promise<Article> {
    const newArticle: Article = {
      ...article,
      id: uuidv4(),
      views: 0,
      createdAt: new Date().toISOString(),
    };

    await dynamo
      .put({
        TableName: TABLE,
        Item: newArticle,
      })
      .promise();

    return newArticle;
  }

  async search(query: SearchQuery): Promise<Article[]> {
    const params: any = {
      TableName: TABLE,
      Limit: query.limit || 20,
    };

    const filterExpressions: string[] = [];
    const expressionValues: any = {};

    if (query.keyword) {
      filterExpressions.push(
        "(contains(title, :keyword) OR contains(content, :keyword) OR contains(keywords, :keyword))"
      );
      expressionValues[":keyword"] = query.keyword;
    }

    if (query.category) {
      filterExpressions.push("category = :category");
      expressionValues[":category"] = query.category;
    }

    if (query.source) {
      filterExpressions.push("source = :source");
      expressionValues[":source"] = query.source;
    }

    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(" AND ");
      params.ExpressionAttributeValues = expressionValues;
    }

    const result = await dynamo.scan(params).promise();
    return result.Items as Article[];
  }

  async getByCategory(
    category: number,
    limit: number = 20
  ): Promise<Article[]> {
    const params = {
      TableName: TABLE,
      IndexName: "CategoryIndex",
      KeyConditionExpression: "category = :cat",
      ExpressionAttributeValues: { ":cat": category },
      Limit: limit,
    };

    const result = await dynamo.query(params).promise();
    return result.Items as Article[];
  }

  async incrementViews(id: string): Promise<void> {
    await dynamo
      .update({
        TableName: TABLE,
        Key: { id },
        UpdateExpression: "ADD views :inc",
        ExpressionAttributeValues: { ":inc": 1 },
      })
      .promise();
  }

  async getPopular(limit: number = 10): Promise<Article[]> {
    const result = await dynamo
      .scan({
        TableName: TABLE,
        ProjectionExpression: "id, title, views, category, #src, createdAt",
        ExpressionAttributeNames: { "#src": "source" },
      })
      .promise();

    const sorted = (result.Items as Article[]).sort(
      (a, b) => b.views - a.views
    );
    return sorted.slice(0, limit);
  }
}
