import { EXTERNAL_SOURCES } from "../models/externalSource.config";
import { SourceType } from "../models/medicalInfo.model";
import axios from "axios";
import * as cheerio from "cheerio";

export class ExternalSourceService {
  async syncAllSources(topics: string[]) {
    let allArticles: any[] = [];

    for (const src of EXTERNAL_SOURCES) {
      let list: any[] = [];

      switch (src.name) {
        case SourceType.WHO:
          list = await this.fetchWHO(topics);
          break;

        case SourceType.CDC:
          list = await this.fetchCDC(topics);
          break;

        case SourceType.MOH_VN:
          list = await this.scrapeMOH(topics);
          break;
      }

      console.log(`Fetched ${list.length} from ${src.name}`);
      allArticles.push(...list);
    }

    return allArticles;
  }

  // ================= WHO ===================
  async fetchWHO(topics: string[]) {
    let items: any[] = [];

    for (const t of topics) {
      const url = `https://www.who.int/api/search?query=${t}`;
      const res = await axios.get(url);

      const results = res.data?.results || [];

      results.forEach((r: any) => {
        items.push({
          title: r.title,
          content: r.snippet || "",
          source: SourceType.WHO,
          sourceUrl: r.url,
        });
      });
    }

    return items;
  }

  // ================= CDC ===================
  async fetchCDC(topics: string[]) {
    let items: any[] = [];

    for (const t of topics) {
      const url = `https://tools.cdc.gov/api/v2/resources/media?search=${t}`;
      const res = await axios.get(url);

      const results = res.data?.results || [];

      results.forEach((r: any) => {
        items.push({
          title: r.name,
          content: r.description || "",
          source: SourceType.CDC,
          sourceUrl: r.url,
        });
      });
    }

    return items;
  }

  // ================= MOH.VN SCRAPING ===================
  async scrapeMOH(topics: string[]) {
    const url = `https://moh.gov.vn/`;
    const html = await axios.get(url).then((r) => r.data);

    const $ = cheerio.load(html);
    const items: any[] = [];

    $("article a, .news-item a, .item-news a").each((_, el) => {
      const title = $(el).text().trim();
      const link = "https://moh.gov.vn" + $(el).attr("href");

      if (title.length < 10) return;

      // filter theo topic
      const lower = title.toLowerCase();
      if (!topics.some((t) => lower.includes(t.replace("-", " ")))) return;

      items.push({
        title,
        content: "", // sẽ lấy nội dung chi tiết ở bước sau
        source: SourceType.MOH_VN,
        sourceUrl: link,
      });
    });

    return items;
  }
}
