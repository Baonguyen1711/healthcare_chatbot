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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
var externalSourceService_1 = require("../services/externalSourceService");
var medicalInfoService_1 = require("../services/medicalInfoService");
var medicalInfo_model_1 = require("../models/medicalInfo.model");
var externalSourceService = new externalSourceService_1.ExternalSourceService();
var medicalInfoService = new medicalInfoService_1.MedicalInfoService();
var SYNC_TOPICS = [
    "diabetes",
    "covid-19",
    "vaccination",
    "heart-disease",
    "mental-health",
    "nutrition",
    "cancer",
    "infectious-diseases",
];
var handler = function () { return __awaiter(void 0, void 0, void 0, function () {
    var articles, syncedCount, errorCount, _i, articles_1, article, category, error_1, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("Starting sync of external medical sources...");
                _a.label = 1;
            case 1:
                _a.trys.push([1, 9, , 10]);
                return [4 /*yield*/, externalSourceService.syncAllSources(SYNC_TOPICS)];
            case 2:
                articles = _a.sent();
                console.log("Fetched ".concat(articles.length, " articles"));
                syncedCount = 0;
                errorCount = 0;
                _i = 0, articles_1 = articles;
                _a.label = 3;
            case 3:
                if (!(_i < articles_1.length)) return [3 /*break*/, 8];
                article = articles_1[_i];
                _a.label = 4;
            case 4:
                _a.trys.push([4, 6, , 7]);
                category = determineCategory(article.title, article.content);
                return [4 /*yield*/, medicalInfoService.create({
                        title: article.title,
                        category: category,
                        content: article.content,
                        summary: article.content.substring(0, 200) + "...",
                        source: article.source,
                        sourceUrl: article.sourceUrl,
                        tags: extractTags(article.title, article.content),
                        language: article.source === medicalInfo_model_1.SourceType.MOH_VN ? "vi" : "en",
                        publishedDate: new Date().toISOString(),
                        reliability: 5,
                        isVerified: true,
                    })];
            case 5:
                _a.sent();
                syncedCount++;
                return [3 /*break*/, 7];
            case 6:
                error_1 = _a.sent();
                console.error("Error syncing article: ".concat(article.title), error_1);
                errorCount++;
                return [3 /*break*/, 7];
            case 7:
                _i++;
                return [3 /*break*/, 3];
            case 8:
                console.log("Sync completed: ".concat(syncedCount, " synced, ").concat(errorCount, " errors"));
                return [3 /*break*/, 10];
            case 9:
                error_2 = _a.sent();
                console.error("Sync failed:", error_2);
                throw error_2; // AWS Scheduled vẫn cho phép throw error để trigger retry
            case 10: return [2 /*return*/];
        }
    });
}); };
exports.handler = handler;
// ===== Helper functions =====
function determineCategory(title, content) {
    var text = (title + " " + content).toLowerCase();
    if (text.includes("covid") || text.includes("coronavirus"))
        return medicalInfo_model_1.MedicalCategory.COVID19;
    if (text.includes("vaccine") || text.includes("vaccination"))
        return medicalInfo_model_1.MedicalCategory.VACCINATION;
    if (text.includes("nutrition") || text.includes("diet"))
        return medicalInfo_model_1.MedicalCategory.NUTRITION;
    if (text.includes("mental") ||
        text.includes("depression") ||
        text.includes("anxiety"))
        return medicalInfo_model_1.MedicalCategory.MENTAL_HEALTH;
    if (text.includes("medicine") ||
        text.includes("drug") ||
        text.includes("medication"))
        return medicalInfo_model_1.MedicalCategory.MEDICATION;
    if (text.includes("prevent") || text.includes("hygiene"))
        return medicalInfo_model_1.MedicalCategory.PREVENTION;
    if (text.includes("treatment") || text.includes("therapy"))
        return medicalInfo_model_1.MedicalCategory.TREATMENT;
    if (text.includes("emergency") || text.includes("first aid"))
        return medicalInfo_model_1.MedicalCategory.FIRST_AID;
    return medicalInfo_model_1.MedicalCategory.DISEASE;
}
function extractTags(title, content) {
    var text = (title + " " + content).toLowerCase();
    var tags = [];
    var keywords = [
        "diabetes",
        "heart",
        "cancer",
        "covid",
        "vaccine",
        "mental health",
        "nutrition",
        "prevention",
        "treatment",
        "symptoms",
        "diagnosis",
        "medication",
        "therapy",
    ];
    keywords.forEach(function (keyword) {
        if (text.includes(keyword)) {
            tags.push(keyword);
        }
    });
    return __spreadArray([], new Set(tags), true);
}
//# sourceMappingURL=syncExternalSources.js.map