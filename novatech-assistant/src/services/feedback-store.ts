// Feedback persistence behind an interface (AGENTS.md rule 4 + skill azure-functions-endpoint).
// Production impl wraps Cosmos DB; the handler depends on FeedbackStore, never on the client.

export interface FeedbackInput {
  queryId: string;
  helpful: boolean;
  comment?: string;
}

export interface SavedFeedback extends FeedbackInput {
  id: string;
}

export interface FeedbackStore {
  save(input: FeedbackInput): Promise<SavedFeedback>;
}

/** Local-phase store: keeps feedback in memory with a deterministic id counter. */
export class InMemoryFeedbackStore implements FeedbackStore {
  private seq = 0;
  private readonly items: SavedFeedback[] = [];

  async save(input: FeedbackInput): Promise<SavedFeedback> {
    const saved: SavedFeedback = { ...input, id: `fb-${++this.seq}` };
    this.items.push(saved);
    return saved;
  }

  /** Test/inspection helper. */
  all(): readonly SavedFeedback[] {
    return this.items;
  }
}
