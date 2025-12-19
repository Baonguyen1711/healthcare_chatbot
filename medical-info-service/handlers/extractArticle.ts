import { APIGatewayProxyHandler } from "aws-lambda";
import { ExtractService } from "../services/extractService";
import { ArticleService } from "../services/articleService";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";
import { validateSourceUrl, determineCategory } from "../utils/categoryHelper";

const extractService = new ExtractService();
const articleService = new ArticleService();

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("📰 Extract article request received");

  try {
    // Parse and validate request
    const body = JSON.parse(event.body || "{}");

    if (!body.url || !body.source) {
      return formatErrorResponse(400, "URL and source are required");
    }

    // Validate URL format
    let url: URL;
    try {
      url = new URL(body.url);
    } catch (error) {
      return formatErrorResponse(400, "Invalid URL format");
    }

    // Validate source value
    const validSources = ["WHO", "CDC", "MOH_VN"];
    if (!validSources.includes(body.source)) {
      return formatErrorResponse(
        400,
        `Invalid source. Must be one of: ${validSources.join(", ")}`
      );
    }

    // Validate URL matches source
    const urlValidation = validateSourceUrl(body.url, body.source);
    if (!urlValidation.valid) {
      return formatErrorResponse(400, urlValidation.message);
    }

    console.log(`🌐 Extracting from: ${body.url}`);
    console.log(`📍 Source: ${body.source}`);

    // Extract article content
    console.log("🔍 Step 1: Extracting article content...");
    const extractedData = await extractService.extractArticle(body.url);

    if (!extractedData) {
      console.error("❌ Failed to extract article data");
      return formatErrorResponse(
        500,
        "Không thể trích xuất nội dung từ URL. Vui lòng kiểm tra lại URL hoặc thử lại sau."
      );
    }

    console.log(`✅ Extracted: ${extractedData.title}`);
    console.log(`   Content length: ${extractedData.content.length} chars`);
    console.log(`   Summary: ${extractedData.summary?.substring(0, 100)}...`);

    // Generate keywords
    console.log("🏷️ Step 2: Generating keywords...");
    const keywords = await extractService.generateKeywords(
      extractedData.title,
      extractedData.content
    );
    console.log(`   Keywords: ${keywords.join(", ")}`);

    // Determine category
    console.log("📂 Step 3: Determining category...");
    const category = determineCategory(
      extractedData.title + " " + extractedData.content
    );
    const categoryNames = {
      1: "Phòng ngừa",
      2: "Dinh dưỡng",
      3: "Sức khỏe tâm thần",
      4: "Khác",
    };
    console.log(
      `   Category: ${
        categoryNames[category as keyof typeof categoryNames] || "Unknown"
      }`
    );

    // Generate emoji - AI tự chọn
    console.log("😊 Step 3.5: Generating emoji...");
    const emoji = await extractService.generateEmoji(
      extractedData.title,
      extractedData.content,
      category
    );
    console.log(`   Emoji: ${emoji}`);

    // Option to save to database
    let savedArticle = null;
    if (body.saveToDatabase === true) {
      console.log("💾 Step 4: Saving to database...");
      try {
        const exists = await articleService.existsByUrl(body.url);

        if (exists) {
          console.log("⚠️ Article already exists (by URL)");
        } else {
          savedArticle = await articleService.create({
            title: extractedData.title,
            content: extractedData.content,
            source: body.source,
            category,
            url: body.url,
            keywords,
            emoji,
          });
          console.log(`✅ Saved to database with ID: ${savedArticle.id}`);
        }
      } catch (error) {
        console.error("❌ Failed to save to database:", error);
        // Continue even if save fails
      }
    }

    // Build response
    const responseData = {
      extracted: {
        title: extractedData.title,
        content: extractedData.content,
        summary: extractedData.summary || "",
        mainTopics: extractedData.mainTopics || [],
      },
      metadata: {
        source: body.source,
        category,
        categoryName:
          categoryNames[category as keyof typeof categoryNames] || "Unknown",
        url: body.url,
        keywords,
        emoji,
        contentLength: extractedData.content.length,
        wordCount: extractedData.content.split(/\s+/).length,
      },
      saved: savedArticle
        ? {
            id: savedArticle.id,
            createdAt: savedArticle.createdAt,
          }
        : null,
      timestamp: new Date().toISOString(),
    };

    console.log("✅ Article extraction completed successfully");

    return formatSuccessResponse(responseData);
  } catch (error: any) {
    console.error("❌ Extract article error:", error);

    // Log detailed error
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Determine appropriate error message
    let errorMessage =
      "Đã xảy ra lỗi khi trích xuất bài viết. Vui lòng thử lại sau.";

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      errorMessage =
        "Không thể kết nối đến URL. Vui lòng kiểm tra lại địa chỉ.";
    } else if (error.code === "ETIMEDOUT") {
      errorMessage = "Hết thời gian kết nối. URL có thể đang không khả dụng.";
    } else if (error.response?.status === 404) {
      errorMessage = "URL không tồn tại (404 Not Found).";
    } else if (error.response?.status === 403) {
      errorMessage = "Không có quyền truy cập URL này (403 Forbidden).";
    }

    return formatErrorResponse(500, errorMessage);
  }
};
