"""Context builder — assembles the full prompt respecting token budget and discard rules."""

from dataclasses import dataclass, field
from pathlib import Path

from src.orchestrator.prompt_loader import load_prompt
from src.orchestrator.reorderer import Chunk, reorder_v_shape
from src.orchestrator.token_budget import count_tokens

_CEILING = 16_000
_GUARDRAILS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts" / "guardrails"


@dataclass
class SessionState:
    history: list[str] = field(default_factory=list)
    entity_summary: str = ""


@dataclass
class BudgetReport:
    system_tokens: int
    chunks_tokens: int
    history_tokens: int
    query_tokens: int
    total: int
    ceiling: int


@dataclass
class ContextPayload:
    system_prompt: str
    context_body: str
    user_query: str
    total_tokens: int
    discarded_items: list[str]
    budget_report: BudgetReport


def _load_guardrails() -> str:
    """Load all guardrail files and concatenate."""
    guardrails = []
    if _GUARDRAILS_DIR.exists():
        for f in sorted(_GUARDRAILS_DIR.glob("*.md")):
            if f.name == ".gitkeep":
                continue
            guardrails.append(f.read_text(encoding="utf-8").strip())
    return "\n\n".join(guardrails)


def build_context(
    query: str,
    session_state: SessionState,
    retrieved_chunks: list[Chunk],
    prompt_slug: str = "base",
    prompt_version: int | None = None,
) -> ContextPayload:
    """Build the full context payload respecting the 16K token budget.

    Discard order on overflow:
    1. History (oldest first)
    2. Chunks (lowest score first)
    Never discard: system_prompt + guardrails, query
    """
    discarded: list[str] = []

    # Load system prompt + guardrails (never truncated)
    system_text = load_prompt(prompt_slug, version=prompt_version)
    guardrails_text = _load_guardrails()
    system_prompt = f"{system_text}\n\n{guardrails_text}"
    system_tokens = count_tokens(system_prompt)

    # Query (never truncated)
    query_tokens = count_tokens(query)

    # Fixed budget consumed
    fixed_tokens = system_tokens + query_tokens
    remaining = _CEILING - fixed_tokens

    # Reorder chunks in V-shape
    reordered = reorder_v_shape(retrieved_chunks)

    # Try to fit history
    history_parts: list[str] = []
    history_tokens = 0
    for msg in session_state.history:
        msg_tokens = count_tokens(msg)
        if history_tokens + msg_tokens <= min(2000, remaining):
            history_parts.append(msg)
            history_tokens += msg_tokens
        else:
            discarded.append(f"history:{msg[:50]}...")
            break

    remaining -= history_tokens

    # Fit chunks (discard lowest score first = from the end of reordered on overflow)
    chunk_parts: list[str] = []
    chunks_tokens = 0
    # Track which chunks fit
    for chunk in reordered:
        if chunks_tokens + chunk.tokens <= remaining:
            chunk_parts.append(f"[{chunk.source}] {chunk.content}")
            chunks_tokens += chunk.tokens
        else:
            discarded.append(f"chunk:{chunk.id}(score={chunk.score})")

    remaining -= chunks_tokens

    # Assemble context body
    context_body = "\n\n".join(chunk_parts)
    if history_parts:
        context_body = context_body + "\n\n--- Histórico ---\n" + "\n".join(history_parts)

    total_tokens = system_tokens + chunks_tokens + history_tokens + query_tokens

    budget_report = BudgetReport(
        system_tokens=system_tokens,
        chunks_tokens=chunks_tokens,
        history_tokens=history_tokens,
        query_tokens=query_tokens,
        total=total_tokens,
        ceiling=_CEILING,
    )

    return ContextPayload(
        system_prompt=system_prompt,
        context_body=context_body,
        user_query=query,
        total_tokens=total_tokens,
        discarded_items=discarded,
        budget_report=budget_report,
    )
