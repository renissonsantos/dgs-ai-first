// Zod schemas for the feedback endpoint — input AND output (skill azure-functions-endpoint).
import { z } from "zod";

export const FeedbackInputSchema = z.object({
  queryId: z.string().min(1),
  helpful: z.boolean(),
  comment: z.string().max(1_000).optional(),
});

export const FeedbackOutputSchema = z.object({
  status: z.literal("registrado"),
  feedbackId: z.string().min(1),
});

export type FeedbackInputDto = z.infer<typeof FeedbackInputSchema>;
export type FeedbackOutputDto = z.infer<typeof FeedbackOutputSchema>;
