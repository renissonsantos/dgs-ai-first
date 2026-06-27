// Pure response builder for the escalation endpoint (no I/O).
import type { SavedEscalation } from "../../services/escalation-store.js";
import type { EscalationOutputDto } from "./validator.js";

export function buildEscalationResponse(saved: SavedEscalation): EscalationOutputDto {
  return { status: "escalado", escalationId: saved.id };
}
