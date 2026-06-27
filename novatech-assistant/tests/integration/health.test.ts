// Integration test for the health endpoint (3rd generation under skill v2).
import { describe, it, expect } from "vitest";
import type { HttpRequest } from "@azure/functions";
import { createHealthHandler, type HealthCheck } from "../../src/functions/health/handler.js";

const emptyRequest = {} as unknown as HttpRequest;

function handlerWith(checks: HealthCheck[]) {
  // Fixed clock so uptime is deterministic (now - startedAt = 1000).
  return createHealthHandler({ checks, startedAt: 1_000, now: () => 2_000 });
}

describe("health endpoint", () => {
  it("should return 200 ok when every check passes", async () => {
    // arrange
    const handler = handlerWith([{ name: "search", check: async () => true }]);

    // act
    const res = await handler(emptyRequest);

    // assert
    expect(res.status).toBe(200);
    const body = res.jsonBody as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(body.uptimeMs).toBe(1_000);
    expect(body.checks).toEqual([{ name: "search", ok: true }]);
  });

  it("should return 503 degraded when a dependency check fails", async () => {
    // arrange
    const handler = handlerWith([
      { name: "search", check: async () => true },
      { name: "openai", check: async () => false },
    ]);

    // act
    const res = await handler(emptyRequest);

    // assert
    expect(res.status).toBe(503);
    expect((res.jsonBody as Record<string, unknown>).status).toBe("degraded");
  });

  it("should treat a throwing check as a failed dependency, not a 500", async () => {
    // arrange
    const handler = handlerWith([
      { name: "openai", check: async () => { throw new Error("timeout"); } },
    ]);

    // act
    const res = await handler(emptyRequest);

    // assert
    expect(res.status).toBe(503);
    const body = res.jsonBody as Record<string, unknown>;
    expect(body.status).toBe("degraded");
  });
});
