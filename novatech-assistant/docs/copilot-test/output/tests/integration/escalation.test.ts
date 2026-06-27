// Integration test for the escalation endpoint.
import { describe, it, expect } from "vitest";
import type { HttpRequest } from "@azure/functions";
import { createEscalationHandler } from "../../src/functions/escalation/handler.js";
import type {
  EscalationInput,
  EscalationStore,
  SavedEscalation,
} from "../../src/services/escalation-store.js";

function makeRequest(body: unknown): HttpRequest {
  return { json: async () => body } as unknown as HttpRequest;
}

class FakeEscalationStore implements EscalationStore {
  readonly savedInputs: EscalationInput[] = [];

  async save(input: EscalationInput): Promise<SavedEscalation> {
    this.savedInputs.push(input);
    return { ...input, id: "esc-test-1" };
  }
}

describe("escalation endpoint", () => {
  it("should persist the escalation and return 201 with an escalationId", async () => {
    // arrange
    const store = new FakeEscalationStore();
    const handler = createEscalationHandler({ store });
    const request = makeRequest({
      queryId: "q-123",
      reason: "Cliente pediu revisão do prazo informado.",
      attendantId: "att-9",
    });

    // act
    const res = await handler(request);

    // assert
    expect(res.status).toBe(201);
    const body = res.jsonBody as Record<string, unknown>;
    expect(body.status).toBe("escalado");
    expect(body.escalationId).toBe("esc-test-1");
    expect(store.savedInputs).toEqual([
      {
        queryId: "q-123",
        reason: "Cliente pediu revisão do prazo informado.",
        attendantId: "att-9",
      },
    ]);
  });

  it("should return 400 VALIDATION_ERROR when reason is empty", async () => {
    // arrange
    const store = new FakeEscalationStore();
    const handler = createEscalationHandler({ store });
    const request = makeRequest({
      queryId: "q-123",
      reason: "",
      attendantId: "att-9",
    });

    // act
    const res = await handler(request);

    // assert
    expect(res.status).toBe(400);
    expect((res.jsonBody as Record<string, unknown>).code).toBe("VALIDATION_ERROR");
    expect(store.savedInputs).toHaveLength(0);
  });
});
