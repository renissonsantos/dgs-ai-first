// Prompt assembly with deterministic token accounting (ADR-0002 / AGENTS.md).
// Hard input ceiling: 16K tokens. On overflow, drop oldest history first, then the
// lowest-score chunks. System prompt/guardrails and the question are NEVER truncated.
import type { ConversationTurn, RetrievedChunk } from "../shared/types.js";

/** Cheap deterministic token estimate (~4 chars/token). Good enough for budgeting. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface BuildPromptInput {
  systemPrompt: string;
  chunks: RetrievedChunk[];
  history: ConversationTurn[];
  question: string;
  budgetTokens?: number;
}

export interface BuiltPrompt {
  prompt: string;
  totalTokens: number;
  usedChunks: RetrievedChunk[];
  droppedChunks: number;
  droppedTurns: number;
}

const DEFAULT_BUDGET = 16_000;

export function buildPrompt(input: BuildPromptInput): BuiltPrompt {
  const budget = input.budgetTokens ?? DEFAULT_BUDGET;

  // System prompt + question are mandatory and never truncated.
  const systemTokens = estimateTokens(input.systemPrompt);
  const questionTokens = estimateTokens(input.question);
  let remaining = budget - systemTokens - questionTokens;
  if (remaining < 0) {
    // Pathological: even the static parts exceed the budget. Keep them anyway,
    // budget is a ceiling for dynamic content, not for the mandatory parts.
    remaining = 0;
  }

  // History: keep the most recent turns that fit (drop oldest first).
  const history = [...input.history];
  let droppedTurns = 0;
  while (history.length > 0 && tokensOf(history) > Math.min(remaining, 2_000)) {
    history.shift();
    droppedTurns++;
  }
  remaining -= tokensOf(history);

  // Chunks: keep highest-score chunks that fit (drop lowest score first).
  const chunks = [...input.chunks].sort((a, b) => b.score - a.score);
  let droppedChunks = 0;
  while (chunks.length > 0 && estimateTokens(renderChunks(chunks)) > Math.max(remaining, 0)) {
    chunks.pop();
    droppedChunks++;
  }

  // Anti lost-in-the-middle: highest scores at the edges, lowest in the middle.
  const ordered = orderForAttention(chunks);

  const prompt = [
    input.systemPrompt,
    renderChunks(ordered),
    renderHistory(history),
    `PERGUNTA: ${input.question}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    prompt,
    totalTokens: estimateTokens(prompt),
    usedChunks: ordered,
    droppedChunks,
    droppedTurns,
  };
}

function tokensOf(turns: ConversationTurn[]): number {
  return estimateTokens(renderHistory(turns));
}

function renderHistory(turns: ConversationTurn[]): string {
  if (turns.length === 0) return "";
  return ["HISTÓRICO:", ...turns.map((t) => `${t.role}: ${t.content}`)].join("\n");
}

function renderChunks(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  return [
    "FONTES:",
    ...chunks.map((c) => `[${c.sourceDocument}] ${c.content}`),
  ].join("\n");
}

/** Reorder so the strongest chunks sit at the start and end (primacy + recency). */
function orderForAttention(sortedByScore: RetrievedChunk[]): RetrievedChunk[] {
  const head: RetrievedChunk[] = [];
  const tail: RetrievedChunk[] = [];
  sortedByScore.forEach((chunk, i) => (i % 2 === 0 ? head.push(chunk) : tail.unshift(chunk)));
  return [...head, ...tail];
}
