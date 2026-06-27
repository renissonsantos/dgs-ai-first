// Domain types for the NovaTech Assistant.
// All API responses MUST conform to QueryResponse (see AGENTS.md § Contrato de resposta).

export type Confidence = "alta" | "media" | "baixa";

/** Input of the query endpoint (a single attendant question, optional session context). */
export interface QueryRequest {
  question: string;
  sessionId?: string;
  /** Last conversational turns (most recent last). Capped by the prompt budget. */
  history?: ConversationTurn[];
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

/** A chunk retrieved from the corpus (Azure AI Search in production). */
export interface RetrievedChunk {
  id: string;
  content: string;
  /** Rerank score in [0, 1]; higher is more relevant. */
  score: number;
  /** Source identifier, e.g. "PROC-042-v2#secao-3". */
  sourceDocument: string;
}

/** Contract returned to the attendant. source_document is always present (AGENTS.md). */
export interface QueryResponse {
  answer: string;
  source_document: string;
  confidence: Confidence;
  low_confidence_warning?: string;
}
