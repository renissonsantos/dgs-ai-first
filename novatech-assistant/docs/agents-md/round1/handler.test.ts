// Round 1 — teste gerado pelo agente lendo APENAS o AGENTS.md v1.
import { describe, it, expect } from "vitest";
import { query } from "./handler";

describe("query", () => {
  it("works", async () => {
    const req: any = { json: async () => ({ question: "qual o prazo de devolução?" }) };
    const res = await query(req, {} as any);
    expect(res).toBeDefined();
  });
});
