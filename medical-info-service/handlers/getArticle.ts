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
    const id = event.pathParameters?.id;

    if (!id) {
      return formatErrorResponse(400, "Article ID is required");
    }

    const cacheKey = `article:${id}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return formatSuccessResponse({
        data: cached,
        fromCache: true,
      });
    }

    const article = await articleService.getById(id);

    if (!article) {
      return formatErrorResponse(404, "Article not found");
    }

    await cacheService.set(cacheKey, article, 86400); // 24 hours

    return formatSuccessResponse({
      data: article,
      fromCache: false,
    });
  } catch (error) {
    console.error("Get article error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};
