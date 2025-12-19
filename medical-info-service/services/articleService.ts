import { DynamoDB } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import { Article, SearchQuery } from "../models/article.model";

const dynamo = new DynamoDB.DocumentClient();
const TABLE = process.env.DYNAMODB_TABLE!;

export class ArticleService {
  /**
   * Normalize text for search - remove special chars, lowercase
   */
  private normalizeSearchText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\/\-_\s]+/g, " ") // Replace /, -, _, spaces with single space
      .replace(
        /[^\w\sàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi,
        ""
      ) // Keep alphanumeric + Vietnamese
      .trim();
  }

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
      category: String(article.category) as any,
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
      console.log("🔍 Search query:", query);

      const params: any = {
        TableName: TABLE,
      };

      const filterExpressions: string[] = [];
      const expressionValues: any = {};
      const expressionNames: any = {};

      // ===== Filter theo category =====
      if (query.category !== undefined) {
        filterExpressions.push("category = :category");
        expressionValues[":category"] = String(query.category);
      }

      // ===== Filter theo source =====
      if (query.source) {
        filterExpressions.push("#source = :source");
        expressionValues[":source"] = query.source;
        expressionNames["#source"] = "source";
      }

      if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(" AND ");
        params.ExpressionAttributeValues = expressionValues;

        if (Object.keys(expressionNames).length > 0) {
          params.ExpressionAttributeNames = expressionNames;
        }
      }

      console.log("   DynamoDB Filter:", params.FilterExpression);

      // ===== Scan DynamoDB =====
      const result = await dynamo.scan(params).promise();
      let articles = (result.Items as Article[]) || [];

      console.log(`   DynamoDB returned ${articles.length} articles`);

      // ===== Keyword search =====
      if (query.keyword?.trim()) {
        const normalizedKeyword = this.normalizeSearchText(query.keyword);
        const searchTerms = normalizedKeyword
          .split(/\s+/)
          .filter((t) => t.length >= 2);

        if (searchTerms.length > 0) {
          articles = articles.filter((article) => {
            const normalizedTitle = this.normalizeSearchText(article.title);
            const normalizedContent = this.normalizeSearchText(article.content);
            const normalizedKeywords = (article.keywords || [])
              .map((k) => this.normalizeSearchText(k))
              .join(" ");

            const searchableText = `${normalizedTitle} ${normalizedContent} ${normalizedKeywords}`;

            return searchTerms.some((term) => searchableText.includes(term));
          });
        }
      }

      // ===== Sort giảm dần theo views =====
      articles.sort((a, b) => (b.views || 0) - (a.views || 0));

      // ===== Limit =====
      return articles.slice(0, query.limit || 20);
    } catch (error) {
      console.error("❌ Search error:", error);
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

  async existsByUrl(url: string): Promise<boolean> {
    try {
      const result = await dynamo
        .scan({
          TableName: TABLE,
          FilterExpression: "#url = :url",
          ExpressionAttributeNames: {
            "#url": "url",
          },
          ExpressionAttributeValues: {
            ":url": url,
          },
          Limit: 1,
        })
        .promise();

      return !!(result.Items && result.Items.length > 0);
    } catch (error) {
      console.error("existsByUrl error:", error);
      return false;
    }
  }
}
