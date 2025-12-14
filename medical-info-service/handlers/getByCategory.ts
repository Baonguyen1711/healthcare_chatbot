import { APIGatewayProxyHandler } from "aws-lambda";
import { ArticleService } from "../services/articleService";
import { CacheService } from "../services/cacheService";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";

const articleService = new ArticleService();
const cacheService = new CacheService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const category = event.pathParameters?.category;
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit)
      : 20;

    if (!category) {
      return formatErrorResponse(400, "Category is required");
    }

    const categoryNum = parseInt(category);
    if (isNaN(categoryNum) || categoryNum < 1 || categoryNum > 4) {
      return formatErrorResponse(400, "Invalid category (must be 1-4)");
    }

    const cacheKey = `category:${categoryNum}:${limit}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return formatSuccessResponse({
        category: categoryNum,
        data: cached,
        total: cached.length,
        fromCache: true,
      });
    }

    const results = await articleService.getByCategory(categoryNum, limit);

    await cacheService.set(cacheKey, results, 3600); // 1 hour

    return formatSuccessResponse({
      category: categoryNum,
      data: results,
      total: results.length,
      fromCache: false,
    });
  } catch (error) {
    console.error("Get by category error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};
