// Retrieval service. Production impl wraps Azure AI Search; handlers depend on the
// SearchService INTERFACE, never on the SDK (AGENTS.md § Coding Standards, rule 4).
import type { RetrievedChunk } from "../shared/types.js";

export interface SearchService {
  /**
   * Retrieve the top-k reranked chunks for a question.
   * k defaults to 6 (single-domain) per ADR-0002; callers may raise it to 12.
   */
  retrieve(question: string, k?: number): Promise<RetrievedChunk[]>;
}

/**
 * Local-phase stub: returns injected fixtures. No network, no Azure.
 * Swapped for an AzureAiSearchService in production (same interface).
 */
export class StubSearchService implements SearchService {
  constructor(private readonly corpus: RetrievedChunk[]) {}

  async retrieve(question: string, k = 6): Promise<RetrievedChunk[]> {
    // Naive lexical overlap score so the stub is deterministic and testable.
    const terms = question.toLowerCase().split(/\W+/).filter(Boolean);
    return this.corpus
      .map((chunk) => ({
        ...chunk,
        score: scoreOverlap(terms, chunk.content),
      }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

function scoreOverlap(terms: string[], content: string): number {
  const text = content.toLowerCase();
  const hits = terms.filter((t) => text.includes(t)).length;
  return terms.length === 0 ? 0 : hits / terms.length;
}
