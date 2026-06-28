// Verification loop (harness layer 2 — cenário 3, TL 3.1).
// Deterministic check that the cited source_document refers to a REAL NovaTech document.
// Complements the prompt (probabilistic "always cite a source") with code (deterministic
// "the cited source must exist"). A response citing an unknown doc is flagged as suspect.
import type { QueryResponse } from "../shared/types.js";

/** Canonical short identifiers of the valid NovaTech documents (AGENTS.md / Anexo A). */
export const VALID_DOCUMENTS = [
  "POL-001",
  "PROC-042",
  "PROC-042-v2",
  "SLA-2024",
  "FAQ-Atendimento",
] as const;

export type ValidDocumentId = (typeof VALID_DOCUMENTS)[number];

const VALID_SET = new Set<string>(VALID_DOCUMENTS);

export interface SourceVerification {
  suspect: boolean;
  /** The document id extracted from source_document, or null when none could be parsed. */
  citedDocId: string | null;
  reason?: string;
}

/**
 * Extract the document id from a source_document string.
 * Accepts the project formats: "POL-001#secao-3.1", "POL-001, seção 3.2", "FAQ-Atendimento item 32".
 * Returns the longest valid id that the string starts with (so "PROC-042-v2" is not truncated
 * to "PROC-042"), or the leading token when no valid id matches.
 */
export function extractDocId(sourceDocument: string): string | null {
  const trimmed = sourceDocument.trim();
  if (!trimmed) return null;

  // Prefer an exact longest-prefix match against the known ids (handles -v2 vs base).
  const match = [...VALID_DOCUMENTS]
    .sort((a, b) => b.length - a.length)
    .find((id) => trimmed === id || trimmed.startsWith(`${id}#`) || trimmed.startsWith(`${id},`) || trimmed.startsWith(`${id} `));
  if (match) return match;

  // Fallback: leading token before a separator, so unknown ids are still surfaced.
  return trimmed.split(/[#,\s]/)[0] || null;
}

/** Verify a single source_document value against the valid-documents list. */
export function verifySource(sourceDocument: string | undefined | null): SourceVerification {
  if (!sourceDocument || !sourceDocument.trim()) {
    return { suspect: true, citedDocId: null, reason: "source_document ausente" };
  }
  const citedDocId = extractDocId(sourceDocument);
  if (citedDocId && VALID_SET.has(citedDocId)) {
    return { suspect: false, citedDocId };
  }
  return {
    suspect: true,
    citedDocId,
    reason: `documento citado "${citedDocId ?? sourceDocument}" não está na lista de documentos válidos`,
  };
}

/** Convenience wrapper for a full QueryResponse. */
export function verifyResponseSource(response: Pick<QueryResponse, "source_document">): SourceVerification {
  return verifySource(response.source_document);
}
