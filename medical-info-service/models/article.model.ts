export interface Article {
  id: string;
  title: string;
  content: string;
  source: "WHO" | "CDC" | "MOH_VN";
  category: number; // 1: Phòng ngừa, 2: Dinh dưỡng, 3: Sức khỏe tâm thần, 4: Khác
  url: string;
  keywords: string[];
  createdAt: string;
  views: number;
  emoji: string;
}

export interface SearchQuery {
  keyword?: string;
  category?: number;
  source?: string;
  limit?: number;
  offset?: number;
}
