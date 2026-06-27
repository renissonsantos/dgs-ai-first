// Zod schema for the health endpoint. GET has no input, so only the OUTPUT is validated
// (skill azure-functions-endpoint, rule 4 — output validation still applies).
import { z } from "zod";

export const HealthOutputSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  uptimeMs: z.number().int().nonnegative(),
  checks: z.array(
    z.object({
      name: z.string().min(1),
      ok: z.boolean(),
    }),
  ),
});

export type HealthOutputDto = z.infer<typeof HealthOutputSchema>;
