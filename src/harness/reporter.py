"""Reporter — generates adherence reports from evaluation results."""

from dataclasses import dataclass


@dataclass
class EvaluationResult:
    test_case_id: str
    prompt_version: str
    response_text: str
    criteria_scores: dict[str, float]
    overall_adherence: float
    blocked_by_filter: bool = False
    filter_reason: str | None = None


@dataclass
class SuiteSummary:
    total_cases: int
    adherence_by_criterion: dict[str, float]
    overall_adherence: float
    blocked_count: int


def generate_report(results: list[EvaluationResult]) -> SuiteSummary:
    """Aggregate evaluation results into a suite summary with adherence rates.

    Adherence per criterion = sum of scores / total cases (percentage).
    """
    if not results:
        return SuiteSummary(
            total_cases=0,
            adherence_by_criterion={},
            overall_adherence=0.0,
            blocked_count=0,
        )

    total = len(results)
    blocked = sum(1 for r in results if r.blocked_by_filter)

    # Collect all criteria across results
    all_criteria: set[str] = set()
    for r in results:
        all_criteria.update(r.criteria_scores.keys())

    # Calculate adherence per criterion
    adherence_by_criterion: dict[str, float] = {}
    for criterion in sorted(all_criteria):
        scores = [r.criteria_scores.get(criterion, 0.0) for r in results]
        adherence_by_criterion[criterion] = sum(scores) / total

    # Overall adherence
    overall = sum(r.overall_adherence for r in results) / total

    return SuiteSummary(
        total_cases=total,
        adherence_by_criterion=adherence_by_criterion,
        overall_adherence=overall,
        blocked_count=blocked,
    )
