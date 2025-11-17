import { ScheduledHandler } from "aws-lambda";
import { ExternalSourceService } from "../services/externalSourceService";
import { MedicalInfoService } from "../services/medicalInfoService";
import { MedicalCategory, SourceType } from "../models/medicalInfo.model";

const externalSourceService = new ExternalSourceService();
const medicalInfoService = new MedicalInfoService();

const SYNC_TOPICS = [
  "diabetes",
  "covid-19",
  "vaccination",
  "heart-disease",
  "mental-health",
  "nutrition",
  "cancer",
  "infectious-diseases",
];

export const handler: ScheduledHandler = async () => {
  console.log("Starting sync of external medical sources...");

  try {
    const articles = await externalSourceService.syncAllSources(SYNC_TOPICS);
    console.log(`Fetched ${articles.length} articles`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const article of articles) {
      try {
        const category = determineCategory(article.title, article.content);

        await medicalInfoService.create({
          title: article.title,
          category,
          content: article.content,
          summary: article.content.substring(0, 200) + "...",
          source: article.source,
          sourceUrl: article.sourceUrl,
          tags: extractTags(article.title, article.content),
          language: article.source === SourceType.MOH_VN ? "vi" : "en",
          publishedDate: new Date().toISOString(),
          reliability: 5,
          isVerified: true,
        });

        syncedCount++;
      } catch (error) {
        console.error(`Error syncing article: ${article.title}`, error);
        errorCount++;
      }
    }

    console.log(`Sync completed: ${syncedCount} synced, ${errorCount} errors`);
  } catch (error) {
    console.error("Sync failed:", error);
    throw error; // AWS Scheduled vẫn cho phép throw error để trigger retry
  }
};

// ===== Helper functions =====

function determineCategory(title: string, content: string): MedicalCategory {
  const text = (title + " " + content).toLowerCase();

  if (text.includes("covid") || text.includes("coronavirus"))
    return MedicalCategory.COVID19;
  if (text.includes("vaccine") || text.includes("vaccination"))
    return MedicalCategory.VACCINATION;
  if (text.includes("nutrition") || text.includes("diet"))
    return MedicalCategory.NUTRITION;
  if (
    text.includes("mental") ||
    text.includes("depression") ||
    text.includes("anxiety")
  )
    return MedicalCategory.MENTAL_HEALTH;
  if (
    text.includes("medicine") ||
    text.includes("drug") ||
    text.includes("medication")
  )
    return MedicalCategory.MEDICATION;
  if (text.includes("prevent") || text.includes("hygiene"))
    return MedicalCategory.PREVENTION;
  if (text.includes("treatment") || text.includes("therapy"))
    return MedicalCategory.TREATMENT;
  if (text.includes("emergency") || text.includes("first aid"))
    return MedicalCategory.FIRST_AID;

  return MedicalCategory.DISEASE;
}

function extractTags(title: string, content: string): string[] {
  const text = (title + " " + content).toLowerCase();
  const tags: string[] = [];

  const keywords = [
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

  keywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      tags.push(keyword);
    }
  });

  return [...new Set(tags)];
}
