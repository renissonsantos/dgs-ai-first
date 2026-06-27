// HTTP trigger for the feedback endpoint (Azure Functions v4).
// Factory + DI per skill azure-functions-endpoint; app.http lives in index.ts only.
import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod";
import { logger } from "../../shared/logger.js";
import { AppError, isAppError } from "../../shared/errors.js";
import type { FeedbackStore } from "../../services/feedback-store.js";
import { FeedbackInputSchema, FeedbackOutputSchema } from "./validator.js";
import { buildFeedbackResponse } from "./response-builder.js";

export interface FeedbackDeps {
  store: FeedbackStore;
}

export function createFeedbackHandler(deps: FeedbackDeps) {
  return async function feedback(
    request: HttpRequest,
    _context?: InvocationContext,
  ): Promise<HttpResponseInit> {
    try {
      const input = FeedbackInputSchema.parse(await request.json());
      const saved = await deps.store.save(input);
      const body = FeedbackOutputSchema.parse(buildFeedbackResponse(saved));
      logger.info({ route: "feedback", feedbackId: saved.id }, "feedback stored");
      return { status: 201, jsonBody: body };
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

function toErrorResponse(err: unknown): HttpResponseInit {
  if (err instanceof z.ZodError) {
    logger.warn({ route: "feedback", issues: err.issues }, "validation failed");
    return { status: 400, jsonBody: { error: "input inválido", code: "VALIDATION_ERROR" } };
  }
  if (isAppError(err)) {
    logger.warn({ route: "feedback", code: err.code }, err.message);
    return { status: err.status, jsonBody: { error: err.message, code: err.code } };
  }
  logger.error({ route: "feedback", err: String(err as AppError) }, "unhandled");
  return { status: 500, jsonBody: { error: "erro interno", code: "INTERNAL_ERROR" } };
}
