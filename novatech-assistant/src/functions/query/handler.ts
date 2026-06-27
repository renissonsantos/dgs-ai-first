// HTTP trigger for the query endpoint (Azure Functions v4).
// The handler ORCHESTRATES; business logic lives in services and builders
// (AGENTS.md § Organização de diretórios). Dependencies are injected so the handler
// is testable without network (AGENTS.md § Coding Standards, rule 4).
import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod";
import { logger } from "../../shared/logger.js";
import { AppError, isAppError, ValidationError } from "../../shared/errors.js";
import type { Config } from "../../shared/config.js";
import type { SearchService } from "../../services/search.js";
import type { CompletionService } from "../../services/completion.js";
import { buildPrompt } from "../../services/prompt-builder.js";
import { QueryRequestSchema, QueryResponseSchema } from "./validator.js";
import { buildQueryResponse } from "./response-builder.js";

export interface QueryDeps {
  search: SearchService;
  completion: CompletionService;
  systemPrompt: string;
  config: Config;
}

export function createQueryHandler(deps: QueryDeps) {
  return async function query(
    request: HttpRequest,
    _context?: InvocationContext,
  ): Promise<HttpResponseInit> {
    const start = Date.now();
    try {
      // 1. Validate input (Zod). Never trust the raw body.
      const raw = await request.json().catch(() => {
        throw new ValidationError("body inválido: JSON esperado");
      });
      const parsed = QueryRequestSchema.parse(raw);

      // 2. Retrieve top chunks (6 by default, ADR-0002).
      const chunks = await deps.search.retrieve(parsed.question, 6);

      // 3. Assemble prompt under the 16K token budget.
      const built = buildPrompt({
        systemPrompt: deps.systemPrompt,
        chunks,
        history: parsed.history ?? [],
        question: parsed.question,
        budgetTokens: deps.config.contextBudgetTokens,
      });

      // 4. Completion.
      const { text } = await deps.completion.complete(built.prompt);

      // 5. Build + validate the response contract (source_document mandatory).
      const response = QueryResponseSchema.parse(buildQueryResponse(text, built.usedChunks));

      logger.info(
        {
          route: "query",
          durationMs: Date.now() - start,
          chunks: built.usedChunks.length,
          totalTokens: built.totalTokens,
          confidence: response.confidence,
        },
        "query handled",
      );

      return { status: 200, jsonBody: response };
    } catch (err) {
      return toErrorResponse(err, start);
    }
  };
}

function toErrorResponse(err: unknown, start: number): HttpResponseInit {
  if (err instanceof z.ZodError) {
    logger.warn({ route: "query", issues: err.issues }, "validation failed");
    return { status: 400, jsonBody: { error: "input inválido", code: "VALIDATION_ERROR" } };
  }
  if (isAppError(err)) {
    logger.warn({ route: "query", code: err.code }, err.message);
    return { status: err.status, jsonBody: { error: err.message, code: err.code } };
  }
  const e = err as AppError;
  logger.error({ route: "query", durationMs: Date.now() - start, err: String(e) }, "unhandled");
  return { status: 500, jsonBody: { error: "erro interno", code: "INTERNAL_ERROR" } };
}
