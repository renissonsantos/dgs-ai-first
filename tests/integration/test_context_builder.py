"""Integration tests for src/orchestrator/context_builder.py."""

import pytest

from src.orchestrator.context_builder import SessionState, build_context
from src.orchestrator.reorderer import Chunk
from src.orchestrator.token_budget import count_tokens


def _make_chunks(n: int, tokens_each: int = 100) -> list[Chunk]:
    """Create n chunks with decreasing scores."""
    return [
        Chunk(
            id=f"chunk-{i:03d}",
            content="x " * (tokens_each // 2),  # rough approximation
            source=f"DOC-{i:03d}",
            domain="test",
            score=1.0 - i * 0.05,
            tokens=tokens_each,
        )
        for i in range(n)
    ]


class TestBuildContext:
    def test_total_under_ceiling(self):
        chunks = _make_chunks(5, tokens_each=500)
        session = SessionState(history=["Pergunta anterior", "Resposta anterior"])
        result = build_context(
            query="Qual é o SLA Gold?",
            session_state=session,
            retrieved_chunks=chunks,
            prompt_version=1,
        )
        assert result.total_tokens <= 16_000
        assert result.budget_report.ceiling == 16_000

    def test_system_never_truncated(self):
        chunks = _make_chunks(5, tokens_each=500)
        session = SessionState()
        result = build_context(
            query="Teste",
            session_state=session,
            retrieved_chunks=chunks,
            prompt_version=1,
        )
        # System prompt should contain the base prompt content
        assert "assistente de atendimento" in result.system_prompt.lower()
        assert "NovaTech" in result.system_prompt
        # Guardrails should be included
        assert "citação" in result.system_prompt.lower() or "cite" in result.system_prompt.lower()

    def test_query_always_at_end(self):
        chunks = _make_chunks(3, tokens_each=200)
        session = SessionState()
        query_text = "Pergunta específica do atendente"
        result = build_context(
            query=query_text,
            session_state=session,
            retrieved_chunks=chunks,
            prompt_version=1,
        )
        assert result.user_query == query_text

    def test_discard_on_overflow(self):
        # Create many large chunks to force overflow
        chunks = _make_chunks(30, tokens_each=600)
        session = SessionState(
            history=["Msg " + str(i) + " " * 100 for i in range(20)]
        )
        result = build_context(
            query="Teste de overflow",
            session_state=session,
            retrieved_chunks=chunks,
            prompt_version=1,
        )
        # Should still be under ceiling
        assert result.total_tokens <= 16_000
        # Should have discarded items
        assert len(result.discarded_items) > 0

    def test_budget_report_parts_sum(self):
        chunks = _make_chunks(3, tokens_each=200)
        session = SessionState(history=["Olá"])
        result = build_context(
            query="Teste",
            session_state=session,
            retrieved_chunks=chunks,
            prompt_version=1,
        )
        report = result.budget_report
        assert report.total == (
            report.system_tokens + report.chunks_tokens + report.history_tokens + report.query_tokens
        )

    def test_empty_chunks_and_history(self):
        result = build_context(
            query="Pergunta simples",
            session_state=SessionState(),
            retrieved_chunks=[],
            prompt_version=1,
        )
        assert result.total_tokens > 0
        assert result.budget_report.chunks_tokens == 0
        assert result.budget_report.history_tokens == 0
