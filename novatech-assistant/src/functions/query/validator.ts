// Zod schemas for the query endpoint. Input AND output are validated
// (AGENTS.md § Coding Standards, rule 1).
import { z } from "zod";

export const QueryRequestSchema = z.object({
  question: z.string().min(1, "question is required").max(2_000),
  sessionId: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional(),
});

export const QueryResponseSchema = z.object({
  answer: z.string().min(1),
  source_document: z.string().min(1, "source_document is mandatory"),
  confidence: z.enum(["alta", "media", "baixa"]),
  low_confidence_warning: z.string().optional(),
});

export type QueryRequestInput = z.infer<typeof QueryRequestSchema>;
