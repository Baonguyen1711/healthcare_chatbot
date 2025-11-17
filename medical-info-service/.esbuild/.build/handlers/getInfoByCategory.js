"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../node_modules/uuid/dist/rng.js
var require_rng = __commonJS({
  "../node_modules/uuid/dist/rng.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = rng;
    var _crypto = _interopRequireDefault(require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function rng() {
      return _crypto.default.randomBytes(16);
    }
  }
});

// ../node_modules/uuid/dist/bytesToUuid.js
var require_bytesToUuid = __commonJS({
  "../node_modules/uuid/dist/bytesToUuid.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var byteToHex = [];
    for (i = 0; i < 256; ++i) {
      byteToHex[i] = (i + 256).toString(16).substr(1);
    }
    var i;
    function bytesToUuid(buf, offset) {
      var i2 = offset || 0;
      var bth = byteToHex;
      return [bth[buf[i2++]], bth[buf[i2++]], bth[buf[i2++]], bth[buf[i2++]], "-", bth[buf[i2++]], bth[buf[i2++]], "-", bth[buf[i2++]], bth[buf[i2++]], "-", bth[buf[i2++]], bth[buf[i2++]], "-", bth[buf[i2++]], bth[buf[i2++]], bth[buf[i2++]], bth[buf[i2++]], bth[buf[i2++]], bth[buf[i2++]]].join("");
    }
    var _default = bytesToUuid;
    exports2.default = _default;
  }
});

// ../node_modules/uuid/dist/v1.js
var require_v1 = __commonJS({
  "../node_modules/uuid/dist/v1.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _rng = _interopRequireDefault(require_rng());
    var _bytesToUuid = _interopRequireDefault(require_bytesToUuid());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var _nodeId;
    var _clockseq;
    var _lastMSecs = 0;
    var _lastNSecs = 0;
    function v12(options, buf, offset) {
      var i = buf && offset || 0;
      var b = buf || [];
      options = options || {};
      var node = options.node || _nodeId;
      var clockseq = options.clockseq !== void 0 ? options.clockseq : _clockseq;
      if (node == null || clockseq == null) {
        var seedBytes = options.random || (options.rng || _rng.default)();
        if (node == null) {
          node = _nodeId = [seedBytes[0] | 1, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
        }
        if (clockseq == null) {
          clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 16383;
        }
      }
      var msecs = options.msecs !== void 0 ? options.msecs : (/* @__PURE__ */ new Date()).getTime();
      var nsecs = options.nsecs !== void 0 ? options.nsecs : _lastNSecs + 1;
      var dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 1e4;
      if (dt < 0 && options.clockseq === void 0) {
        clockseq = clockseq + 1 & 16383;
      }
      if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === void 0) {
        nsecs = 0;
      }
      if (nsecs >= 1e4) {
        throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
      }
      _lastMSecs = msecs;
      _lastNSecs = nsecs;
      _clockseq = clockseq;
      msecs += 122192928e5;
      var tl = ((msecs & 268435455) * 1e4 + nsecs) % 4294967296;
      b[i++] = tl >>> 24 & 255;
      b[i++] = tl >>> 16 & 255;
      b[i++] = tl >>> 8 & 255;
      b[i++] = tl & 255;
      var tmh = msecs / 4294967296 * 1e4 & 268435455;
      b[i++] = tmh >>> 8 & 255;
      b[i++] = tmh & 255;
      b[i++] = tmh >>> 24 & 15 | 16;
      b[i++] = tmh >>> 16 & 255;
      b[i++] = clockseq >>> 8 | 128;
      b[i++] = clockseq & 255;
      for (var n = 0; n < 6; ++n) {
        b[i + n] = node[n];
      }
      return buf ? buf : (0, _bytesToUuid.default)(b);
    }
    var _default = v12;
    exports2.default = _default;
  }
});

// ../node_modules/uuid/dist/v35.js
var require_v35 = __commonJS({
  "../node_modules/uuid/dist/v35.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = _default;
    exports2.URL = exports2.DNS = void 0;
    var _bytesToUuid = _interopRequireDefault(require_bytesToUuid());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function uuidToBytes(uuid2) {
      var bytes = [];
      uuid2.replace(/[a-fA-F0-9]{2}/g, function(hex) {
        bytes.push(parseInt(hex, 16));
      });
      return bytes;
    }
    function stringToBytes(str) {
      str = unescape(encodeURIComponent(str));
      var bytes = new Array(str.length);
      for (var i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i);
      }
      return bytes;
    }
    var DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    exports2.DNS = DNS;
    var URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
    exports2.URL = URL;
    function _default(name, version, hashfunc) {
      var generateUUID = function(value, namespace, buf, offset) {
        var off = buf && offset || 0;
        if (typeof value == "string") value = stringToBytes(value);
        if (typeof namespace == "string") namespace = uuidToBytes(namespace);
        if (!Array.isArray(value)) throw TypeError("value must be an array of bytes");
        if (!Array.isArray(namespace) || namespace.length !== 16) throw TypeError("namespace must be uuid string or an Array of 16 byte values");
        var bytes = hashfunc(namespace.concat(value));
        bytes[6] = bytes[6] & 15 | version;
        bytes[8] = bytes[8] & 63 | 128;
        if (buf) {
          for (var idx = 0; idx < 16; ++idx) {
            buf[off + idx] = bytes[idx];
          }
        }
        return buf || (0, _bytesToUuid.default)(bytes);
      };
      try {
        generateUUID.name = name;
      } catch (err) {
      }
      generateUUID.DNS = DNS;
      generateUUID.URL = URL;
      return generateUUID;
    }
  }
});

// ../node_modules/uuid/dist/md5.js
var require_md5 = __commonJS({
  "../node_modules/uuid/dist/md5.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _crypto = _interopRequireDefault(require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function md5(bytes) {
      if (Array.isArray(bytes)) {
        bytes = Buffer.from(bytes);
      } else if (typeof bytes === "string") {
        bytes = Buffer.from(bytes, "utf8");
      }
      return _crypto.default.createHash("md5").update(bytes).digest();
    }
    var _default = md5;
    exports2.default = _default;
  }
});

// ../node_modules/uuid/dist/v3.js
var require_v3 = __commonJS({
  "../node_modules/uuid/dist/v3.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _v = _interopRequireDefault(require_v35());
    var _md = _interopRequireDefault(require_md5());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var v32 = (0, _v.default)("v3", 48, _md.default);
    var _default = v32;
    exports2.default = _default;
  }
});

// ../node_modules/uuid/dist/v4.js
var require_v4 = __commonJS({
  "../node_modules/uuid/dist/v4.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _rng = _interopRequireDefault(require_rng());
    var _bytesToUuid = _interopRequireDefault(require_bytesToUuid());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function v42(options, buf, offset) {
      var i = buf && offset || 0;
      if (typeof options == "string") {
        buf = options === "binary" ? new Array(16) : null;
        options = null;
      }
      options = options || {};
      var rnds = options.random || (options.rng || _rng.default)();
      rnds[6] = rnds[6] & 15 | 64;
      rnds[8] = rnds[8] & 63 | 128;
      if (buf) {
        for (var ii = 0; ii < 16; ++ii) {
          buf[i + ii] = rnds[ii];
        }
      }
      return buf || (0, _bytesToUuid.default)(rnds);
    }
    var _default = v42;
    exports2.default = _default;
  }
});

// ../node_modules/uuid/dist/sha1.js
var require_sha1 = __commonJS({
  "../node_modules/uuid/dist/sha1.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _crypto = _interopRequireDefault(require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function sha1(bytes) {
      if (Array.isArray(bytes)) {
        bytes = Buffer.from(bytes);
      } else if (typeof bytes === "string") {
        bytes = Buffer.from(bytes, "utf8");
      }
      return _crypto.default.createHash("sha1").update(bytes).digest();
    }
    var _default = sha1;
    exports2.default = _default;
  }
});

// ../node_modules/uuid/dist/v5.js
var require_v5 = __commonJS({
  "../node_modules/uuid/dist/v5.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _v = _interopRequireDefault(require_v35());
    var _sha = _interopRequireDefault(require_sha1());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var v52 = (0, _v.default)("v5", 80, _sha.default);
    var _default = v52;
    exports2.default = _default;
  }
});

// ../node_modules/uuid/dist/index.js
var require_dist = __commonJS({
  "../node_modules/uuid/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "v1", {
      enumerable: true,
      get: function() {
        return _v.default;
      }
    });
    Object.defineProperty(exports2, "v3", {
      enumerable: true,
      get: function() {
        return _v2.default;
      }
    });
    Object.defineProperty(exports2, "v4", {
      enumerable: true,
      get: function() {
        return _v3.default;
      }
    });
    Object.defineProperty(exports2, "v5", {
      enumerable: true,
      get: function() {
        return _v4.default;
      }
    });
    var _v = _interopRequireDefault(require_v1());
    var _v2 = _interopRequireDefault(require_v3());
    var _v3 = _interopRequireDefault(require_v4());
    var _v4 = _interopRequireDefault(require_v5());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
  }
});

// handlers/getInfoByCategory.ts
var getInfoByCategory_exports = {};
__export(getInfoByCategory_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(getInfoByCategory_exports);

// services/medicalInfoService.ts
var import_aws_sdk = require("aws-sdk");

// ../node_modules/uuid/wrapper.mjs
var import_dist = __toESM(require_dist(), 1);
var v1 = import_dist.default.v1;
var v3 = import_dist.default.v3;
var v4 = import_dist.default.v4;
var v5 = import_dist.default.v5;

// services/medicalInfoService.ts
var dynamoDB = new import_aws_sdk.DynamoDB.DocumentClient();
var tableName = process.env.DYNAMODB_TABLE;
var MedicalInfoService = class {
  async getById(id) {
    const params = {
      TableName: tableName,
      Key: { id }
    };
    const result = await dynamoDB.get(params).promise();
    if (result.Item) {
      await this.incrementViews(id);
    }
    return result.Item || null;
  }
  async search(query) {
    let params = {
      TableName: tableName,
      Limit: query.limit || 20
    };
    if (query.category) {
      params.IndexName = "CategoryIndex";
      params.KeyConditionExpression = "category = :category";
      params.ExpressionAttributeValues = {
        ":category": query.category
      };
    }
    const filterExpressions = [];
    const expressionValues = params.ExpressionAttributeValues || {};
    if (query.keyword) {
      filterExpressions.push(
        "(contains(title, :keyword) OR contains(content, :keyword) OR contains(tags, :keyword))"
      );
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
    const result = query.category ? await dynamoDB.query(params).promise() : await dynamoDB.scan(params).promise();
    return result.Items;
  }
  async getByCategory(category, limit = 20) {
    const params = {
      TableName: tableName,
      IndexName: "CategoryIndex",
      KeyConditionExpression: "category = :category",
      ExpressionAttributeValues: {
        ":category": category
      },
      Limit: limit,
      ScanIndexForward: false
      // Get newest first
    };
    const result = await dynamoDB.query(params).promise();
    return result.Items;
  }
  async create(info) {
    const medicalInfo = {
      ...info,
      id: v4(),
      views: 0,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    await dynamoDB.put({
      TableName: tableName,
      Item: medicalInfo
    }).promise();
    return medicalInfo;
  }
  async update(id, updates) {
    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
    Object.keys(updates).forEach((key, index) => {
      updateExpression.push(`#attr${index} = :val${index}`);
      expressionAttributeNames[`#attr${index}`] = key;
      expressionAttributeValues[`:val${index}`] = updates[key];
    });
    updateExpression.push(`#lastUpdated = :lastUpdated`);
    expressionAttributeNames["#lastUpdated"] = "lastUpdated";
    expressionAttributeValues[":lastUpdated"] = (/* @__PURE__ */ new Date()).toISOString();
    const params = {
      TableName: tableName,
      Key: { id },
      UpdateExpression: `SET ${updateExpression.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW"
    };
    const result = await dynamoDB.update(params).promise();
    return result.Attributes;
  }
  async incrementViews(id) {
    await dynamoDB.update({
      TableName: tableName,
      Key: { id },
      UpdateExpression: "ADD #views :increment",
      ExpressionAttributeNames: {
        "#views": "views"
      },
      ExpressionAttributeValues: {
        ":increment": 1
      }
    }).promise();
  }
  async getPopularTopics(limit = 10) {
    const params = {
      TableName: tableName,
      Limit: 100
      // Get more items to sort
    };
    const result = await dynamoDB.scan(params).promise();
    const items = result.Items;
    return items.sort((a, b) => b.views - a.views).slice(0, limit);
  }
};

// services/cacheService.ts
var import_aws_sdk2 = require("aws-sdk");
var dynamoDB2 = new import_aws_sdk2.DynamoDB.DocumentClient();
var cacheTableName = process.env.CACHE_TABLE;
var CacheService = class {
  async get(key) {
    try {
      const result = await dynamoDB2.get({
        TableName: cacheTableName,
        Key: { key }
      }).promise();
      if (!result.Item) return null;
      const now = Math.floor(Date.now() / 1e3);
      if (result.Item.ttl < now) {
        await this.delete(key);
        return null;
      }
      return JSON.parse(result.Item.value);
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }
  async set(key, value, ttlSeconds) {
    const ttl = Math.floor(Date.now() / 1e3) + ttlSeconds;
    await dynamoDB2.put({
      TableName: cacheTableName,
      Item: {
        key,
        value: JSON.stringify(value),
        ttl
      }
    }).promise();
  }
  async delete(key) {
    await dynamoDB2.delete({
      TableName: cacheTableName,
      Key: { key }
    }).promise();
  }
  generateCacheKey(prefix, params) {
    const sortedParams = Object.keys(params).sort().map((k) => `${k}:${params[k]}`).join("|");
    return `${prefix}:${sortedParams}`;
  }
};

// models/medicalInfo.model.ts
var MedicalCategory = /* @__PURE__ */ ((MedicalCategory2) => {
  MedicalCategory2["DISEASE"] = "disease";
  MedicalCategory2["PREVENTION"] = "prevention";
  MedicalCategory2["TREATMENT"] = "treatment";
  MedicalCategory2["NUTRITION"] = "nutrition";
  MedicalCategory2["MENTAL_HEALTH"] = "mental_health";
  MedicalCategory2["MEDICATION"] = "medication";
  MedicalCategory2["FIRST_AID"] = "first_aid";
  MedicalCategory2["VACCINATION"] = "vaccination";
  MedicalCategory2["COVID19"] = "covid19";
  return MedicalCategory2;
})(MedicalCategory || {});

// utils/responseFormatter.ts
var formatSuccessResponse = (data, statusCode = 200, metadata) => {
  const response = {
    success: true,
    data,
    metadata: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...metadata
    }
  };
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block"
    },
    body: JSON.stringify(response)
  };
};
var formatErrorResponse = (statusCode, message, code, details) => {
  const response = {
    success: false,
    error: {
      code: code || `ERROR_${statusCode}`,
      message,
      details
    },
    metadata: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
    },
    body: JSON.stringify(response)
  };
};

// config/sources.config.ts
var externalSources = {
  ["WHO" /* WHO */]: {
    name: "WHO" /* WHO */,
    baseUrl: "https://www.who.int",
    endpoints: {
      search: "/api/search",
      details: "/api/articles"
    },
    rateLimit: {
      requests: 100,
      period: 6e4
      // 1 minute
    }
  },
  ["CDC" /* CDC */]: {
    name: "CDC" /* CDC */,
    baseUrl: "https://www.cdc.gov",
    endpoints: {
      search: "/api/v1/search",
      details: "/api/v1/content"
    },
    rateLimit: {
      requests: 100,
      period: 6e4
    }
  },
  ["MOH_VN" /* MOH_VN */]: {
    name: "MOH_VN" /* MOH_VN */,
    baseUrl: "https://moh.gov.vn",
    endpoints: {
      search: "/api/search",
      details: "/api/articles"
    },
    rateLimit: {
      requests: 50,
      period: 6e4
    }
  },
  ["VERIFIED" /* VERIFIED */]: {
    name: "VERIFIED" /* VERIFIED */,
    baseUrl: "",
    endpoints: {
      search: "",
      details: ""
    },
    rateLimit: {
      requests: 0,
      period: 0
    }
  }
};
var cacheConfig = {
  searchResultsTTL: 3600,
  // 1 hour
  articleDetailsTTL: 86400,
  // 24 hours
  popularTopicsTTL: 7200
  // 2 hours
};

// handlers/getInfoByCategory.ts
var medicalInfoService = new MedicalInfoService();
var cacheService = new CacheService();
var handler = async (event) => {
  try {
    const { category } = event.pathParameters || {};
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : 20;
    if (!category || !Object.values(MedicalCategory).includes(category)) {
      return formatErrorResponse(400, "Invalid category");
    }
    const cacheKey = `category:${category}:${limit}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return formatSuccessResponse({
        category,
        data: cached,
        total: cached.length,
        fromCache: true
      });
    }
    const results = await medicalInfoService.getByCategory(
      category,
      limit
    );
    await cacheService.set(cacheKey, results, cacheConfig.searchResultsTTL);
    return formatSuccessResponse({
      category,
      data: results,
      total: results.length,
      fromCache: false
    });
  } catch (error) {
    console.error("Error:", error);
    return formatErrorResponse(500, "Internal server error");
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=getInfoByCategory.js.map
