import { ExternalSource } from "../models/source.model";
import { SourceType } from "../models/medicalInfo.model";

export const externalSources: Record<SourceType, ExternalSource> = {
  [SourceType.WHO]: {
    name: SourceType.WHO,
    baseUrl: "https://www.who.int",
    endpoints: {
      search: "/api/search",
      details: "/api/articles",
    },
    rateLimit: {
      requests: 100,
      period: 60000, // 1 minute
    },
  },
  [SourceType.CDC]: {
    name: SourceType.CDC,
    baseUrl: "https://www.cdc.gov",
    endpoints: {
      search: "/api/v1/search",
      details: "/api/v1/content",
    },
    rateLimit: {
      requests: 100,
      period: 60000,
    },
  },
  [SourceType.MOH_VN]: {
    name: SourceType.MOH_VN,
    baseUrl: "https://moh.gov.vn",
    endpoints: {
      search: "/api/search",
      details: "/api/articles",
    },
    rateLimit: {
      requests: 50,
      period: 60000,
    },
  },
  [SourceType.VERIFIED]: {
    name: SourceType.VERIFIED,
    baseUrl: "",
    endpoints: {
      search: "",
      details: "",
    },
    rateLimit: {
      requests: 0,
      period: 0,
    },
  },
};

export const cacheConfig = {
  searchResultsTTL: 3600, // 1 hour
  articleDetailsTTL: 86400, // 24 hours
  popularTopicsTTL: 7200, // 2 hours
};
