import { localSearchRepository, type SearchRepository } from "@/repositories/search.repository";
import { SEARCH_ENTITY_LABEL, type SearchEntity, type SearchGroup, type SearchResult } from "@/types/search";

const ENTITY_ORDER: SearchEntity[] = [
  "ai-tool",
  "job",
  "candidate",
  "interview",
  "company",
  "setting",
];

function score(result: SearchResult, query: string) {
  const q = query.toLowerCase();
  const title = result.title.toLowerCase();
  if (title === q) return 0;
  if (title.startsWith(q)) return 1;
  if (title.includes(q)) return 2;
  if (result.subtitle.toLowerCase().includes(q)) return 3;
  if (result.keywords.some((keyword) => keyword.toLowerCase().includes(q))) return 4;
  return -1;
}

/**
 * Service layer for global search and the command palette.
 * Ranking and grouping rules live here; the repository only indexes.
 */
export function createSearchService(repository: SearchRepository = localSearchRepository) {
  return {
    getIndex: () => repository.getIndex(),

    search(index: SearchResult[], query: string, limit = 20): SearchResult[] {
      const trimmed = query.trim();
      if (!trimmed) {
        return index.filter((result) => result.entity === "ai-tool" || result.entity === "setting");
      }
      return index
        .map((result) => ({ result, rank: score(result, trimmed) }))
        .filter((entry) => entry.rank >= 0)
        .sort((a, b) => a.rank - b.rank || a.result.title.localeCompare(b.result.title))
        .slice(0, limit)
        .map((entry) => entry.result);
    },

    group(results: SearchResult[]): SearchGroup[] {
      return ENTITY_ORDER.map((entity) => ({
        entity,
        label: SEARCH_ENTITY_LABEL[entity],
        results: results.filter((result) => result.entity === entity),
      })).filter((group) => group.results.length > 0);
    },
  };
}

export const searchService = createSearchService();
