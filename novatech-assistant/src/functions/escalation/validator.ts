// Zod schemas for the escalation endpoint — input AND output.
import { z } from "zod";

export const EscalationInputSchema = z.object({
  queryId: z.string().min(1),
  reason: z.string().min(1).max(1_000),
  attendantId: z.string().min(1),
});

export const EscalationOutputSchema = z.object({
  status: z.literal("escalado"),
  escalationId: z.string().min(1),
});

export type EscalationInputDto = z.infer<typeof EscalationInputSchema>;
export type EscalationOutputDto = z.infer<typeof EscalationOutputSchema>;
