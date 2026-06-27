// Azure Functions v4 registration for the feedback endpoint (the only app.http here).
import { app } from "@azure/functions";
import { InMemoryFeedbackStore } from "../../services/feedback-store.js";
import { createFeedbackHandler } from "./handler.js";

const handler = createFeedbackHandler({ store: new InMemoryFeedbackStore() });

app.http("feedback", {
  methods: ["POST"],
  authLevel: "function",
  route: "feedback",
  handler,
});
