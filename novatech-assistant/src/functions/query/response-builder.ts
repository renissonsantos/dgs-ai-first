// Builds the QueryResponse, guaranteeing source_document and a confidence signal
// (AGENTS.md § Contrato de resposta da API).
import type { Confidence, QueryResponse, RetrievedChunk } from "../../shared/types.js";

const LOW_CONFIDENCE_THRESHOLD = 0.4;
const HIGH_CONFIDENCE_THRESHOLD = 0.7;

export function buildQueryResponse(answer: string, chunks: RetrievedChunk[]): QueryResponse {
  const top = chunks[0];
  const score = top?.score ?? 0;
  const confidence = toConfidence(score);

  const response: QueryResponse = {
    answer,
    // source_document is always present, even on low confidence (AGENTS.md).
    source_document: top?.sourceDocument ?? "sem-fonte",
    confidence,
  };

  if (confidence === "baixa") {
    response.low_confidence_warning =
      "Confiança baixa: confirme com o supervisor antes de repassar ao cliente.";
  }

  return response;
}

function toConfidence(score: number): Confidence {
  if (score >= HIGH_CONFIDENCE_THRESHOLD) return "alta";
  if (score >= LOW_CONFIDENCE_THRESHOLD) return "media";
  return "baixa";
}
