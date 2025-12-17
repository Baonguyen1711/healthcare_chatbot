import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import * as cheerio from "cheerio";
import { DynamoDB } from "aws-sdk";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const dynamo = new DynamoDB.DocumentClient();
const CACHE_TABLE = process.env.CACHE_TABLE!;

interface ExtractedArticle {
  title: string;
  content: string;
  summary: string;
  mainTopics: string[];
}

export class ExtractService {
  private model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.3,
    },
  });

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
