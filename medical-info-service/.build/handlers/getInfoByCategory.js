"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
var medicalInfoService_1 = require("../services/medicalInfoService");
var cacheService_1 = require("../services/cacheService");
var medicalInfo_model_1 = require("../models/medicalInfo.model");
var responseFormatter_1 = require("../utils/responseFormatter");
var sources_config_1 = require("../config/sources.config");
var medicalInfoService = new medicalInfoService_1.MedicalInfoService();
var cacheService = new cacheService_1.CacheService();
var handler = function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var category, limit, cacheKey, cached, results, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                category = (event.pathParameters || {}).category;
                limit = ((_a = event.queryStringParameters) === null || _a === void 0 ? void 0 : _a.limit)
                    ? parseInt(event.queryStringParameters.limit)
                    : 20;
                if (!category ||
                    !Object.values(medicalInfo_model_1.MedicalCategory).includes(category)) {
                    return [2 /*return*/, (0, responseFormatter_1.formatErrorResponse)(400, "Invalid category")];
                }
                cacheKey = "category:".concat(category, ":").concat(limit);
                return [4 /*yield*/, cacheService.get(cacheKey)];
            case 1:
                cached = _b.sent();
                if (cached) {
                    return [2 /*return*/, (0, responseFormatter_1.formatSuccessResponse)({
                            category: category,
                            data: cached,
                            total: cached.length,
                            fromCache: true,
                        })];
                }
                return [4 /*yield*/, medicalInfoService.getByCategory(category, limit)];
            case 2:
                results = _b.sent();
                // Cache results
                return [4 /*yield*/, cacheService.set(cacheKey, results, sources_config_1.cacheConfig.searchResultsTTL)];
            case 3:
                // Cache results
                _b.sent();
                return [2 /*return*/, (0, responseFormatter_1.formatSuccessResponse)({
                        category: category,
                        data: results,
                        total: results.length,
                        fromCache: false,
                    })];
            case 4:
                error_1 = _b.sent();
                console.error("Error:", error_1);
                return [2 /*return*/, (0, responseFormatter_1.formatErrorResponse)(500, "Internal server error")];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.handler = handler;
//# sourceMappingURL=getInfoByCategory.js.map