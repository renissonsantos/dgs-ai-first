// Environment configuration, validated once with Zod.
// Secrets live here only — handlers and services receive config, never read process.env.
// In this local phase external endpoints are optional (services run as stubs).
import { z } from "zod";

const ConfigSchema = z.object({
  searchEndpoint: z.string().url().optional(),
  searchKey: z.string().optional(),
  openaiEndpoint: z.string().url().optional(),
  openaiKey: z.string().optional(),
  /** Hard input budget per query in tokens (ADR-0002). */
  contextBudgetTokens: z.coerce.number().int().positive().default(16_000),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return ConfigSchema.parse({
    searchEndpoint: env.SEARCH_ENDPOINT,
    searchKey: env.SEARCH_KEY,
    openaiEndpoint: env.OPENAI_ENDPOINT,
    openaiKey: env.OPENAI_KEY,
    contextBudgetTokens: env.CONTEXT_BUDGET_TOKENS,
  });
}
