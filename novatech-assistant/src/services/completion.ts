// Completion service. Production impl wraps Azure OpenAI (GPT-4o); handlers depend on the
// CompletionService INTERFACE, never on the SDK (AGENTS.md § Coding Standards, rule 4).

export interface CompletionResult {
  text: string;
}

export interface CompletionService {
  complete(prompt: string): Promise<CompletionResult>;
}

/**
 * Local-phase stub: echoes a deterministic answer derived from the prompt.
 * Swapped for an AzureOpenAiCompletionService in production (same interface).
 */
export class StubCompletionService implements CompletionService {
  constructor(private readonly canned: (prompt: string) => string) {}

  async complete(prompt: string): Promise<CompletionResult> {
    return { text: this.canned(prompt) };
  }
}
