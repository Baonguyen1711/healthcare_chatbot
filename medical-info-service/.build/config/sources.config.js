"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheConfig = exports.externalSources = void 0;
var medicalInfo_model_1 = require("../models/medicalInfo.model");
exports.externalSources = (_a = {},
    _a[medicalInfo_model_1.SourceType.WHO] = {
        name: medicalInfo_model_1.SourceType.WHO,
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
    _a[medicalInfo_model_1.SourceType.CDC] = {
        name: medicalInfo_model_1.SourceType.CDC,
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
    _a[medicalInfo_model_1.SourceType.MOH_VN] = {
        name: medicalInfo_model_1.SourceType.MOH_VN,
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
    _a[medicalInfo_model_1.SourceType.VERIFIED] = {
        name: medicalInfo_model_1.SourceType.VERIFIED,
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
    _a);
exports.cacheConfig = {
    searchResultsTTL: 3600, // 1 hour
    articleDetailsTTL: 86400, // 24 hours
    popularTopicsTTL: 7200, // 2 hours
};
//# sourceMappingURL=sources.config.js.map