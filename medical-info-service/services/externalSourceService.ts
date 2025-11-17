import axios, { AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import { SourceType } from "../models/medicalInfo.model";
import { externalSources } from "../config/sources.config";

export class ExternalSourceService {
  private axiosInstances: Map<SourceType, AxiosInstance> = new Map();

  constructor() {
    // Initialize axios instances for each source
    Object.values(SourceType).forEach((source) => {
      const config = externalSources[source];
      this.axiosInstances.set(
        source,
        axios.create({
          baseURL: config.baseUrl,
          timeout: 30000,
          headers: {
            "User-Agent": "HealthcareChatbot/1.0",
            Accept: "text/html,application/json",
          },
        })
      );
    });
  }

  async fetchFromWHO(topic: string): Promise<any[]> {
    try {
      // WHO doesn't have official API, we'll scrape their website
      const response = await this.axiosInstances.get(SourceType.WHO)!({
        url: `/health-topics/${topic}`,
        method: "GET",
      });

      const $ = cheerio.load(response.data);
      const articles: any[] = [];

      // Parse WHO content structure
      $(".sf-content-block").each((i: any, elem: any) => {
        const title = $(elem).find("h2").text().trim();
        const content = $(elem).find("p").text().trim();

        if (title && content) {
          articles.push({
            title,
            content,
            source: SourceType.WHO,
            sourceUrl: `https://www.who.int/health-topics/${topic}`,
          });
        }
      });

      return articles;
    } catch (error) {
      console.error("Error fetching from WHO:", error);
      return [];
    }
  }

  async fetchFromCDC(topic: string): Promise<any[]> {
    try {
      // CDC có API công khai hạn chế
      const response = await this.axiosInstances.get(SourceType.CDC)!({
        url: "/search",
        params: {
          query: topic,
          format: "json",
        },
      });

      return response.data.results.map((item: any) => ({
        title: item.title,
        content: item.description,
        source: SourceType.CDC,
        sourceUrl: item.url,
      }));
    } catch (error) {
      console.error("Error fetching from CDC:", error);
      return [];
    }
  }

  async fetchFromMOHVN(topic: string): Promise<any[]> {
    try {
      // Scrape Bộ Y tế website
      const response = await this.axiosInstances.get(SourceType.MOH_VN)!({
        url: `/tin-tong-hop/-/asset_publisher/k206Q9qkZOqn/content/tim-kiem`,
        params: { keywords: topic },
      });

      const $ = cheerio.load(response.data);
      const articles: any[] = [];

      $(".news-item").each((i: any, elem: any) => {
        const title = $(elem).find(".news-title a").text().trim();
        const summary = $(elem).find(".news-summary").text().trim();
        const url = $(elem).find(".news-title a").attr("href");

        if (title && summary) {
          articles.push({
            title,
            content: summary,
            source: SourceType.MOH_VN,
            sourceUrl: `https://moh.gov.vn${url}`,
          });
        }
      });

      return articles;
    } catch (error) {
      console.error("Error fetching from MOH VN:", error);
      return [];
    }
  }

  async syncAllSources(topics: string[]): Promise<any[]> {
    const allArticles: any[] = [];

    for (const topic of topics) {
      const [whoArticles, cdcArticles, mohArticles] = await Promise.all([
        this.fetchFromWHO(topic),
        this.fetchFromCDC(topic),
        this.fetchFromMOHVN(topic),
      ]);

      allArticles.push(...whoArticles, ...cdcArticles, ...mohArticles);
    }

    return allArticles;
  }
}
