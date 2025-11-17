export interface MedicalInfo {
  id: string;
  title: string;
  category: MedicalCategory;
  content: string;
  summary: string;
  source: SourceType;
  sourceUrl: string;
  tags: string[];
  language: "vi" | "en";
  publishedDate: string;
  lastUpdated: string;
  reliability: number; // 1-5 rating
  views: number;
  isVerified: boolean;
  relatedTopics?: string[];
  metadata?: {
    author?: string;
    reviewedBy?: string;
    references?: string[];
  };
}

export enum MedicalCategory {
  DISEASE = "disease",
  PREVENTION = "prevention",
  TREATMENT = "treatment",
  NUTRITION = "nutrition",
  MENTAL_HEALTH = "mental_health",
  MEDICATION = "medication",
  FIRST_AID = "first_aid",
  VACCINATION = "vaccination",
  COVID19 = "covid19",
}

export enum SourceType {
  WHO = "WHO",
  CDC = "CDC",
  MOH_VN = "MOH_VN", // Bộ Y tế VN
  VERIFIED = "VERIFIED",
}

export interface SearchQuery {
  keyword?: string;
  category?: MedicalCategory;
  source?: SourceType;
  language?: "vi" | "en";
  limit?: number;
  offset?: number;
}
