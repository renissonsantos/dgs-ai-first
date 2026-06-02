"""Comparator — compares evaluation results between prompt versions."""

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

from src.harness.runner import HarnessConfig, run_test_suite


@dataclass
class ComparisonReport:
    prompt_a: str
    prompt_b: str
    delta_by_criterion: dict[str, float]
    overall_delta: float
    regressions: list[str]
    improvements: list[str]


def compare(suite_a, suite_b) -> ComparisonReport:
    """Compare two suite results to identify improvement/degradation.

    Positive delta means B is better than A.
    """
    # Delta by criterion
    delta_by_criterion: dict[str, float] = {}
    all_criteria = set(suite_a.summary.adherence_by_criterion.keys()) | set(
        suite_b.summary.adherence_by_criterion.keys()
    )
    for criterion in sorted(all_criteria):
        a_val = suite_a.summary.adherence_by_criterion.get(criterion, 0.0)
        b_val = suite_b.summary.adherence_by_criterion.get(criterion, 0.0)
        delta_by_criterion[criterion] = b_val - a_val

    overall_delta = suite_b.summary.overall_adherence - suite_a.summary.overall_adherence

    # Per-case comparison
    a_by_id = {r.test_case_id: r for r in suite_a.results}
    b_by_id = {r.test_case_id: r for r in suite_b.results}

    regressions: list[str] = []
    improvements: list[str] = []

    for tc_id in a_by_id:
        if tc_id in b_by_id:
            a_score = a_by_id[tc_id].overall_adherence
            b_score = b_by_id[tc_id].overall_adherence
            if b_score < a_score:
                regressions.append(tc_id)
            elif b_score > a_score:
                improvements.append(tc_id)

    return ComparisonReport(
        prompt_a=suite_a.prompt_version,
        prompt_b=suite_b.prompt_version,
        delta_by_criterion=delta_by_criterion,
        overall_delta=overall_delta,
        regressions=regressions,
        improvements=improvements,
    )


def main():
    parser = argparse.ArgumentParser(description="Compare two prompt versions")
    parser.add_argument("--prompt-a", required=True, help="First prompt slug-version")
    parser.add_argument("--prompt-b", required=True, help="Second prompt slug-version")
    parser.add_argument("--test-cases", required=True, help="Path to test_cases.json")
    parser.add_argument("--chunks", default=None, help="Path to sample_chunks.json")
    args = parser.parse_args()

    # Load test cases
    with open(args.test_cases, encoding="utf-8") as f:
        test_cases = json.load(f)

    chunks_data = None
    if args.chunks:
        with open(args.chunks, encoding="utf-8") as f:
            chunks_data = json.load(f)

    config = HarnessConfig(
        endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", ""),
        api_key=os.environ.get("AZURE_OPENAI_API_KEY", ""),
        deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-2024-05-13"),
    )

    if not config.endpoint or not config.api_key:
        print("ERROR: AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY must be set.")
        sys.exit(1)

    print(f"Running suite A: {args.prompt_a}...")
    suite_a = run_test_suite(args.prompt_a, test_cases, config, chunks_data)

    print(f"Running suite B: {args.prompt_b}...")
    suite_b = run_test_suite(args.prompt_b, test_cases, config, chunks_data)

    report = compare(suite_a, suite_b)

    print(f"\n{'='*60}")
    print(f"Comparison: {report.prompt_a} → {report.prompt_b}")
    print(f"{'='*60}")
    print("\nDelta by criterion (positive = B better):")
    for criterion, delta in report.delta_by_criterion.items():
        indicator = "↑" if delta > 0 else "↓" if delta < 0 else "="
        print(f"  {criterion}: {delta:+.1%} {indicator}")
    print(f"\nOverall delta: {report.overall_delta:+.1%}")
    print(f"Regressions: {report.regressions or 'None'}")
    print(f"Improvements: {report.improvements or 'None'}")


if __name__ == "__main__":
    main()
