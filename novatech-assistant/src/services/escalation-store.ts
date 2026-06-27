// Escalation persistence behind an interface so handlers stay testable and network-free.

export interface EscalationInput {
  queryId: string;
  reason: string;
  attendantId: string;
}

export interface SavedEscalation extends EscalationInput {
  id: string;
}

export interface EscalationStore {
  save(input: EscalationInput): Promise<SavedEscalation>;
}

/** Local-phase store: keeps escalations in memory with a deterministic id counter. */
export class InMemoryEscalationStore implements EscalationStore {
  private seq = 0;
  private readonly items: SavedEscalation[] = [];

  async save(input: EscalationInput): Promise<SavedEscalation> {
    const saved: SavedEscalation = { ...input, id: `esc-${++this.seq}` };
    this.items.push(saved);
    return saved;
  }

  /** Test/inspection helper. */
  all(): readonly SavedEscalation[] {
    return this.items;
  }
}
