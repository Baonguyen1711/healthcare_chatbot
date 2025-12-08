import axios from "axios";
import { EXTERNAL_SOURCES } from "../models/externalSource.config";
import { SourceType } from "../models/medicalInfo.model";

export class ExternalSourceService {
  async syncAllSources(topics: string[]) {
    let allArticles: any[] = [];

    for (const source of EXTERNAL_SOURCES) {
      console.log(`Fetching from source: ${source.name}`);

      try {
        const results = await this.fetchSource(source, topics);
        allArticles.push(...results);
      } catch (err) {
        console.error(`Failed to fetch from ${source.name}:`, err);
      }
    }

    return allArticles;
  }

  async fetchSource(source: any, topics: string[]) {
    const url = `${source.baseUrl}${source.endpoints.search}?q=${topics.join(
      "+"
    )}`;

    console.log("Request URL →", url);

    const response = await axios.get(url, {
      timeout: 15000,
      validateStatus: () => true,
    });

    if (!response.data) {
      console.log("Empty response");
      return [];
    }

    const normalized = this.normalize(source.name, response.data);

    console.log(`Fetched ${normalized.length} articles from ${source.name}`);

    return normalized;
  }

  normalize(source: SourceType, rawData: any): any[] {
    try {
      if (source === SourceType.WHO) {
        return rawData.results.map((item: any) => ({
          title: item.title,
          content: item.snippet || "",
          source,
          sourceUrl: item.url,
        }));
      }

      if (source === SourceType.CDC) {
        return rawData.results.map((item: any) => ({
          title: item.name,
          content: item.description,
          source,
          sourceUrl: item.canonicalUrl,
        }));
      }

      if (source === SourceType.MOH_VN) {
        return rawData.items.map((i: any) => ({
          title: i.title,
          content: i.summary,
          source,
          sourceUrl: i.url,
        }));
      }

      return [];
    } catch (err) {
      console.error("Error normalizing source:", source, err);
      return [];
    }
  }
}
