import { APIGatewayProxyHandler } from "aws-lambda";
import { AIService } from "../services/aiService";
import { ChatRequest } from "../models/chat.model";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";

const aiService = new AIService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body: ChatRequest = JSON.parse(event.body || "{}");

    if (!body.message || body.message.trim().length === 0) {
      return formatErrorResponse(400, "Message is required");
    }

    const response = await aiService.chat(body.message, body.history);

    return formatSuccessResponse({
      response,
      conversationId: body.conversationId || generateConversationId(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
