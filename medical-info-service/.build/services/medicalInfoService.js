"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.MedicalInfoService = void 0;
var aws_sdk_1 = require("aws-sdk");
var uuid_1 = require("uuid");
var dynamoDB = new aws_sdk_1.DynamoDB.DocumentClient();
var tableName = process.env.DYNAMODB_TABLE;
var MedicalInfoService = /** @class */ (function () {
    function MedicalInfoService() {
    }
    MedicalInfoService.prototype.getById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var params, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = {
                            TableName: tableName,
                            Key: { id: id },
                        };
                        return [4 /*yield*/, dynamoDB.get(params).promise()];
                    case 1:
                        result = _a.sent();
                        if (!result.Item) return [3 /*break*/, 3];
                        // Increment view count
                        return [4 /*yield*/, this.incrementViews(id)];
                    case 2:
                        // Increment view count
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, result.Item || null];
                }
            });
        });
    };
    MedicalInfoService.prototype.search = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var params, filterExpressions, expressionValues, result, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        params = {
                            TableName: tableName,
                            Limit: query.limit || 20,
                        };
                        if (query.category) {
                            params.IndexName = "CategoryIndex";
                            params.KeyConditionExpression = "category = :category";
                            params.ExpressionAttributeValues = {
                                ":category": query.category,
                            };
                        }
                        filterExpressions = [];
                        expressionValues = params.ExpressionAttributeValues || {};
                        if (query.keyword) {
                            filterExpressions.push("(contains(title, :keyword) OR contains(content, :keyword) OR contains(tags, :keyword))");
                            expressionValues[":keyword"] = query.keyword;
                        }
                        if (query.source) {
                            filterExpressions.push("source = :source");
                            expressionValues[":source"] = query.source;
                        }
                        if (query.language) {
                            filterExpressions.push("language = :language");
                            expressionValues[":language"] = query.language;
                        }
                        if (filterExpressions.length > 0) {
                            params.FilterExpression = filterExpressions.join(" AND ");
                            params.ExpressionAttributeValues = expressionValues;
                        }
                        if (!query.category) return [3 /*break*/, 2];
                        return [4 /*yield*/, dynamoDB.query(params).promise()];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, dynamoDB.scan(params).promise()];
                    case 3:
                        _a = _b.sent();
                        _b.label = 4;
                    case 4:
                        result = _a;
                        return [2 /*return*/, result.Items];
                }
            });
        });
    };
    MedicalInfoService.prototype.getByCategory = function (category_1) {
        return __awaiter(this, arguments, void 0, function (category, limit) {
            var params, result;
            if (limit === void 0) { limit = 20; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = {
                            TableName: tableName,
                            IndexName: "CategoryIndex",
                            KeyConditionExpression: "category = :category",
                            ExpressionAttributeValues: {
                                ":category": category,
                            },
                            Limit: limit,
                            ScanIndexForward: false, // Get newest first
                        };
                        return [4 /*yield*/, dynamoDB.query(params).promise()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.Items];
                }
            });
        });
    };
    MedicalInfoService.prototype.create = function (info) {
        return __awaiter(this, void 0, void 0, function () {
            var medicalInfo;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        medicalInfo = __assign(__assign({}, info), { id: (0, uuid_1.v4)(), views: 0, lastUpdated: new Date().toISOString() });
                        return [4 /*yield*/, dynamoDB
                                .put({
                                TableName: tableName,
                                Item: medicalInfo,
                            })
                                .promise()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, medicalInfo];
                }
            });
        });
    };
    MedicalInfoService.prototype.update = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updateExpression, expressionAttributeValues, expressionAttributeNames, params, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updateExpression = [];
                        expressionAttributeValues = {};
                        expressionAttributeNames = {};
                        Object.keys(updates).forEach(function (key, index) {
                            updateExpression.push("#attr".concat(index, " = :val").concat(index));
                            expressionAttributeNames["#attr".concat(index)] = key;
                            expressionAttributeValues[":val".concat(index)] =
                                updates[key];
                        });
                        // Always update lastUpdated
                        updateExpression.push("#lastUpdated = :lastUpdated");
                        expressionAttributeNames["#lastUpdated"] = "lastUpdated";
                        expressionAttributeValues[":lastUpdated"] = new Date().toISOString();
                        params = {
                            TableName: tableName,
                            Key: { id: id },
                            UpdateExpression: "SET ".concat(updateExpression.join(", ")),
                            ExpressionAttributeNames: expressionAttributeNames,
                            ExpressionAttributeValues: expressionAttributeValues,
                            ReturnValues: "ALL_NEW",
                        };
                        return [4 /*yield*/, dynamoDB.update(params).promise()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.Attributes];
                }
            });
        });
    };
    MedicalInfoService.prototype.incrementViews = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, dynamoDB
                            .update({
                            TableName: tableName,
                            Key: { id: id },
                            UpdateExpression: "ADD #views :increment",
                            ExpressionAttributeNames: {
                                "#views": "views",
                            },
                            ExpressionAttributeValues: {
                                ":increment": 1,
                            },
                        })
                            .promise()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MedicalInfoService.prototype.getPopularTopics = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            var params, result, items;
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = {
                            TableName: tableName,
                            Limit: 100, // Get more items to sort
                        };
                        return [4 /*yield*/, dynamoDB.scan(params).promise()];
                    case 1:
                        result = _a.sent();
                        items = result.Items;
                        // Sort by views and return top items
                        return [2 /*return*/, items.sort(function (a, b) { return b.views - a.views; }).slice(0, limit)];
                }
            });
        });
    };
    return MedicalInfoService;
}());
exports.MedicalInfoService = MedicalInfoService;
//# sourceMappingURL=medicalInfoService.js.map