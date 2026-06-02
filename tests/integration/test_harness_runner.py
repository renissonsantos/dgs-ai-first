"""Integration tests for the harness (evaluator + reporter + comparator).

These tests validate the harness pipeline without calling Azure OpenAI.
They test evaluator scoring, reporter aggregation, and comparator logic.
"""

import pytest

from src.harness.evaluator import check_citation, check_no_forbidden_terms, check_no_hallucination
from src.harness.reporter import EvaluationResult, generate_report
from src.harness.comparator import compare
from src.harness.runner import SuiteResult


class TestEvaluatorIntegration:
    def test_citation_found(self):
        response = "Conforme SLA-2024, o tier Gold tem resposta em 2h."
        score = check_citation(response, ["SLA-2024"])
        assert score == 1.0

    def test_citation_missing(self):
        response = "O tier Gold tem resposta em 2h."
        score = check_citation(response, ["SLA-2024"])
        assert score == 0.0

    def test_no_hallucination_clean(self):
        response = "Os tiers disponíveis são Gold, Silver e Standard."
        score = check_no_hallucination(response, {"tiers": ["Gold", "Silver", "Standard"]})
        assert score == 1.0

    def test_hallucination_detected(self):
        response = "O tier Platinum oferece atendimento prioritário."
        score = check_no_hallucination(response, {"tiers": ["Gold", "Silver", "Standard"]})
        assert score == 0.0

    def test_no_forbidden_terms_clean(self):
        response = "O SLA Gold garante resposta em 2 horas."
        score = check_no_forbidden_terms(response, ["Platinum", "Diamond"])
        assert score == 1.0

    def test_forbidden_term_found(self):
        response = "O tier Platinum tem prioridade máxima."
        score = check_no_forbidden_terms(response, ["Platinum"])
        assert score == 0.0


class TestReporterIntegration:
    def _make_result(self, tc_id: str, citation: float, hallucination: float, forbidden: float) -> EvaluationResult:
        scores = {
            "citation": citation,
            "no_hallucination": hallucination,
            "no_forbidden_terms": forbidden,
        }
        overall = sum(scores.values()) / len(scores)
        return EvaluationResult(
            test_case_id=tc_id,
            prompt_version="base-v001",
            response_text="fake",
            criteria_scores=scores,
            overall_adherence=overall,
        )

    def test_perfect_adherence(self):
        results = [
            self._make_result("TC-001", 1.0, 1.0, 1.0),
            self._make_result("TC-002", 1.0, 1.0, 1.0),
        ]
        summary = generate_report(results)
        assert summary.total_cases == 2
        assert summary.overall_adherence == 1.0
        assert summary.adherence_by_criterion["citation"] == 1.0
        assert summary.adherence_by_criterion["no_hallucination"] == 1.0

    def test_partial_adherence(self):
        results = [
            self._make_result("TC-001", 1.0, 1.0, 1.0),
            self._make_result("TC-002", 0.0, 1.0, 0.0),
        ]
        summary = generate_report(results)
        assert summary.adherence_by_criterion["citation"] == 0.5
        assert summary.adherence_by_criterion["no_forbidden_terms"] == 0.5
        assert summary.adherence_by_criterion["no_hallucination"] == 1.0

    def test_empty_results(self):
        summary = generate_report([])
        assert summary.total_cases == 0
        assert summary.overall_adherence == 0.0

    def test_scores_between_0_and_1(self):
        results = [
            self._make_result("TC-001", 1.0, 0.0, 1.0),
            self._make_result("TC-002", 0.0, 1.0, 1.0),
            self._make_result("TC-003", 1.0, 1.0, 0.0),
        ]
        summary = generate_report(results)
        for rate in summary.adherence_by_criterion.values():
            assert 0.0 <= rate <= 1.0
        assert 0.0 <= summary.overall_adherence <= 1.0


class TestComparatorIntegration:
    def _make_suite(self, version: str, results: list[EvaluationResult]) -> SuiteResult:
        summary = generate_report(results)
        return SuiteResult(
            prompt_version=version,
            model_version="gpt-4o-2024-05-13",
            results=results,
            summary=summary,
        )

    def _make_result(self, tc_id: str, version: str, overall: float) -> EvaluationResult:
        return EvaluationResult(
            test_case_id=tc_id,
            prompt_version=version,
            response_text="fake",
            criteria_scores={"citation": overall, "no_hallucination": overall, "no_forbidden_terms": overall},
            overall_adherence=overall,
        )

    def test_improvement(self):
        suite_a = self._make_suite("base-v001", [
            self._make_result("TC-001", "base-v001", 0.5),
            self._make_result("TC-002", "base-v001", 0.5),
        ])
        suite_b = self._make_suite("base-v002", [
            self._make_result("TC-001", "base-v002", 1.0),
            self._make_result("TC-002", "base-v002", 1.0),
        ])
        report = compare(suite_a, suite_b)
        assert report.overall_delta > 0
        assert "TC-001" in report.improvements
        assert "TC-002" in report.improvements
        assert report.regressions == []

    def test_regression(self):
        suite_a = self._make_suite("base-v001", [
            self._make_result("TC-001", "base-v001", 1.0),
        ])
        suite_b = self._make_suite("base-v002", [
            self._make_result("TC-001", "base-v002", 0.5),
        ])
        report = compare(suite_a, suite_b)
        assert report.overall_delta < 0
        assert "TC-001" in report.regressions

    def test_no_change(self):
        suite_a = self._make_suite("base-v001", [
            self._make_result("TC-001", "base-v001", 0.8),
        ])
        suite_b = self._make_suite("base-v002", [
            self._make_result("TC-001", "base-v002", 0.8),
        ])
        report = compare(suite_a, suite_b)
        assert report.overall_delta == 0.0
        assert report.regressions == []
        assert report.improvements == []
