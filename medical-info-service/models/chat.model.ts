export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  history?: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  timestamp: string;
}
