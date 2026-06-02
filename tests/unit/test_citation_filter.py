"""Unit tests for src/enforcement/citation_filter.py."""

import pytest

from src.enforcement.citation_filter import FilterResult, check


class TestCitationFilter:
    def test_pass_with_valid_citation(self):
        response = "Conforme SLA-2024, o tier Gold tem resposta em até 2 horas."
        result = check(response, ["SLA-2024"])
        assert result.passed is True
        assert result.reason is None
        assert "SLA-2024" in result.citations_found

    def test_fail_without_citation(self):
        response = "O tier Gold tem resposta em até 2 horas para qualquer solicitação."
        result = check(response, ["SLA-2024"])
        assert result.passed is False
        assert result.reason == "missing_citation"
        assert result.citations_found == []

    def test_pass_with_partial_citation(self):
        # Source mentioned but not in a formal pattern
        response = "De acordo com o documento SLA-2024, os prazos são definidos por tier."
        result = check(response, ["SLA-2024"])
        assert result.passed is True
        assert "SLA-2024" in result.citations_found

    def test_pass_with_multiple_sources(self):
        response = "Conforme POL-001 e SLA-2024, as políticas se complementam."
        result = check(response, ["POL-001", "SLA-2024"])
        assert result.passed is True
        assert len(result.citations_found) == 2

    def test_pass_with_at_least_one_source(self):
        response = "Segundo o SLA-2024, o prazo é de 2 horas."
        result = check(response, ["SLA-2024", "POL-001"])
        assert result.passed is True
        assert "SLA-2024" in result.citations_found

    def test_case_insensitive(self):
        response = "conforme sla-2024, o prazo é de 2h."
        result = check(response, ["SLA-2024"])
        assert result.passed is True

    def test_returns_filter_result(self):
        result = check("teste", ["DOC-001"])
        assert isinstance(result, FilterResult)
