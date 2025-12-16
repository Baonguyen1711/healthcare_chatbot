// handlers/chat.ts - IMPROVED VERSION
import { APIGatewayProxyHandler } from "aws-lambda";
import { AIService } from "../services/aiService";
import { ArticleService } from "../services/articleService";
import { ChatRequest } from "../models/chat.model";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";

const aiService = new AIService();
const articleService = new ArticleService();

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("💬 Chat request received");

  try {
    // Parse and validate request
    const body: ChatRequest = JSON.parse(event.body || "{}");

    if (!body.message || body.message.trim().length === 0) {
      return formatErrorResponse(400, "Message is required");
    }

    if (body.message.length > 1000) {
      return formatErrorResponse(400, "Message too long (max 1000 characters)");
    }

    console.log(`📝 User message: ${body.message.substring(0, 100)}...`);

    // Bước 1: Extract keywords và analyze intent
    console.log("🔍 Step 1: Extracting keywords and intent...");
    const analysis = await aiService.extractKeywordsFromQuery(body.message);
    console.log(`   Keywords: ${analysis.keywords.join(", ")}`);
    console.log(`   Intent: ${analysis.intent}`);
    console.log(`   Language: ${analysis.language}`);

    // Bước 2: Tìm articles liên quan
    console.log("📚 Step 2: Searching relevant articles...");
    const relevantArticles = await articleService.searchRelevant(
      analysis.keywords,
      5
    );
    console.log(`   Found ${relevantArticles.length} relevant articles`);

    if (relevantArticles.length > 0) {
      relevantArticles.forEach((article, idx) => {
        console.log(`   ${idx + 1}. ${article.title} (${article.source})`);
      });
    }

    // Bước 3: Generate response với context và safety checks
    console.log("🤖 Step 3: Generating AI response...");
    const response = await aiService.chatWithContext(
      body.message,
      relevantArticles,
      body.history
    );

    console.log(`   Confidence: ${response.confidence}`);
    console.log(`   Sources: ${response.sources.length}`);

    // Generate conversation ID if not provided
    const conversationId = body.conversationId || generateConversationId();

    // Build response
    const responseData = {
      response: response.answer,
      sources: response.sources.map((source) => ({
        title: source.title,
        url: source.url,
        relevance: source.relevance,
        excerpt: source.excerpt,
      })),
      metadata: {
        hasRelevantInfo: response.sources.length > 0,
        confidence: response.confidence,
        disclaimer: response.disclaimer,
        keywords: analysis.keywords,
        intent: analysis.intent,
        language: analysis.language,
        articlesFound: relevantArticles.length,
      },
      conversationId,
      timestamp: new Date().toISOString(),
    };

    console.log("✅ Chat response generated successfully");

    return formatSuccessResponse(responseData);
  } catch (error: any) {
    console.error("❌ Chat error:", error);

    // Log detailed error for debugging
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Return user-friendly error
    return formatErrorResponse(
      500,
      "Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau."
    );
  }
};

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
