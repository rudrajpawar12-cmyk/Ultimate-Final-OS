export type SearchEntity =
  | "job"
  | "candidate"
  | "company"
  | "interview"
  | "setting"
  | "ai-tool";

export interface SearchResult {
  id: string;
  entity: SearchEntity;
  title: string;
  subtitle: string;
  /** Router-safe destination path. */
  href: string;
  keywords: string[];
}

export interface SearchGroup {
  entity: SearchEntity;
  label: string;
  results: SearchResult[];
}

export const SEARCH_ENTITY_LABEL: Record<SearchEntity, string> = {
  job: "Jobs",
  candidate: "Candidates",
  company: "Companies",
  interview: "Interviews",
  setting: "Settings",
  "ai-tool": "AI tools",
};
