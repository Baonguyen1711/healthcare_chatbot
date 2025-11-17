import { APIGatewayProxyHandler } from "aws-lambda";
import { MedicalInfoService } from "../services/medicalInfoService";
import { CacheService } from "../services/cacheService";
import { SearchQuery } from "../models/medicalInfo.model";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";
import { cacheConfig } from "../config/sources.config";

const medicalInfoService = new MedicalInfoService();
const cacheService = new CacheService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};

    const searchQuery: SearchQuery = {
      keyword: queryParams.keyword,
      category: queryParams.category as any,
      source: queryParams.source as any,
      language: queryParams.language as "vi" | "en",
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20,
      offset: queryParams.offset ? parseInt(queryParams.offset) : 0,
    };

    // Generate cache key from search params
    const cacheKey = cacheService.generateCacheKey("search", searchQuery);
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return formatSuccessResponse({
        data: cached,
        total: cached.length,
        fromCache: true,
      });
    }

    // Perform search
    const results = await medicalInfoService.search(searchQuery);

    // Cache results
    await cacheService.set(cacheKey, results, cacheConfig.searchResultsTTL);

    return formatSuccessResponse({
      data: results,
      total: results.length,
      fromCache: false,
    });
  } catch (error) {
    console.error("Search error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};
