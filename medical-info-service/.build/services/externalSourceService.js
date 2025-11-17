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
exports.ExternalSourceService = void 0;
var axios_1 = require("axios");
var cheerio = require("cheerio");
var medicalInfo_model_1 = require("../models/medicalInfo.model");
var sources_config_1 = require("../config/sources.config");
var ExternalSourceService = /** @class */ (function () {
    function ExternalSourceService() {
        var _this = this;
        this.axiosInstances = new Map();
        // Initialize axios instances for each source
        Object.values(medicalInfo_model_1.SourceType).forEach(function (source) {
            var config = sources_config_1.externalSources[source];
            _this.axiosInstances.set(source, axios_1.default.create({
                baseURL: config.baseUrl,
                timeout: 30000,
                headers: {
                    "User-Agent": "HealthcareChatbot/1.0",
                    Accept: "text/html,application/json",
                },
            }));
        });
    }
    ExternalSourceService.prototype.fetchFromWHO = function (topic) {
        return __awaiter(this, void 0, void 0, function () {
            var response, $_1, articles_1, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.axiosInstances.get(medicalInfo_model_1.SourceType.WHO)({
                                url: "/health-topics/".concat(topic),
                                method: "GET",
                            })];
                    case 1:
                        response = _a.sent();
                        $_1 = cheerio.load(response.data);
                        articles_1 = [];
                        // Parse WHO content structure
                        $_1(".sf-content-block").each(function (i, elem) {
                            var title = $_1(elem).find("h2").text().trim();
                            var content = $_1(elem).find("p").text().trim();
                            if (title && content) {
                                articles_1.push({
                                    title: title,
                                    content: content,
                                    source: medicalInfo_model_1.SourceType.WHO,
                                    sourceUrl: "https://www.who.int/health-topics/".concat(topic),
                                });
                            }
                        });
                        return [2 /*return*/, articles_1];
                    case 2:
                        error_1 = _a.sent();
                        console.error("Error fetching from WHO:", error_1);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ExternalSourceService.prototype.fetchFromCDC = function (topic) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.axiosInstances.get(medicalInfo_model_1.SourceType.CDC)({
                                url: "/search",
                                params: {
                                    query: topic,
                                    format: "json",
                                },
                            })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data.results.map(function (item) { return ({
                                title: item.title,
                                content: item.description,
                                source: medicalInfo_model_1.SourceType.CDC,
                                sourceUrl: item.url,
                            }); })];
                    case 2:
                        error_2 = _a.sent();
                        console.error("Error fetching from CDC:", error_2);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ExternalSourceService.prototype.fetchFromMOHVN = function (topic) {
        return __awaiter(this, void 0, void 0, function () {
            var response, $_2, articles_2, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.axiosInstances.get(medicalInfo_model_1.SourceType.MOH_VN)({
                                url: "/tin-tong-hop/-/asset_publisher/k206Q9qkZOqn/content/tim-kiem",
                                params: { keywords: topic },
                            })];
                    case 1:
                        response = _a.sent();
                        $_2 = cheerio.load(response.data);
                        articles_2 = [];
                        $_2(".news-item").each(function (i, elem) {
                            var title = $_2(elem).find(".news-title a").text().trim();
                            var summary = $_2(elem).find(".news-summary").text().trim();
                            var url = $_2(elem).find(".news-title a").attr("href");
                            if (title && summary) {
                                articles_2.push({
                                    title: title,
                                    content: summary,
                                    source: medicalInfo_model_1.SourceType.MOH_VN,
                                    sourceUrl: "https://moh.gov.vn".concat(url),
                                });
                            }
                        });
                        return [2 /*return*/, articles_2];
                    case 2:
                        error_3 = _a.sent();
                        console.error("Error fetching from MOH VN:", error_3);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ExternalSourceService.prototype.syncAllSources = function (topics) {
        return __awaiter(this, void 0, void 0, function () {
            var allArticles, _i, topics_1, topic, _a, whoArticles, cdcArticles, mohArticles;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        allArticles = [];
                        _i = 0, topics_1 = topics;
                        _b.label = 1;
                    case 1:
                        if (!(_i < topics_1.length)) return [3 /*break*/, 4];
                        topic = topics_1[_i];
                        return [4 /*yield*/, Promise.all([
                                this.fetchFromWHO(topic),
                                this.fetchFromCDC(topic),
                                this.fetchFromMOHVN(topic),
                            ])];
                    case 2:
                        _a = _b.sent(), whoArticles = _a[0], cdcArticles = _a[1], mohArticles = _a[2];
                        allArticles.push.apply(allArticles, __spreadArray(__spreadArray(__spreadArray([], whoArticles, false), cdcArticles, false), mohArticles, false));
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, allArticles];
                }
            });
        });
    };
    return ExternalSourceService;
}());
exports.ExternalSourceService = ExternalSourceService;
//# sourceMappingURL=externalSourceService.js.map