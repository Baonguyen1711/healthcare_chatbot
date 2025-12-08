import { SourceType, ExternalSource } from "./medicalInfo.model";

export const EXTERNAL_SOURCES: ExternalSource[] = [
  {
    name: SourceType.WHO,
    baseUrl: "https://www.who.int/api",
    endpoints: {
      search: "/search",
      details: "/articles",
    },
    rateLimit: {
      requests: 10,
      period: 10000,
    },
  },
  {
    name: SourceType.CDC,
    baseUrl: "https://tools.cdc.gov/api/v2/resources",
    endpoints: {
      search: "/media",
      details: "/media",
    },
    rateLimit: {
      requests: 10,
      period: 10000,
    },
  },
  {
    name: SourceType.MOH_VN,
    baseUrl: "https://moh.gov.vn",
    endpoints: {
      search: "/api/articles",
      details: "/api/article",
    },
    rateLimit: {
      requests: 10,
      period: 10000,
    },
  },
];
