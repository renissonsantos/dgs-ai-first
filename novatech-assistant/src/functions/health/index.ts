// Azure Functions v4 registration for the health endpoint (the only app.http here).
import { app } from "@azure/functions";
import { createHealthHandler, type HealthCheck } from "./handler.js";

// Local phase: a liveness check that always passes. In production, add readiness checks
// for Azure AI Search and Azure OpenAI (each behind its service interface).
const checks: HealthCheck[] = [{ name: "self", check: async () => true }];

const handler = createHealthHandler({ checks, startedAt: Date.now() });

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler,
});
