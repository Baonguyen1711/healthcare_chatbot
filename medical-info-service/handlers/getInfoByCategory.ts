import { APIGatewayProxyHandler } from "aws-lambda";
import { MedicalInfoService } from "../services/medicalInfoService";
import { CacheService } from "../services/cacheService";
import { MedicalCategory } from "../models/medicalInfo.model";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";
import { cacheConfig } from "../config/sources.config";

const medicalInfoService = new MedicalInfoService();
const cacheService = new CacheService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { category } = event.pathParameters || {};
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit)
      : 20;

    if (
      !category ||
      !Object.values(MedicalCategory).includes(category as MedicalCategory)
    ) {
      return formatErrorResponse(400, "Invalid category");
    }

    // Check cache
    const cacheKey = `category:${category}:${limit}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return formatSuccessResponse({
        category,
        data: cached,
        total: cached.length,
        fromCache: true,
      });
    }

    // Fetch from database
    const results = await medicalInfoService.getByCategory(
      category as MedicalCategory,
      limit
    );

    // Cache results
    await cacheService.set(cacheKey, results, cacheConfig.searchResultsTTL);

    return formatSuccessResponse({
      category,
      data: results,
      total: results.length,
      fromCache: false,
    });
  } catch (error) {
    console.error("Error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};
