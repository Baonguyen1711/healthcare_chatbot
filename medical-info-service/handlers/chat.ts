import { APIGatewayProxyHandler } from "aws-lambda";
import { ChatService } from "../services/chatService";
import { ChatRequest, ChatResponse } from "../models/chat.model";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";

const chatService = new ChatService();

/**
 * Generate conversation ID
 */
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * POST /chat
 * Medical Chat endpoint - Simple Q&A without DB storage
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("💬 Chat request received");

  try {
    // Parse request body
    const body: ChatRequest = JSON.parse(event.body || "{}");

    // Validate message
    if (!body.message || body.message.trim().length === 0) {
      return formatErrorResponse(400, "Message is required");
    }

    if (body.message.length > 1000) {
      return formatErrorResponse(400, "Message too long (max 1000 characters)");
    }

    console.log(`📝 User message: ${body.message.substring(0, 100)}...`);

    // Call ChatService to generate answer
    const answer = await chatService.generateMedicalAnswer(body.message);

    // Build response
    const conversationId = body.conversationId || generateConversationId();

    const responseData: ChatResponse = {
      answer,
      conversationId,
    };

    console.log("✅ Chat response generated successfully");

    return formatSuccessResponse(responseData);
  } catch (error: any) {
    console.error("❌ Chat handler error:", error.message);

    return formatErrorResponse(
      500,
      error.message || "Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau."
    );
  }
};
