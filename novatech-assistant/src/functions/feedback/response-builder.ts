// Pure response builder for the feedback endpoint (no I/O).
import type { SavedFeedback } from "../../services/feedback-store.js";
import type { FeedbackOutputDto } from "./validator.js";

export function buildFeedbackResponse(saved: SavedFeedback): FeedbackOutputDto {
  return { status: "registrado", feedbackId: saved.id };
}
