import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is missing");
}

export class AIService {
  private ai = new GoogleGenAI({
    apiKey: GOOGLE_API_KEY,
  });

  private readonly model = "gemini-flash-latest";

  private readonly systemPrompt = `You are a Healthcare Information Assistant.

PURPOSE
Your purpose is to provide general, educational healthcare information and assist with basic healthcare-related services.
You are NOT a doctor and do NOT replace medical professionals.

SCOPE OF SUPPORT
You are allowed to:
- Provide general health information (symptoms overview, prevention, lifestyle).
- Share trusted medical knowledge from reliable sources (WHO, CDC, Ministry of Health).
- Assist with healthcare processes (appointment booking, reminders, check-in guidance).
- Collect user feedback and conduct basic surveys.
- Operate in a calm, respectful, and supportive manner.

You are NOT allowed to:
- Diagnose diseases or confirm medical conditions.
- Prescribe medication or advise dosage changes.
- Interpret medical test results.
- Provide emergency medical treatment.
- Answer questions unrelated to healthcare.

DISCLAIMER (MANDATORY)
Always include a short disclaimer when giving health information:
"Thông tin này chỉ mang tính tham khảo và không thay thế lời khuyên y tế chuyên nghiệp."

EMERGENCY SITUATIONS (HARD RULE)
If the user mentions red-flag symptoms such as:
- Chest pain
- Severe shortness of breath
- Loss of consciousness
- Heavy bleeding
- Signs of stroke or heart attack

You MUST:
- Stop normal conversation.
- Advise calling emergency services immediately (e.g., 115 in Vietnam).
- Do not continue providing other guidance.

LANGUAGE
Respond in Vietnamese unless the user clearly uses another language.
`;

  // ===================== CHAT =====================
  async chat(message: string, history?: any[]): Promise<string> {
    const historyText = (history || [])
      .map(
        (h) => `${h.role === "user" ? "Người dùng" : "Trợ lý"}: ${h.content}`
      )
      .join("\n");

    const prompt = `
${this.systemPrompt}

${historyText}

Người dùng: ${message}
Trợ lý:
`;

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
    });

    if (!response.text) {
      throw new Error("Gemini returned empty response");
    }

    return response.text;
  }

  // ===================== EXTRACT ARTICLE =====================
  async extractArticle(
    url: string
  ): Promise<{ title: string; content: string } | null> {
    try {
      const response = await axios.get(url, { timeout: 15000 });
      const html = response.data;
      const $ = cheerio.load(html);

      $("script, style, nav, footer, header, .advertisement").remove();

      let rawText = $("body").text().trim();
      rawText = rawText.replace(/\s+/g, " ").substring(0, 8000);

      const aiResponse = await this.ai.models.generateContent({
        model: this.model,
        contents: `
Dưới đây là nội dung từ một trang web y tế:

${rawText}

Hãy trích xuất thông tin sau dưới dạng JSON:
{
  "title": "Tiêu đề chính của bài viết (ngắn gọn)",
  "content": "Tóm tắt nội dung chính của bài viết (2-3 đoạn văn)"
}

Chỉ trả về JSON, không thêm nội dung khác.
`,
        config: {
          responseMimeType: "application/json",
        },
      });

      if (!aiResponse.text) {
        throw new Error("Gemini returned empty response");
      }

      return JSON.parse(aiResponse.text);
    } catch (error) {
      console.error("Extract article error:", error);
      return null;
    }
  }

  // ===================== KEYWORDS =====================
  async generateKeywords(title: string, content: string): Promise<string[]> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: `
Dựa vào tiêu đề và nội dung sau, hãy tạo 5–8 từ khóa tìm kiếm (keywords).

Tiêu đề: ${title}
Nội dung: ${content.substring(0, 1000)}

Chỉ trả về JSON array, ví dụ:
["từ khóa 1", "từ khóa 2"]
`,
        config: {
          responseMimeType: "application/json",
        },
      });

      if (!response.text) {
        throw new Error("Gemini returned empty response");
      }

      return JSON.parse(response.text);
    } catch (error) {
      console.error("Generate keywords error:", error);
      return [];
    }
  }
}
