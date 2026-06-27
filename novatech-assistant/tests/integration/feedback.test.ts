// Integration test for the feedback endpoint (round 2 — agent following skill v2).
import { describe, it, expect } from "vitest";
import type { HttpRequest } from "@azure/functions";
import { createFeedbackHandler } from "../../src/functions/feedback/handler.js";
import { InMemoryFeedbackStore } from "../../src/services/feedback-store.js";

function makeRequest(body: unknown): HttpRequest {
  return { json: async () => body } as unknown as HttpRequest;
}

describe("feedback endpoint", () => {
  it("should persist feedback and return 201 with a feedbackId", async () => {
    // arrange
    const store = new InMemoryFeedbackStore();
    const handler = createFeedbackHandler({ store });
    const request = makeRequest({ queryId: "q-1", helpful: false, comment: "valor errado" });

    // act
    const res = await handler(request);

    // assert
    expect(res.status).toBe(201);
    const body = res.jsonBody as Record<string, unknown>;
    expect(body.status).toBe("registrado");
    expect(body.feedbackId).toBe("fb-1");
    expect(store.all()).toHaveLength(1);
    expect(store.all()[0].queryId).toBe("q-1");
  });

  it("should return 400 VALIDATION_ERROR when helpful is missing", async () => {
    // arrange
    const handler = createFeedbackHandler({ store: new InMemoryFeedbackStore() });
    const request = makeRequest({ queryId: "q-1" });

    // act
    const res = await handler(request);

    // assert
    expect(res.status).toBe(400);
    expect((res.jsonBody as Record<string, unknown>).code).toBe("VALIDATION_ERROR");
  });
});
