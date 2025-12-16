// handlers/saveArticle.ts - NEW HANDLER
import { APIGatewayProxyHandler } from "aws-lambda";
import { ArticleService } from "../services/articleService";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";

const articleService = new ArticleService();

/**
 * Handler để save article đã extract vào database
 * Tách riêng khỏi extractArticle để user có thể review trước khi save
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("💾 Save article request received");

  try {
    const body = JSON.parse(event.body || "{}");

    // Validate required fields
    const requiredFields = [
      "title",
      "content",
      "source",
      "category",
      "url",
      "keywords",
    ];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return formatErrorResponse(
        400,
        `Missing required fields: ${missingFields.join(", ")}`
      );
    }

    // Validate source
    const validSources = ["WHO", "CDC", "MOH_VN"];
    if (!validSources.includes(body.source)) {
      return formatErrorResponse(
        400,
        `Invalid source. Must be one of: ${validSources.join(", ")}`
      );
    }

    // Validate category
    if (![1, 2, 3, 4].includes(body.category)) {
      return formatErrorResponse(
        400,
        "Invalid category. Must be 1, 2, 3, or 4"
      );
    }

    // Validate content length
    if (body.content.length < 200) {
      return formatErrorResponse(
        400,
        "Content too short (minimum 200 characters)"
      );
    }

    // Check if article with same URL already exists
    console.log(`🔍 Checking for existing article with URL: ${body.url}`);
    const existingArticles = await articleService.search({
      keyword: body.url,
      limit: 1,
    });

    if (existingArticles.length > 0) {
      console.log("⚠️ Article already exists in database");
      return formatErrorResponse(
        409,
        "Article with this URL already exists in database"
      );
    }

    // Save article
    console.log("💾 Saving article to database...");
    const savedArticle = await articleService.create({
      title: body.title,
      content: body.content,
      source: body.source,
      category: body.category,
      url: body.url,
      keywords: body.keywords,
    });

    console.log(`✅ Article saved with ID: ${savedArticle.id}`);

    return formatSuccessResponse({
      article: {
        id: savedArticle.id,
        title: savedArticle.title,
        source: savedArticle.source,
        category: savedArticle.category,
        url: savedArticle.url,
        keywords: savedArticle.keywords,
        createdAt: savedArticle.createdAt,
        views: savedArticle.views,
      },
      message: "Article saved successfully",
    });
  } catch (error: any) {
    console.error("❌ Save article error:", error);

    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    return formatErrorResponse(
      500,
      "Đã xảy ra lỗi khi lưu bài viết. Vui lòng thử lại sau."
    );
  }
};
