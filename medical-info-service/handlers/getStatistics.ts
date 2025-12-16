// handlers/getStatistics.ts
import { APIGatewayProxyHandler } from "aws-lambda";
import { ArticleService } from "../services/articleService";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";

const articleService = new ArticleService();

const CATEGORY_NAMES: Record<number, string> = {
  1: "Phòng ngừa",
  2: "Dinh dưỡng",
  3: "Sức khỏe tâm thần",
  4: "Khác",
};

const SOURCE_NAMES: Record<string, string> = {
  WHO: "Tổ chức Y tế Thế giới (WHO)",
  CDC: "Trung tâm Kiểm soát Dịch bệnh Hoa Kỳ (CDC)",
  MOH_VN: "Bộ Y tế Việt Nam",
};

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("📊 Get statistics request received");

  try {
    const stats = await articleService.getStatistics();

    // Enrich statistics with names
    const enrichedBySource = Object.entries(stats.bySource).map(
      ([source, count]) => ({
        source,
        name: SOURCE_NAMES[source] || source,
        count,
      })
    );

    const enrichedByCategory = Object.entries(stats.byCategory).map(
      ([category, count]) => ({
        category: parseInt(category),
        name: CATEGORY_NAMES[parseInt(category)] || "Unknown",
        count,
      })
    );

    console.log(`✅ Statistics: ${stats.total} total articles`);

    return formatSuccessResponse({
      total: stats.total,
      bySource: enrichedBySource,
      byCategory: enrichedByCategory,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Get statistics error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};
