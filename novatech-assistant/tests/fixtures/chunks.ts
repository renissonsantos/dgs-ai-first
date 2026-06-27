// Reusable retrieval fixtures derived from the NovaTech corpus (Anexo B).
// Used by integration tests so they exercise realistic logistics content.
import type { RetrievedChunk } from "../../src/shared/types.js";

export const CHUNK_POL_001_A: RetrievedChunk = {
  id: "POL-001-A",
  sourceDocument: "POL-001#secao-3.1",
  score: 0.92,
  content:
    "O cliente pode solicitar a devolução de mercadorias em até 7 (sete) dias úteis após a " +
    "data de recebimento confirmada no sistema de tracking.",
};

export const CHUNK_POL_001_B: RetrievedChunk = {
  id: "POL-001-B",
  sourceDocument: "POL-001#secao-3.2",
  score: 0.88,
  content:
    "Cargas perigosas classificadas nas classes 1 a 6 da ANTT NÃO são elegíveis para devolução " +
    "pelo processo padrão. O cliente deve contatar a Gestão de Riscos (ramal 4500).",
};

export const CHUNK_SLA_2024_B: RetrievedChunk = {
  id: "SLA-2024-B",
  sourceDocument: "SLA-2024#secao-2",
  score: 0.9,
  content:
    "SLAs para chamados gerais — Gold: resposta em até 2h úteis, resolução em até 24h úteis. " +
    "Silver: 4h/48h. Standard: 8h/72h.",
};

export const CHUNK_PROC_042v2_B: RetrievedChunk = {
  id: "PROC-042v2-B",
  sourceDocument: "PROC-042-v2#secao-2.1",
  score: 0.86,
  content:
    "Multiplicadores regionais atualizados (novembro/2023): Sul 1.3, Sudeste 1.1, " +
    "Centro-Oeste 1.4, Nordeste 1.5, Norte 1.8.",
};

/** Full corpus used by the StubSearchService in tests. */
export const TEST_CORPUS: RetrievedChunk[] = [
  CHUNK_POL_001_A,
  CHUNK_POL_001_B,
  CHUNK_SLA_2024_B,
  CHUNK_PROC_042v2_B,
];
