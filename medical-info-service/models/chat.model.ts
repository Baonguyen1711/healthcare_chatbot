/**
 * Request DTO for medical chat
 */
export interface ChatRequest {
  message: string;
  conversationId?: string;
}

/**
 * Response DTO for medical chat
 * Only contains answer text - no sources, no metadata
 */
export interface ChatResponse {
  answer: string;
  conversationId: string;
}
