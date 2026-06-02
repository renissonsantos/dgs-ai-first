"""Harness runner — executes test suites against the LLM and evaluates responses."""

import json
import os
import sys
import argparse
from dataclasses import dataclass
from pathlib import Path

from src.harness.evaluator import check_citation, check_no_forbidden_terms, check_no_hallucination
from src.harness.reporter import EvaluationResult, SuiteSummary, generate_report
from src.orchestrator.prompt_loader import load_prompt


@dataclass
class HarnessConfig:
    endpoint: str = ""
    api_key: str = ""
    deployment: str = ""
    temperature: float = 0.0
    max_tokens: int = 1000


@dataclass
class SuiteResult:
    prompt_version: str
    model_version: str
    results: list[EvaluationResult]
    summary: SuiteSummary


def _call_llm(prompt_content: str, question: str, chunks_text: str, config: HarnessConfig) -> str:
    """Call Azure OpenAI with the assembled prompt. Returns response text."""
    from openai import AzureOpenAI

    client = AzureOpenAI(
        azure_endpoint=config.endpoint,
        api_key=config.api_key,
        api_version="2024-02-01",
    )

    messages = [
        {"role": "system", "content": prompt_content},
        {"role": "user", "content": f"Documentação relevante:\n{chunks_text}\n\nPergunta: {question}"},
    ]

    response = client.chat.completions.create(
        model=config.deployment,
        messages=messages,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
    )

    return response.choices[0].message.content or ""


def run_test_suite(
    prompt_version: str,
    test_cases: list[dict],
    config: HarnessConfig,
    chunks_data: list[dict] | None = None,
) -> SuiteResult:
    """Execute all test cases against the LLM and evaluate responses.

    Args:
        prompt_version: Slug-version of the prompt (e.g., "base-v001")
        test_cases: List of test case dicts (from test_cases.json)
        config: Harness configuration
        chunks_data: Optional pre-loaded chunks for building context
    """
    # Parse slug and version
    parts = prompt_version.rsplit("-v", 1)
    slug = parts[0]
    version = int(parts[1]) if len(parts) > 1 else None

    prompt_content = load_prompt(slug, version=version)

    # Load chunks if provided
    chunks_by_id: dict[str, dict] = {}
    if chunks_data:
        chunks_by_id = {c["id"]: c for c in chunks_data}

    results: list[EvaluationResult] = []

    for tc in test_cases:
        # Build chunks text from reference_chunks
        ref_chunks = tc.get("reference_chunks", [])
        chunks_text = ""
        if chunks_by_id:
            chunk_contents = [
                f"[{chunks_by_id[cid]['source']}] {chunks_by_id[cid]['content']}"
                for cid in ref_chunks
                if cid in chunks_by_id
            ]
            chunks_text = "\n\n".join(chunk_contents)

        # Call LLM
        response_text = _call_llm(prompt_content, tc["question"], chunks_text, config)

        # Evaluate
        expected_sources = [tc.get("expected_source", "")]
        forbidden_terms = tc.get("forbidden_terms", [])
        valid_values = {"tiers": ["Gold", "Silver", "Standard"]}

        citation_score = check_citation(response_text, expected_sources)
        hallucination_score = check_no_hallucination(response_text, valid_values)
        forbidden_score = check_no_forbidden_terms(response_text, forbidden_terms)

        criteria_scores = {
            "citation": citation_score,
            "no_hallucination": hallucination_score,
            "no_forbidden_terms": forbidden_score,
        }
        overall = sum(criteria_scores.values()) / len(criteria_scores)

        results.append(EvaluationResult(
            test_case_id=tc["id"],
            prompt_version=prompt_version,
            response_text=response_text,
            criteria_scores=criteria_scores,
            overall_adherence=overall,
        ))

    summary = generate_report(results)

    return SuiteResult(
        prompt_version=prompt_version,
        model_version=config.deployment,
        results=results,
        summary=summary,
    )


def main():
    parser = argparse.ArgumentParser(description="Run prompt test harness")
    parser.add_argument("--prompt", required=True, help="Prompt slug-version (e.g., base-v001)")
    parser.add_argument("--test-cases", required=True, help="Path to test_cases.json")
    parser.add_argument("--chunks", default=None, help="Path to sample_chunks.json")
    args = parser.parse_args()

    # Load test cases
    test_cases_path = Path(args.test_cases)
    with open(test_cases_path, encoding="utf-8") as f:
        test_cases = json.load(f)

    # Load chunks
    chunks_data = None
    if args.chunks:
        with open(args.chunks, encoding="utf-8") as f:
            chunks_data = json.load(f)

    # Config from environment
    config = HarnessConfig(
        endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", ""),
        api_key=os.environ.get("AZURE_OPENAI_API_KEY", ""),
        deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-2024-05-13"),
    )

    if not config.endpoint or not config.api_key:
        print("ERROR: AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY must be set.")
        sys.exit(1)

    result = run_test_suite(args.prompt, test_cases, config, chunks_data)

    # Print summary
    print(f"\n{'='*60}")
    print(f"Harness Report: {result.prompt_version}")
    print(f"Model: {result.model_version}")
    print(f"Total cases: {result.summary.total_cases}")
    print(f"{'='*60}")
    print("\nAdherence by criterion:")
    for criterion, rate in result.summary.adherence_by_criterion.items():
        print(f"  {criterion}: {rate:.1%}")
    print(f"\nOverall adherence: {result.summary.overall_adherence:.1%}")
    print(f"Blocked by filters: {result.summary.blocked_count}")


if __name__ == "__main__":
    main()
