// Pure response builder for the health endpoint (no I/O).
import type { HealthOutputDto } from "./validator.js";

export interface CheckResult {
  name: string;
  ok: boolean;
}

export function buildHealthResponse(checks: CheckResult[], uptimeMs: number): HealthOutputDto {
  const status = checks.every((c) => c.ok) ? "ok" : "degraded";
  return { status, uptimeMs, checks };
}
