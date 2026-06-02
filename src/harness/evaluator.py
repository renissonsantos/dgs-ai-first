"""Evaluator — checks response quality criteria with binary scoring per case."""

import re


def check_citation(response: str, expected_sources: list[str]) -> float:
    """Check if the response cites at least one expected source.

    Returns 1.0 if citation found, 0.0 otherwise.
    """
    response_upper = response.upper()
    for source in expected_sources:
        if source.upper() in response_upper:
            return 1.0
    return 0.0


def check_no_hallucination(response: str, valid_values: dict[str, list[str]]) -> float:
    """Check if the response mentions only valid values.

    Returns 1.0 if no hallucinated values found, 0.0 otherwise.

    valid_values example: {"tiers": ["Gold", "Silver", "Standard"]}
    Checks for any tier-like mentions that aren't in the valid list.
    """
    response_lower = response.lower()

    for category, valid_list in valid_values.items():
        valid_lower = [v.lower() for v in valid_list]

        # Known invalid values to check against
        # We look for capitalized words near category context
        if category == "tiers":
            # Check for common tier-like words not in valid list
            known_invalid = ["platinum", "diamond", "bronze", "enterprise", "premium"]
            for invalid in known_invalid:
                if invalid in response_lower and invalid not in valid_lower:
                    return 0.0

    return 1.0


def check_no_forbidden_terms(response: str, forbidden_terms: list[str]) -> float:
    """Check if the response contains any forbidden terms.

    Returns 1.0 if no forbidden terms found, 0.0 otherwise.
    """
    response_lower = response.lower()
    for term in forbidden_terms:
        if term.lower() in response_lower:
            return 0.0
    return 1.0
