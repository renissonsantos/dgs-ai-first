// Tests for the source verification loop (cenário 3, TL 3.1).
import { describe, it, expect } from "vitest";
import { verifySource, extractDocId } from "../../src/services/source-verifier.js";

describe("source-verifier", () => {
  it("should accept a valid document with a section anchor", () => {
    const res = verifySource("POL-001#secao-3.1");
    expect(res.suspect).toBe(false);
    expect(res.citedDocId).toBe("POL-001");
  });

  it("should accept the revised doc without truncating -v2", () => {
    const res = verifySource("PROC-042-v2#secao-2.1");
    expect(res.suspect).toBe(false);
    expect(res.citedDocId).toBe("PROC-042-v2");
  });

  it("should accept the comma + 'seção' format", () => {
    expect(verifySource("POL-001, seção 3.2").suspect).toBe(false);
    expect(verifySource("FAQ-Atendimento item 32").citedDocId).toBe("FAQ-Atendimento");
  });

  it("should flag a hallucinated document as suspect", () => {
    const res = verifySource("POL-999#secao-1");
    expect(res.suspect).toBe(true);
    expect(res.citedDocId).toBe("POL-999");
    expect(res.reason).toContain("não está na lista");
  });

  it("should flag a missing source_document as suspect", () => {
    const res = verifySource(undefined);
    expect(res.suspect).toBe(true);
    expect(res.citedDocId).toBeNull();
    expect(res.reason).toContain("ausente");
  });

  it("extractDocId returns null for empty input", () => {
    expect(extractDocId("   ")).toBeNull();
  });
});
