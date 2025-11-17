import { DynamoDB } from "aws-sdk";

const dynamoDB = new DynamoDB.DocumentClient();
const cacheTableName = process.env.CACHE_TABLE!;

export class CacheService {
  async get(key: string): Promise<any | null> {
    try {
      const result = await dynamoDB
        .get({
          TableName: cacheTableName,
          Key: { key },
        })
        .promise();

      if (!result.Item) return null;

      const now = Math.floor(Date.now() / 1000);
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

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const ttl = Math.floor(Date.now() / 1000) + ttlSeconds;

    await dynamoDB
      .put({
        TableName: cacheTableName,
        Item: {
          key,
          value: JSON.stringify(value),
          ttl,
        },
      })
      .promise();
  }

  async delete(key: string): Promise<void> {
    await dynamoDB
      .delete({
        TableName: cacheTableName,
        Key: { key },
      })
      .promise();
  }

  generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((k) => `${k}:${params[k]}`)
      .join("|");
    return `${prefix}:${sortedParams}`;
  }
}
