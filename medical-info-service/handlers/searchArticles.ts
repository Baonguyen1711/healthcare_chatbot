import { APIGatewayProxyHandler } from "aws-lambda";
import { ArticleService } from "../services/articleService";
import { CacheService } from "../services/cacheService";
import { SearchQuery } from "../models/article.model";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";

const articleService = new ArticleService();
const cacheService = new CacheService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};

    const keyword = queryParams.keyword;
    if (!keyword || keyword.trim().length === 0) {
      return formatErrorResponse(400, "Keyword is required");
    }

    const searchQuery: SearchQuery = {
      keyword,
      category: queryParams.category
        ? parseInt(queryParams.category)
        : undefined,
      source: queryParams.source as any,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20,
    };

    // Check cache
    const cacheKey = cacheService.generateKey("search", searchQuery);
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return formatSuccessResponse({
        keyword,
        total: cached.length,
        data: cached,
        fromCache: true,
      });
    }

    // Search database
    const results = await articleService.search(searchQuery);

    console.log(results);

    // Cache results
    await cacheService.set(cacheKey, results, 3600); // 1 hour

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
