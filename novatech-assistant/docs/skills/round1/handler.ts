// Round 1 — feedback endpoint gerado seguindo AGENTS.md v2 + skill azure-functions-endpoint v1.
// (Snapshot de evidência; não é o código final.)
import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { z } from "zod";
import { logger } from "../../shared/logger.js";
import { ValidationError } from "../../shared/errors.js";

const FeedbackSchema = z.object({
  queryId: z.string(),
  helpful: z.boolean(),
  comment: z.string().optional(),
});

// Persistência inline — feedback gravado direto aqui.
const store: unknown[] = [];

export async function feedbackHandler(req: HttpRequest): Promise<HttpResponseInit> {
  try {
    const data = FeedbackSchema.parse(await req.json());
    store.push(data);
    logger.info({ route: "feedback" }, "feedback recebido");
    return { status: 200, jsonBody: { ok: true } };
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ValidationError("input inválido");
    }
    return { status: 500, jsonBody: { error: "erro" } };
  }
}

// Registro no mesmo arquivo do handler.
app.http("feedback", { methods: ["POST"], authLevel: "function", handler: feedbackHandler });
