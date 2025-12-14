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
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit)
      : 10;

    const cacheKey = `popular:${limit}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return formatSuccessResponse({
        data: cached,
        total: cached.length,
        fromCache: true,
      });
    }

    const results = await articleService.getPopular(limit);

    await cacheService.set(cacheKey, results, 7200); // 2 hours

    return formatSuccessResponse({
      data: results,
      total: results.length,
      fromCache: false,
    });
  } catch (error) {
    console.error("Get popular error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};
