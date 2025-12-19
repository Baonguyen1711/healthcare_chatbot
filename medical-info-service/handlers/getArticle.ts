import { APIGatewayProxyHandler } from "aws-lambda";
import { ArticleService } from "../services/articleService";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";

const articleService = new ArticleService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return formatErrorResponse(400, "Article ID is required");
    }

    const article = await articleService.getById(id);

    if (!article) {
      return formatErrorResponse(404, "Article not found");
    }

    return formatSuccessResponse({
      article,
    });
  } catch (error) {
    console.error("Get article error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};
