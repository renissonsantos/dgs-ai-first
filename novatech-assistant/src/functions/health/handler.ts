// HTTP trigger for the health endpoint (Azure Functions v4, GET).
// Factory + DI per skill azure-functions-endpoint; app.http lives in index.ts only.
// Returns 200 when every dependency check passes, 503 when any is degraded.
import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { logger } from "../../shared/logger.js";
import { HealthOutputSchema } from "./validator.js";
import { buildHealthResponse, type CheckResult } from "./response-builder.js";

export interface HealthCheck {
  name: string;
  /** Resolves true when the dependency is reachable/healthy. Must not throw. */
  check(): Promise<boolean>;
}

export interface HealthDeps {
  checks: HealthCheck[];
  /** Epoch ms when the app started; used to compute uptime. */
  startedAt: number;
  /** Injectable clock for deterministic tests; defaults to Date.now. */
  now?: () => number;
}

export function createHealthHandler(deps: HealthDeps) {
  return async function health(
    _request: HttpRequest,
    _context?: InvocationContext,
  ): Promise<HttpResponseInit> {
    const now = deps.now ?? Date.now;
    try {
      const results: CheckResult[] = await Promise.all(
        deps.checks.map(async (c) => ({
          name: c.name,
          // A check that rejects is treated as a failed dependency, not a 500.
          ok: await c.check().catch(() => false),
        })),
      );

      const body = HealthOutputSchema.parse(buildHealthResponse(results, now() - deps.startedAt));
      const httpStatus = body.status === "ok" ? 200 : 503;
      logger.info({ route: "health", status: body.status }, "health checked");
      return { status: httpStatus, jsonBody: body };
    } catch (err) {
      logger.error({ route: "health", err: String(err) }, "unhandled");
      return { status: 500, jsonBody: { error: "erro interno", code: "INTERNAL_ERROR" } };
    }
  };
}
