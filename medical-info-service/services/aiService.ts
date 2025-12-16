// services/aiService.ts - IMPROVED VERSION
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import * as cheerio from "cheerio";
import { DynamoDB } from "aws-sdk";
import { Article } from "../models/article.model";
import { ChatMessage } from "../models/chat.model";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const dynamo = new DynamoDB.DocumentClient();
const CACHE_TABLE = process.env.CACHE_TABLE!;

interface ExtractedArticle {
  title: string;
  content: string;
  summary: string;
  mainTopics: string[];
}

interface ChatResponse {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    relevance: string;
    excerpt: string;
  }>;
  confidence: "high" | "medium" | "low";
  disclaimer: string;
}

export class AIService {
  private model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.3, // Giảm temperature để câu trả lời chính xác hơn
    },
  });

  // ============================================
  // CHAT FUNCTIONS - IMPROVED
  // ============================================

  /**
   * Extract keywords từ câu hỏi người dùng với validation
   */
  async extractKeywordsFromQuery(query: string): Promise<{
    keywords: string[];
    intent: string;
    language: "vi" | "en";
  }> {
    try {
      const prompt = `
Analyze this health/medical question and extract structured information.

Question: "${query}"

Return a JSON object with:
{
  "keywords": ["keyword1", "keyword2", ...], // 3-5 most relevant medical keywords
  "intent": "information_seeking|symptom_check|prevention|treatment|general", 
  "language": "vi|en"
}

Rules:
- Keywords should be medical/health terms only
- Keep keywords in the same language as the question
- Focus on: diseases, symptoms, treatments, conditions, procedures

Example 1: "Tôi bị ho và sốt, có phải cúm không?"
Output: {"keywords": ["ho", "sốt", "cúm", "triệu chứng"], "intent": "symptom_check", "language": "vi"}

Example 2: "How to prevent flu?"
Output: {"keywords": ["flu", "prevention", "vaccine"], "intent": "prevention", "language": "en"}

JSON Output:`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text().trim();

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          keywords: parsed.keywords || [],
          intent: parsed.intent || "information_seeking",
          language: parsed.language || "vi",
        };
      }

      // Fallback
      return this.fallbackKeywordExtraction(query);
    } catch (error) {
      console.error("Extract keywords error:", error);
      return this.fallbackKeywordExtraction(query);
    }
  }

  private fallbackKeywordExtraction(query: string): {
    keywords: string[];
    intent: string;
    language: "vi" | "en";
  } {
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 3)
      .slice(0, 5);

    const hasVietnamese =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
        query
      );

    return {
      keywords,
      intent: "information_seeking",
      language: hasVietnamese ? "vi" : "en",
    };
  }

  /**
   * Chat với context từ articles - IMPROVED với validation và safety checks
   */
  async chatWithContext(
    userMessage: string,
    relevantArticles: Article[],
    history?: ChatMessage[]
  ): Promise<ChatResponse> {
    try {
      const hasRelevantInfo = relevantArticles.length > 0;

      if (!hasRelevantInfo) {
        return this.generateNoInfoResponse(userMessage);
      }

      // Build context từ articles với excerpts
      const contextText = relevantArticles
        .map((article, idx) => {
          const excerpt = this.extractRelevantExcerpt(
            article.content,
            userMessage
          );
          return `[Nguồn ${idx + 1}] ${article.title}
Từ: ${this.getSourceName(article.source)}
URL: ${article.url}
Nội dung liên quan:
${excerpt}
---`;
        })
        .join("\n\n");

      // Build conversation history (max 5 recent messages)
      let historyText = "";
      if (history && history.length > 0) {
        const recentHistory = history.slice(-5);
        historyText =
          "\n=== Lịch sử hội thoại ===\n" +
          recentHistory
            .map(
              (msg) =>
                `${msg.role === "user" ? "👤 Người dùng" : "🤖 Trợ lý"}: ${
                  msg.content
                }`
            )
            .join("\n") +
          "\n";
      }

      // Create strict prompt
      const prompt = `Bạn là trợ lý y tế AI chuyên nghiệp, được huấn luyện để cung cấp thông tin y tế chính xác từ các nguồn đáng tin cậy.

${historyText}

=== THÔNG TIN TỪ CÁC NGUỒN CHÍNH THỐNG ===
${contextText}

=== CÂU HỎI CỦA NGƯỜI DÙNG ===
${userMessage}

=== HƯỚNG DẪN TRẢ LỜI (BẮT BUỘC) ===

1. **CHỈ SỬ DỤNG THÔNG TIN TỪ CÁC NGUỒN TRÊN**
   - KHÔNG được bịa đặt hoặc thêm thông tin không có trong nguồn
   - Nếu thông tin không đủ để trả lời đầy đủ, hãy nói rõ điều đó

2. **ĐỊNH DẠNG CÂU TRẢ LỜI**
   - Trả lời bằng ngôn ngữ của câu hỏi (Tiếng Việt hoặc English)
   - Giải thích rõ ràng, dễ hiểu, tránh thuật ngữ phức tạp
   - Chia thành các đoạn ngắn, dễ đọc

3. **TRÍCH DẪN NGUỒN (BẮT BUỘC)**
   - Sau mỗi thông tin quan trọng, ghi chú [Nguồn X]
   - Cuối câu trả lời, thêm phần "📚 Nguồn tham khảo:" với danh sách link

4. **DISCLAIMER (BẮT BUỘC)**
   - Luôn nhắc nhở: "⚠️ Thông tin này chỉ mang tính tham khảo"
   - Nếu câu hỏi liên quan đến triệu chứng: khuyên nên gặp bác sĩ
   - Không đưa ra chẩn đoán hoặc đề xuất điều trị cụ thể

5. **CẤU TRÚC CUỐI CÂU TRẢ LỜI**

📚 **Nguồn tham khảo:**
- [Tiêu đề nguồn 1](URL1) - Từ WHO/CDC/Bộ Y tế
- [Tiêu đề nguồn 2](URL2) - Từ WHO/CDC/Bộ Y tế

⚠️ **Lưu ý quan trọng:**
Thông tin trên chỉ mang tính tham khảo từ các nguồn y tế đáng tin cậy. Nếu bạn có triệu chứng hoặc lo ngại về sức khỏe, vui lòng tham khảo ý kiến bác sĩ hoặc chuyên gia y tế.

=== BẮT ĐẦU TRẢ LỜI ===
`;

      const result = await this.model.generateContent(prompt);
      const answer = result.response.text().trim();

      // Validate response
      const validation = this.validateResponse(answer, relevantArticles);

      // Build sources với excerpts
      const sources = relevantArticles.map((article) => ({
        title: article.title,
        url: article.url,
        relevance: this.calculateRelevance(userMessage, article),
        excerpt: this.extractRelevantExcerpt(article.content, userMessage),
      }));

      return {
        answer: validation.isValid
          ? answer
          : this.improveResponse(answer, relevantArticles),
        sources,
        confidence: this.calculateConfidence(relevantArticles, userMessage),
        disclaimer: this.generateDisclaimer(userMessage),
      };
    } catch (error) {
      console.error("Chat with context error:", error);
      return {
        answer:
          "Xin lỗi, hệ thống đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.",
        sources: [],
        confidence: "low",
        disclaimer:
          "Nếu bạn cần thông tin y tế khẩn cấp, vui lòng liên hệ bác sĩ hoặc cơ sở y tế ngay lập tức.",
      };
    }
  }

  /**
   * Generate response when no relevant info found
   */
  private generateNoInfoResponse(userMessage: string): ChatResponse {
    const hasVietnamese =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
        userMessage
      );

    const answer = hasVietnamese
      ? `Rất tiếc, hiện tại tôi không tìm thấy thông tin chính xác từ các nguồn đáng tin cậy (WHO, CDC, Bộ Y tế Việt Nam) về câu hỏi của bạn.

**Tôi khuyên bạn:**

1. **Tham khảo trực tiếp các nguồn chính thống:**
   - WHO (Tổ chức Y tế Thế giới): https://www.who.int
   - CDC (Trung tâm Kiểm soát Dịch bệnh Hoa Kỳ): https://www.cdc.gov
   - Bộ Y tế Việt Nam: https://moh.gov.vn

2. **Liên hệ chuyên gia y tế:**
   - Đặt lịch khám với bác sĩ gia đình
   - Gọi đường dây nóng y tế: 19009095

⚠️ **Cảnh báo:** Nếu bạn đang có triệu chứng nghiêm trọng (khó thở, đau ngực dữ dội, chảy máu không cầm...), hãy đến cơ sở y tế hoặc gọi cấp cứu 115 ngay lập tức.`
      : `I apologize, but I couldn't find reliable information from trusted sources (WHO, CDC, MOH Vietnam) about your question.

**I recommend:**

1. **Consult authoritative sources directly:**
   - WHO (World Health Organization): https://www.who.int
   - CDC (Centers for Disease Control): https://www.cdc.gov
   - Vietnam Ministry of Health: https://moh.gov.vn

2. **Contact healthcare professionals:**
   - Schedule an appointment with your doctor
   - Call healthcare hotline: 19009095

⚠️ **Warning:** If you have serious symptoms (difficulty breathing, severe chest pain, uncontrolled bleeding...), go to a medical facility or call emergency services 115 immediately.`;

    return {
      answer,
      sources: [],
      confidence: "low",
      disclaimer:
        "Always consult with qualified healthcare professionals for medical advice.",
    };
  }

  /**
   * Extract relevant excerpt từ article content
   */
  private extractRelevantExcerpt(
    content: string,
    query: string,
    maxLength: number = 500
  ): string {
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    // Tìm đoạn văn chứa nhiều từ khóa nhất
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 20);

    let bestSentences: string[] = [];
    let bestScore = 0;

    for (let i = 0; i < sentences.length; i++) {
      const window = sentences.slice(i, Math.min(i + 3, sentences.length));
      const windowText = window.join(". ").toLowerCase();

      const score = queryWords.reduce((sum, word) => {
        return sum + (windowText.includes(word) ? 1 : 0);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestSentences = window;
      }
    }

    const excerpt = bestSentences.join(". ").trim();

    if (excerpt.length > maxLength) {
      return excerpt.substring(0, maxLength) + "...";
    }

    return excerpt || content.substring(0, maxLength) + "...";
  }

  /**
   * Validate response quality
   */
  private validateResponse(
    response: string,
    articles: Article[]
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if response has sources section
    if (!response.includes("📚") && !response.includes("Nguồn")) {
      issues.push("Missing sources section");
    }

    // Check if response has disclaimer
    if (!response.includes("⚠️") && !response.includes("Lưu ý")) {
      issues.push("Missing disclaimer");
    }

    // Check if response is too short
    if (response.length < 100) {
      issues.push("Response too short");
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Improve response by adding missing elements
   */
  private improveResponse(response: string, articles: Article[]): string {
    let improved = response;

    // Add sources if missing
    if (!improved.includes("📚")) {
      const sourcesSection = `\n\n📚 **Nguồn tham khảo:**\n${articles
        .map(
          (a) => `- [${a.title}](${a.url}) - Từ ${this.getSourceName(a.source)}`
        )
        .join("\n")}`;
      improved += sourcesSection;
    }

    // Add disclaimer if missing
    if (!improved.includes("⚠️")) {
      const disclaimer = `\n\n⚠️ **Lưu ý quan trọng:**\nThông tin trên chỉ mang tính tham khảo. Vui lòng tham khảo ý kiến bác sĩ nếu cần thiết.`;
      improved += disclaimer;
    }

    return improved;
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(
    articles: Article[],
    query: string
  ): "high" | "medium" | "low" {
    if (articles.length === 0) return "low";
    if (articles.length >= 3) return "high";

    const avgRelevance =
      articles.reduce((sum, article) => {
        const score = this.calculateRelevanceScore(query, article);
        return sum + score;
      }, 0) / articles.length;

    if (avgRelevance > 10) return "high";
    if (avgRelevance > 5) return "medium";
    return "low";
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevanceScore(query: string, article: Article): number {
    const queryLower = query.toLowerCase();
    const titleLower = article.title.toLowerCase();
    const contentLower = article.content.toLowerCase();

    let score = 0;
    const words = queryLower.split(/\s+/).filter((w) => w.length > 2);

    words.forEach((word) => {
      if (titleLower.includes(word)) score += 5;
      if (contentLower.includes(word)) score += 1;
      if (article.keywords.some((k) => k.includes(word))) score += 3;
    });

    return score;
  }

  /**
   * Calculate relevance label
   */
  private calculateRelevance(query: string, article: Article): string {
    const score = this.calculateRelevanceScore(query, article);

    if (score > 15) return "Rất liên quan";
    if (score > 10) return "Khá liên quan";
    if (score > 5) return "Có liên quan";
    return "Có thể liên quan";
  }

  /**
   * Generate disclaimer based on query
   */
  private generateDisclaimer(query: string): string {
    const queryLower = query.toLowerCase();
    const symptomKeywords = [
      "đau",
      "sốt",
      "ho",
      "pain",
      "fever",
      "cough",
      "triệu chứng",
      "symptom",
    ];

    const hasSymptom = symptomKeywords.some((kw) => queryLower.includes(kw));

    if (hasSymptom) {
      return "Nếu bạn đang có các triệu chứng này, vui lòng tham khảo ý kiến bác sĩ để được chẩn đoán và điều trị chính xác.";
    }

    return "Thông tin này chỉ mang tính tham khảo. Luôn tham khảo ý kiến chuyên gia y tế trước khi đưa ra quyết định về sức khỏe.";
  }

  /**
   * Get readable source name
   */
  private getSourceName(source: string): string {
    const names: Record<string, string> = {
      WHO: "Tổ chức Y tế Thế giới (WHO)",
      CDC: "Trung tâm Kiểm soát Dịch bệnh Hoa Kỳ (CDC)",
      MOH_VN: "Bộ Y tế Việt Nam",
    };
    return names[source] || source;
  }

  // ============================================
  // EXTRACT ARTICLE FUNCTIONS - IMPROVED
  // ============================================

  /**
   * Extract article content - IMPROVED với validation và quality checks
   */
  async extractArticle(url: string): Promise<ExtractedArticle | null> {
    try {
      // Check cache first
      const cached = await this.getCache(url);
      if (cached) {
        console.log("✅ Cache hit for:", url);
        return cached;
      }

      console.log("🔍 Fetching:", url);

      // Fetch HTML content với timeout và retry
      const response = await this.fetchWithRetry(url, 3);
      const html = response.data;
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $(
        "script, style, nav, header, footer, aside, iframe, noscript, .advertisement, .ads, .social-share"
      ).remove();

      // Extract metadata
      const title =
        $("h1").first().text().trim() ||
        $('meta[property="og:title"]').attr("content") ||
        $("title").text().trim();

      // Try multiple selectors for main content
      const contentSelectors = [
        "article",
        "main",
        '[role="main"]',
        ".article-content",
        ".post-content",
        ".entry-content",
        ".content",
        "#content",
      ];

      let mainContent = "";
      for (const selector of contentSelectors) {
        const content = $(selector).text();
        if (content && content.length > mainContent.length) {
          mainContent = content;
        }
      }

      // Fallback to body if no content found
      if (!mainContent || mainContent.length < 200) {
        mainContent = $("body").text();
      }

      // Clean content
      const rawContent = mainContent
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\n+/g, "\n")
        .substring(0, 50000);

      if (!rawContent || rawContent.length < 200) {
        throw new Error("Insufficient content extracted from page");
      }

      console.log(`📄 Extracted ${rawContent.length} characters`);

      // Use AI to clean, structure, and validate content
      const prompt = `You are a medical information extraction specialist. Your task is to extract, clean, and structure medical/health information from web content.

URL: ${url}
Detected Title: ${title}

Raw Content:
${rawContent}

INSTRUCTIONS:
1. **Extract ONLY medical/health information**
   - Remove navigation, ads, disclaimers, author info, dates, comments
   - Remove social media links and sharing buttons
   - Keep only factual medical content

2. **Structure the content**
   - Use clear paragraphs
   - Maintain logical flow
   - Keep important lists and bullet points
   - Preserve medical terminology accuracy

3. **Quality Requirements**
   - Content must be at least 200 words
   - Must contain actual medical/health information
   - Remove duplicate or repetitive content
   - Keep Vietnamese if original is Vietnamese, English if English

4. **Output Format**
Return a JSON object:
{
  "title": "Clean article title",
  "content": "Full cleaned and structured content",
  "summary": "2-3 sentence summary of main points",
  "mainTopics": ["topic1", "topic2", "topic3"]
}

JSON Output:`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text().trim();

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI failed to return valid JSON");
      }

      const extracted = JSON.parse(jsonMatch[0]);

      // Validate extracted content
      if (
        !extracted.content ||
        extracted.content.length < 200 ||
        !extracted.title
      ) {
        throw new Error("Extracted content does not meet quality requirements");
      }

      console.log("✅ Successfully extracted and validated article");

      // Cache the result for 7 days
      await this.setCache(url, extracted, 7 * 24 * 60 * 60);

      return extracted;
    } catch (error) {
      console.error("❌ Extract article error:", error);
      return null;
    }
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(url: string, maxRetries: number): Promise<any> {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await axios.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          timeout: 30000,
          maxRedirects: 5,
        });
      } catch (error) {
        lastError = error;
        console.log(`Retry ${i + 1}/${maxRetries} for ${url}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    throw lastError;
  }

  /**
   * Generate relevant keywords - IMPROVED
   */
  async generateKeywords(title: string, content: string): Promise<string[]> {
    try {
      const prompt = `Extract 5-10 relevant medical/health keywords from this article.

Title: ${title}
Content: ${content.substring(0, 3000)}

Rules:
- Extract ONLY medical/health-related keywords
- Keep keywords in the same language as the article
- Focus on: diseases, symptoms, treatments, conditions, medications, procedures
- Avoid generic words like "health", "medical", "article"
- Return comma-separated list

Examples:
- Vietnamese article: "cúm, virus cúm, triệu chứng, phòng ngừa, tiêm chủng, vắc xin"
- English article: "influenza, flu virus, symptoms, prevention, vaccination, vaccine"

Keywords:`;

      const result = await this.model.generateContent(prompt);
      const keywordsText = result.response.text().trim();

      const keywords = keywordsText
        .split(",")
        .map((k: string) => k.trim().toLowerCase())
        .filter((k: string) => k.length > 2 && k.length < 50)
        .filter(
          (k: string) => !["y tế", "sức khỏe", "health", "medical"].includes(k)
        )
        .slice(0, 10);

      console.log("🏷️ Generated keywords:", keywords);

      return keywords.length > 0 ? keywords : ["y tế", "sức khỏe"];
    } catch (error) {
      console.error("Generate keywords error:", error);
      return ["y tế", "sức khỏe"];
    }
  }

  // ============================================
  // CACHE FUNCTIONS
  // ============================================

  private async getCache(key: string): Promise<any | null> {
    try {
      const result = await dynamo
        .get({
          TableName: CACHE_TABLE,
          Key: { key },
        })
        .promise();

      if (!result.Item) return null;

      const item = result.Item;
      const now = Math.floor(Date.now() / 1000);

      if (item.ttl && item.ttl < now) {
        return null;
      }

      return JSON.parse(item.value);
    } catch (error) {
      console.error("Get cache error:", error);
      return null;
    }
  }

  private async setCache(
    key: string,
    value: any,
    ttlSeconds: number
  ): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      await dynamo
        .put({
          TableName: CACHE_TABLE,
          Item: {
            key,
            value: JSON.stringify(value),
            ttl: now + ttlSeconds,
          },
        })
        .promise();
    } catch (error) {
      console.error("Set cache error:", error);
    }
  }
}
