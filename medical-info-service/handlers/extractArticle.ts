import { APIGatewayProxyHandler } from "aws-lambda";
import { ArticleService } from "../services/articleService";
import { AIService } from "../services/aiService";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";
import { determineCategory, validateSourceUrl } from "../utils/categoryHelper";

const articleService = new ArticleService();
const aiService = new AIService();

interface ExtractRequest {
  url: string;
  source: "WHO" | "CDC" | "MOH_VN";
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body: ExtractRequest = JSON.parse(event.body || "{}");

    if (!body.url || !body.source) {
      return formatErrorResponse(400, "URL and source are required");
    }

    const urlValidation = validateSourceUrl(body.url, body.source);
    if (!urlValidation.valid) {
      return formatErrorResponse(400, urlValidation.message);
    }

    // Extract article content using AI
    const extractedData = await aiService.extractArticle(body.url);
    if (!extractedData) {
      return formatErrorResponse(500, "Failed to extract article data");
    }

    // Determine category
    const category = determineCategory(
      extractedData.title + " " + extractedData.content
    );

    // Generate keywords
    const keywords = await aiService.generateKeywords(
      extractedData.title,
      extractedData.content
    );

    // Save to database
    const article = await articleService.create({
      title: extractedData.title,
      content: extractedData.content,
      source: body.source,
      category,
      url: body.url,
      keywords,
    });

    return formatSuccessResponse({
      message: "Article extracted and saved successfully",
      data: article,
    });
  } catch (error) {
    console.error("Extract article error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};
