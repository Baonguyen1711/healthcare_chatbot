// services/articleService.ts - IMPROVED VERSION
import { DynamoDB } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import { Article, SearchQuery } from "../models/article.model";

const dynamo = new DynamoDB.DocumentClient();
const TABLE = process.env.DYNAMODB_TABLE!;

export class ArticleService {
  /**
   * Get article by ID
   */
  async getById(id: string): Promise<Article | null> {
    try {
      const result = await dynamo
        .get({
          TableName: TABLE,
          Key: { id },
        })
        .promise();

      if (!result.Item) return null;

      // Increment views asynchronously (don't wait)
      this.incrementViews(id).catch((err) =>
        console.error("Failed to increment views:", err)
      );

      return result.Item as Article;
    } catch (error) {
      console.error("Get by ID error:", error);
      return null;
    }
  }

  /**
   * Create new article
   */
  async create(
    article: Omit<Article, "id" | "views" | "createdAt">
  ): Promise<Article> {
    const newArticle: Article = {
      ...article,
      id: uuidv4(),
      views: 0,
      createdAt: new Date().toISOString(),
    };

    await dynamo
      .put({
        TableName: TABLE,
        Item: newArticle,
      })
      .promise();

    console.log(`✅ Created article: ${newArticle.id}`);
    return newArticle;
  }

  /**
   * Search articles with filters
   */
  async search(query: SearchQuery): Promise<Article[]> {
    try {
      const params: any = {
        TableName: TABLE,
        Limit: query.limit || 20,
      };

      const filterExpressions: string[] = [];
      const expressionValues: any = {};
      const expressionNames: any = {};

      if (query.keyword) {
        const keywordLower = query.keyword.toLowerCase();
        filterExpressions.push(
          "(contains(#title, :keyword) OR contains(#content, :keyword))"
        );
        expressionValues[":keyword"] = keywordLower;
        expressionNames["#title"] = "title";
        expressionNames["#content"] = "content";
      }

      if (query.category) {
        filterExpressions.push("category = :category");
        expressionValues[":category"] = query.category;
      }

      if (query.source) {
        filterExpressions.push("#source = :source");
        expressionValues[":source"] = query.source;
        expressionNames["#source"] = "source";
      }

      if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(" AND ");
        params.ExpressionAttributeValues = expressionValues;
        params.ExpressionAttributeNames = expressionNames;
      }

      const result = await dynamo.scan(params).promise();
      return (result.Items as Article[]) || [];
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  }

  /**
   * Get articles by category
   */
  async getByCategory(
    category: number,
    limit: number = 20
  ): Promise<Article[]> {
    try {
      // Try to use CategoryIndex if available
      try {
        const params = {
          TableName: TABLE,
          IndexName: "CategoryIndex",
          KeyConditionExpression: "category = :cat",
          ExpressionAttributeValues: { ":cat": category },
          Limit: limit,
        };

        const result = await dynamo.query(params).promise();
        return (result.Items as Article[]) || [];
      } catch (indexError) {
        // Fallback to scan if index doesn't exist
        console.warn("CategoryIndex not available, using scan");
        return this.search({ category, limit });
      }
    } catch (error) {
      console.error("Get by category error:", error);
      return [];
    }
  }

  /**
   * Increment article views
   */
  async incrementViews(id: string): Promise<void> {
    try {
      await dynamo
        .update({
          TableName: TABLE,
          Key: { id },
          UpdateExpression: "ADD #views :inc",
          ExpressionAttributeNames: { "#views": "views" },
          ExpressionAttributeValues: { ":inc": 1 },
        })
        .promise();
    } catch (error) {
      console.error("Increment views error:", error);
    }
  }

  /**
   * Get popular articles
   */
  async getPopular(limit: number = 10): Promise<Article[]> {
    try {
      const result = await dynamo
        .scan({
          TableName: TABLE,
          ProjectionExpression:
            "id, title, #views, category, #src, createdAt, keywords",
          ExpressionAttributeNames: {
            "#src": "source",
            "#views": "views",
          },
        })
        .promise();

      const articles = (result.Items as Article[]) || [];
      const sorted = articles.sort((a, b) => (b.views || 0) - (a.views || 0));
      return sorted.slice(0, limit);
    } catch (error) {
      console.error("Get popular error:", error);
      return [];
    }
  }

  /**
   * Search relevant articles - IMPROVED với better ranking algorithm
   */
  async searchRelevant(
    keywords: string[],
    limit: number = 5
  ): Promise<Article[]> {
    try {
      console.log(`🔍 Searching for keywords: ${keywords.join(", ")}`);

      // Lấy tất cả articles
      const result = await dynamo
        .scan({
          TableName: TABLE,
        })
        .promise();

      const articles = (result.Items as Article[]) || [];
      console.log(`   Total articles in database: ${articles.length}`);

      if (articles.length === 0) {
        console.warn("⚠️ No articles in database");
        return [];
      }

      // Score và rank articles với improved algorithm
      const scoredArticles = articles
        .map((article) => {
          const scores = this.calculateDetailedScore(article, keywords);
          return {
            article,
            ...scores,
          };
        })
        .filter((item) => item.totalScore > 0) // Chỉ giữ articles có điểm
        .sort((a, b) => {
          // Sort by total score first
          if (b.totalScore !== a.totalScore) {
            return b.totalScore - a.totalScore;
          }
          // Then by title score (more relevant if in title)
          if (b.titleScore !== a.titleScore) {
            return b.titleScore - a.titleScore;
          }
          // Then by recency
          return b.article.createdAt.localeCompare(a.article.createdAt);
        })
        .slice(0, limit);

      console.log(`   Found ${scoredArticles.length} relevant articles:`);
      scoredArticles.forEach((item, idx) => {
        console.log(
          `   ${idx + 1}. ${item.article.title} (Score: ${item.totalScore})`
        );
        console.log(
          `      - Title: ${item.titleScore}, Keywords: ${item.keywordScore}, Content: ${item.contentScore}`
        );
      });

      return scoredArticles.map((item) => item.article);
    } catch (error) {
      console.error("❌ Search relevant error:", error);
      return [];
    }
  }

  /**
   * Calculate detailed relevance score - IMPROVED
   */
  private calculateDetailedScore(
    article: Article,
    keywords: string[]
  ): {
    titleScore: number;
    keywordScore: number;
    contentScore: number;
    totalScore: number;
  } {
    let titleScore = 0;
    let keywordScore = 0;
    let contentScore = 0;

    const titleLower = article.title.toLowerCase();
    const contentLower = article.content.toLowerCase();
    const articleKeywords = (article.keywords || []).map((k) =>
      k.toLowerCase()
    );

    keywords.forEach((keyword) => {
      const keywordLower = keyword.toLowerCase();

      // Skip very short keywords
      if (keywordLower.length <= 2) return;

      // Title matches (highest weight)
      if (titleLower.includes(keywordLower)) {
        titleScore += 10;
        // Bonus if exact word match (not just substring)
        if (new RegExp(`\\b${keywordLower}\\b`, "i").test(titleLower)) {
          titleScore += 5;
        }
      }

      // Article keywords matches (medium-high weight)
      if (articleKeywords.some((k) => k.includes(keywordLower))) {
        keywordScore += 5;
        // Bonus for exact match
        if (articleKeywords.includes(keywordLower)) {
          keywordScore += 3;
        }
      }

      // Content matches (lower weight, but counts frequency)
      const contentMatches = (
        contentLower.match(new RegExp(keywordLower, "g")) || []
      ).length;
      if (contentMatches > 0) {
        // Logarithmic scoring to prevent over-weighting frequent terms
        contentScore += Math.min(Math.log2(contentMatches + 1) * 2, 10);
      }
    });

    // Calculate total score with weights
    const totalScore = titleScore * 1.5 + keywordScore * 1.2 + contentScore;

    return {
      titleScore,
      keywordScore,
      contentScore,
      totalScore: Math.round(totalScore * 10) / 10, // Round to 1 decimal
    };
  }

  /**
   * Get recent articles
   */
  async getRecent(limit: number = 10): Promise<Article[]> {
    try {
      const result = await dynamo
        .scan({
          TableName: TABLE,
          Limit: Math.min(limit * 2, 100), // Get more than needed for sorting
        })
        .promise();

      const articles = (result.Items as Article[]) || [];
      const sorted = articles.sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
      return sorted.slice(0, limit);
    } catch (error) {
      console.error("Get recent error:", error);
      return [];
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    total: number;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    try {
      const result = await dynamo
        .scan({
          TableName: TABLE,
          ProjectionExpression: "#src, category",
          ExpressionAttributeNames: { "#src": "source" },
        })
        .promise();

      const articles = (result.Items as Article[]) || [];

      const bySource: Record<string, number> = {};
      const byCategory: Record<string, number> = {};

      articles.forEach((article) => {
        // Count by source
        const source = article.source || "Unknown";
        bySource[source] = (bySource[source] || 0) + 1;

        // Count by category
        const category = article.category?.toString() || "Unknown";
        byCategory[category] = (byCategory[category] || 0) + 1;
      });

      return {
        total: articles.length,
        bySource,
        byCategory,
      };
    } catch (error) {
      console.error("Get statistics error:", error);
      return { total: 0, bySource: {}, byCategory: {} };
    }
  }

  /**
   * Delete article
   */
  async delete(id: string): Promise<boolean> {
    try {
      await dynamo
        .delete({
          TableName: TABLE,
          Key: { id },
        })
        .promise();

      console.log(`🗑️ Deleted article: ${id}`);
      return true;
    } catch (error) {
      console.error("Delete error:", error);
      return false;
    }
  }

  /**
   * Update article
   */
  async update(
    id: string,
    updates: Partial<Omit<Article, "id" | "createdAt">>
  ): Promise<Article | null> {
    try {
      // Build update expression
      const updateExpressions: string[] = [];
      const expressionValues: any = {};
      const expressionNames: any = {};

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          updateExpressions.push(`#${key} = :${key}`);
          expressionValues[`:${key}`] = value;
          expressionNames[`#${key}`] = key;
        }
      });

      if (updateExpressions.length === 0) {
        console.warn("No updates provided");
        return null;
      }

      const result = await dynamo
        .update({
          TableName: TABLE,
          Key: { id },
          UpdateExpression: `SET ${updateExpressions.join(", ")}`,
          ExpressionAttributeValues: expressionValues,
          ExpressionAttributeNames: expressionNames,
          ReturnValues: "ALL_NEW",
        })
        .promise();

      console.log(`✏️ Updated article: ${id}`);
      return result.Attributes as Article;
    } catch (error) {
      console.error("Update error:", error);
      return null;
    }
  }
}
