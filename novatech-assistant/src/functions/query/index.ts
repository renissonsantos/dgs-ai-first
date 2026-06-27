// Azure Functions v4 registration for the query endpoint.
// Wires the real (local-phase stub) dependencies into the handler.
// Kept separate from handler.ts so tests import the handler without the host runtime.
import { app } from "@azure/functions";
import { readFileSync } from "node:fs";
import { loadConfig } from "../../shared/config.js";
import { StubSearchService } from "../../services/search.js";
import { StubCompletionService } from "../../services/completion.js";
import { createQueryHandler } from "./handler.js";

const systemPrompt = readFileSync(
  new URL("../../../prompts/system-prompt.md", import.meta.url),
  "utf8",
);

// Local phase: stub services (no Azure). Replaced by Azure-backed impls in production.
const handler = createQueryHandler({
  search: new StubSearchService([]),
  completion: new StubCompletionService(() => "Resposta indisponível no modo local."),
  systemPrompt,
  config: loadConfig(),
});

app.http("query", {
  methods: ["POST"],
  authLevel: "function",
  route: "query",
  handler,
});
