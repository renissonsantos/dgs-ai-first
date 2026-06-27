// Integration test for the query endpoint (round 2 — agent following AGENTS.md v2).
// Exercises handler + validator + prompt-builder + response-builder with stub services
// (no network). arrange/act/assert with specific assertions (never toBeDefined alone).
import { describe, it, expect } from "vitest";
import type { HttpRequest } from "@azure/functions";
import { createQueryHandler } from "../../src/functions/query/handler.js";
import { StubSearchService } from "../../src/services/search.js";
import { StubCompletionService } from "../../src/services/completion.js";
import { loadConfig } from "../../src/shared/config.js";
import { TEST_CORPUS } from "../fixtures/chunks.js";
import {
  QUERY_PRAZO_DEVOLUCAO,
  QUERY_SLA_GOLD,
} from "../fixtures/queries.js";
import {
  EXPECTED_SOURCE_PRAZO_DEVOLUCAO,
  EXPECTED_SOURCE_SLA_GOLD,
} from "../fixtures/expected-responses.js";

function makeHandler(answer = "Resposta de teste com base nas fontes.") {
  return createQueryHandler({
    search: new StubSearchService(TEST_CORPUS),
    completion: new StubCompletionService(() => answer),
    systemPrompt: "Você é o assistente da NovaTech. Cite a fonte. Não invente.",
    config: loadConfig({}),
  });
}

/** Minimal HttpRequest stub (only json() is used by the handler). */
function makeRequest(body: unknown): HttpRequest {
  return { json: async () => body } as unknown as HttpRequest;
}

describe("query endpoint", () => {
  it("should return 200 with a mandatory source_document when the question matches a chunk", async () => {
    // arrange
    const handler = makeHandler();
    const request = makeRequest({ question: QUERY_PRAZO_DEVOLUCAO });

    // act
    const res = await handler(request);

    // assert
    expect(res.status).toBe(200);
    const body = res.jsonBody as Record<string, unknown>;
    expect(body.source_document).toBe(EXPECTED_SOURCE_PRAZO_DEVOLUCAO);
    expect(body.confidence).toBe("alta");
    expect(typeof body.answer).toBe("string");
  });

  it("should cite the SLA document when asked about the Gold tier SLA", async () => {
    // arrange
    const handler = makeHandler();
    const request = makeRequest({ question: QUERY_SLA_GOLD });

    // act
    const res = await handler(request);

    // assert
    expect(res.status).toBe(200);
    expect((res.jsonBody as Record<string, unknown>).source_document).toBe(
      EXPECTED_SOURCE_SLA_GOLD,
    );
  });

  it("should return 400 with VALIDATION_ERROR when question is empty", async () => {
    // arrange
    const handler = makeHandler();
    const request = makeRequest({ question: "" });

    // act
    const res = await handler(request);

    // assert
    expect(res.status).toBe(400);
    expect((res.jsonBody as Record<string, unknown>).code).toBe("VALIDATION_ERROR");
  });

  it("should still include a source_document field even when no chunk matches", async () => {
    // arrange
    const handler = makeHandler();
    const request = makeRequest({ question: "xxxxxxxx zzzzzzz nada-corresponde" });

    // act
    const res = await handler(request);

    // assert — contract guarantees the field is always present (AGENTS.md)
    expect(res.status).toBe(200);
    const body = res.jsonBody as Record<string, unknown>;
    expect(body).toHaveProperty("source_document");
    expect(body.confidence).toBe("baixa");
    expect(body.low_confidence_warning).toContain("supervisor");
  });
});
