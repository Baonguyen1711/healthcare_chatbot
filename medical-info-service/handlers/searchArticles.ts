import { APIGatewayProxyHandler } from "aws-lambda";
import { ArticleService } from "../services/articleService";
import { SearchQuery } from "../models/article.model";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";

const articleService = new ArticleService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};

    // ===== Normalize keyword =====
    const rawKeyword = queryParams.keyword;
    const keyword = rawKeyword?.trim() || undefined;

    // ===== Normalize numbers =====
    const category = queryParams.category
      ? Number(queryParams.category)
      : undefined;

    const limit = queryParams.limit ? Number(queryParams.limit) : 20;

    const searchQuery: SearchQuery = {
      keyword,
      category: Number.isFinite(category) ? category : undefined,
      source: queryParams.source || undefined,
      limit: Number.isFinite(limit) ? limit : 20,
    };

    const results = await articleService.search(searchQuery);

    return formatSuccessResponse({
      keyword,
      total: results.length,
      data: results,
      fromCache: false,
    });
  } catch (error) {
    console.error("Search error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};
