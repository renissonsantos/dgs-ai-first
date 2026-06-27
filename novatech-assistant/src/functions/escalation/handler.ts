// HTTP trigger for the escalation endpoint (Azure Functions v4).
// Factory + DI per skill azure-functions-endpoint; app.http lives in index.ts only.
import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod";
import { logger } from "../../shared/logger.js";
import { ValidationError, isAppError } from "../../shared/errors.js";
import type { EscalationStore } from "../../services/escalation-store.js";
import { buildEscalationResponse } from "./response-builder.js";
import { EscalationInputSchema, EscalationOutputSchema } from "./validator.js";

export interface EscalationDeps {
  store: EscalationStore;
}

export function createEscalationHandler(deps: EscalationDeps) {
  return async function escalation(
    request: HttpRequest,
    _context?: InvocationContext,
  ): Promise<HttpResponseInit> {
    try {
      const raw = await request.json().catch(() => {
        throw new ValidationError("body inválido: JSON esperado");
      });
      const input = EscalationInputSchema.parse(raw);
      const saved = await deps.store.save(input);
      const body = EscalationOutputSchema.parse(buildEscalationResponse(saved));

      logger.info({ route: "escalation", escalationId: saved.id }, "case escalated");
      return { status: 201, jsonBody: body };
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

function toErrorResponse(err: unknown): HttpResponseInit {
  if (err instanceof z.ZodError) {
    logger.warn({ route: "escalation", issues: err.issues }, "validation failed");
    return { status: 400, jsonBody: { error: "input inválido", code: "VALIDATION_ERROR" } };
  }

  if (isAppError(err)) {
    logger.warn({ route: "escalation", code: err.code }, err.message);
    return { status: err.status, jsonBody: { error: err.message, code: err.code } };
  }

  logger.error({ route: "escalation", err: String(err) }, "unhandled");
  return { status: 500, jsonBody: { error: "erro interno", code: "INTERNAL_ERROR" } };
}
