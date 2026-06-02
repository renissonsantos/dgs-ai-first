"""Unit tests for src/orchestrator/token_budget.py."""

import pytest

from src.orchestrator.token_budget import BudgetResult, count_tokens, fits_budget


class TestCountTokens:
    def test_empty_string(self):
        assert count_tokens("") == 0

    def test_simple_english(self):
        result = count_tokens("Hello world")
        assert result > 0
        assert isinstance(result, int)

    def test_portuguese_text(self):
        result = count_tokens("Qual é o prazo para devolução de produtos?")
        assert result > 0

    def test_deterministic(self):
        text = "O SLA Gold tem resposta em até 2 horas."
        assert count_tokens(text) == count_tokens(text)

    def test_longer_text_more_tokens(self):
        short = "Olá"
        long = "O cálculo de frete especial para cargas acima de 500kg aplica multiplicador regional."
        assert count_tokens(long) > count_tokens(short)


class TestFitsBudget:
    def test_under_ceiling(self):
        parts = {"system": "System prompt", "query": "What is SLA?"}
        result = fits_budget(parts, ceiling=100)
        assert result.fits is True
        assert result.overflow == 0
        assert result.total > 0
        assert "system" in result.per_part
        assert "query" in result.per_part

    def test_over_ceiling(self):
        parts = {"system": "A" * 1000, "query": "B" * 1000}
        result = fits_budget(parts, ceiling=10)
        assert result.fits is False
        assert result.overflow > 0
        assert result.total == result.per_part["system"] + result.per_part["query"]

    def test_at_ceiling(self):
        text = "Hello"
        tokens = count_tokens(text)
        parts = {"only": text}
        result = fits_budget(parts, ceiling=tokens)
        assert result.fits is True
        assert result.overflow == 0
        assert result.total == tokens

    def test_per_part_sum_equals_total(self):
        parts = {
            "system": "System prompt com instruções",
            "chunks": "Chunk 1. Chunk 2. Chunk 3.",
            "query": "Pergunta do atendente",
        }
        result = fits_budget(parts, ceiling=16000)
        assert result.total == sum(result.per_part.values())

    def test_returns_budget_result(self):
        result = fits_budget({"a": "test"}, ceiling=100)
        assert isinstance(result, BudgetResult)
