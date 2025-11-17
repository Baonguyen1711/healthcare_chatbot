import { SourceType } from "./medicalInfo.model";

export interface ExternalSource {
  name: SourceType;
  baseUrl: string;
  apiKey?: string;
  endpoints: {
    search: string;
    details: string;
  };
  rateLimit: {
    requests: number;
    period: number; // milliseconds
  };
}
