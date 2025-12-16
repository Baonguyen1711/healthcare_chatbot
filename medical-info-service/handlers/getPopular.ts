// handlers/getPopular.ts
import { APIGatewayProxyHandler } from "aws-lambda";
import { ArticleService } from "../services/articleService";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";

const articleService = new ArticleService();

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("⭐ Get popular articles request received");

  try {
    const queryParams = event.queryStringParameters || {};
    const limit = queryParams.limit ? parseInt(queryParams.limit) : 10;

    if (limit < 1 || limit > 100) {
      return formatErrorResponse(400, "Limit must be between 1 and 100");
    }

    console.log(`Fetching top ${limit} popular articles`);

    const articles = await articleService.getPopular(limit);

    console.log(`✅ Found ${articles.length} popular articles`);

    return formatSuccessResponse({
      articles,
      total: articles.length,
      limit,
    });
  } catch (error) {
    console.error("❌ Get popular error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};
