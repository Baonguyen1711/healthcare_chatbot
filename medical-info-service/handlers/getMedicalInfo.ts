import { APIGatewayProxyHandler } from "aws-lambda";
import { MedicalInfoService } from "../services/medicalInfoService";
import { CacheService } from "../services/cacheService";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/responseFormatter";
import { cacheConfig } from "../config/sources.config";

const medicalInfoService = new MedicalInfoService();
const cacheService = new CacheService();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return formatErrorResponse(400, "Missing medical info ID");
    }

    const cacheKey = `medical-info:${id}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return formatSuccessResponse({
        data: cached,
        fromCache: true,
      });
    }

    const medicalInfo = await medicalInfoService.getById(id);

    if (!medicalInfo) {
      return formatErrorResponse(404, "Medical information not found");
    }

    await cacheService.set(
      cacheKey,
      medicalInfo,
      cacheConfig.articleDetailsTTL
    );

    return formatSuccessResponse({
      data: medicalInfo,
      fromCache: false,
    });
  } catch (error) {
    console.error("Error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};
