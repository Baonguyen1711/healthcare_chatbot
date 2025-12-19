import { APIGatewayProxyHandler } from "aws-lambda";
import { ArticleService } from "../services/articleService";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";

const articleService = new ArticleService();

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("📋 List articles request received");

  try {
    const queryParams = event.queryStringParameters || {};

    const keyword = queryParams.keyword;
    const category = queryParams.category
      ? parseInt(queryParams.category)
      : undefined;
    const source = queryParams.source;
    const limit = queryParams.limit ? parseInt(queryParams.limit) : 20;

    // Validate parameters
    if (category && (isNaN(category) || category < 1 || category > 4)) {
      return formatErrorResponse(400, "Invalid category. Must be 1-4");
    }

    if (source && !["WHO", "CDC", "MOH_VN"].includes(source)) {
      return formatErrorResponse(
        400,
        "Invalid source. Must be WHO, CDC, or MOH_VN"
      );
    }

    if (limit < 1 || limit > 100) {
      return formatErrorResponse(400, "Limit must be between 1 and 100");
    }

    console.log("List params:", { keyword, category, source, limit });

    const articles = await articleService.search({
      keyword,
      category,
      source,
      limit,
    });

    console.log(`✅ Listed ${articles.length} articles`);

    return formatSuccessResponse({
      articles,
      total: articles.length,
      filters: {
        keyword,
        category,
        source,
        limit,
      },
    });
  } catch (error) {
    console.error("❌ List articles error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};
