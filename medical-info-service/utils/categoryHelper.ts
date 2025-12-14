const CATEGORY_KEYWORDS = {
  1: [
    "phòng ngừa",
    "vaccination",
    "prevent",
    "immunization",
    "vắc xin",
    "tiêm chủng",
    "vaccine",
  ],
  2: [
    "dinh dưỡng",
    "nutrition",
    "diet",
    "vitamin",
    "chế độ ăn",
    "thực phẩm",
    "food",
    "eating",
  ],
  3: [
    "tâm thần",
    "mental health",
    "depression",
    "anxiety",
    "stress",
    "trầm cảm",
    "lo âu",
    "psychological",
  ],
};

export function determineCategory(text: string): number {
  const textLower = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        return parseInt(category);
      }
    }
  }

  return 4; // Khác
}

export function validateSourceUrl(
  url: string,
  source: string
): { valid: boolean; message: string } {
  const urlLower = url.toLowerCase();

  if (source === "WHO" && !urlLower.includes("who.int")) {
    return { valid: false, message: "URL must be from who.int" };
  }
  if (source === "CDC" && !urlLower.includes("cdc.gov")) {
    return { valid: false, message: "URL must be from cdc.gov" };
  }
  if (source === "MOH_VN" && !urlLower.includes("moh.gov.vn")) {
    return { valid: false, message: "URL must be from moh.gov.vn" };
  }

  return { valid: true, message: "" };
}
