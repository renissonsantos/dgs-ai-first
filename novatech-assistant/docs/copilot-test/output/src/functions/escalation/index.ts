// Azure Functions v4 registration for the escalation endpoint (the only app.http here).
import { app } from "@azure/functions";
import { InMemoryEscalationStore } from "../../services/escalation-store.js";
import { createEscalationHandler } from "./handler.js";

const handler = createEscalationHandler({ store: new InMemoryEscalationStore() });

app.http("escalation", {
  methods: ["POST"],
  authLevel: "function",
  route: "escalation",
  handler,
});
