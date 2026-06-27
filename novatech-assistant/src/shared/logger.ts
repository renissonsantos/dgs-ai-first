// Structured logger (pino). The ONLY logging entry point in the codebase.
// console.log / console.error are forbidden (AGENTS.md § Coding Standards, rule 3).
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "novatech-assistant" },
});

export type Logger = typeof logger;
