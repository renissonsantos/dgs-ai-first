"""Unit tests for src/enforcement/hallucination_filter.py."""

import pytest

from src.enforcement.hallucination_filter import FilterResult, check


class TestHallucinationFilter:
    def test_pass_with_valid_tier_gold(self):
        response = "O tier Gold oferece resposta em até 2 horas."
        result = check(response, {"tiers": ["Gold", "Silver", "Standard"]})
        assert result.passed is True
        assert result.reason is None
        assert result.violations == []

    def test_fail_with_platinum(self):
        response = "O tier Platinum oferece atendimento prioritário em até 30 minutos."
        result = check(response, {"tiers": ["Gold", "Silver", "Standard"]})
        assert result.passed is False
        assert "platinum" in result.violations
        assert "invented_tier" in result.reason

    def test_fail_with_multiple_violations(self):
        response = "Os tiers Platinum e Diamond são os mais exclusivos da NovaTech."
        result = check(response, {"tiers": ["Gold", "Silver", "Standard"]})
        assert result.passed is False
        assert len(result.violations) >= 2
        assert "platinum" in result.violations
        assert "diamond" in result.violations

    def test_pass_with_all_valid_tiers(self):
        response = "Os tiers disponíveis são Gold, Silver e Standard."
        result = check(response, {"tiers": ["Gold", "Silver", "Standard"]})
        assert result.passed is True

    def test_pass_with_no_tier_mention(self):
        response = "O prazo de entrega é de 3 dias úteis."
        result = check(response, {"tiers": ["Gold", "Silver", "Standard"]})
        assert result.passed is True

    def test_case_insensitive_detection(self):
        response = "O PLATINUM tem vantagens exclusivas."
        result = check(response, {"tiers": ["Gold", "Silver", "Standard"]})
        assert result.passed is False

    def test_returns_filter_result(self):
        result = check("teste", {"tiers": ["Gold"]})
        assert isinstance(result, FilterResult)
