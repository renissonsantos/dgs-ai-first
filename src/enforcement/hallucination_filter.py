"""Hallucination filter — blocks responses that mention non-existent tiers or values."""

from dataclasses import dataclass, field


@dataclass
class FilterResult:
    passed: bool
    reason: str | None = None
    violations: list[str] = field(default_factory=list)


# Known invalid values that the model might hallucinate
_KNOWN_INVALID_TIERS = ["platinum", "diamond", "bronze", "enterprise", "premium", "vip", "basic"]


def check(response: str, valid_values: dict[str, list[str]]) -> FilterResult:
    """Verify if the response mentions only valid values.

    Args:
        response: LLM response text
        valid_values: Dict of category -> valid values list.
                     Example: {"tiers": ["Gold", "Silver", "Standard"]}

    Returns:
        FilterResult with passed=True if no violations, False otherwise.
    """
    violations: list[str] = []
    response_lower = response.lower()

    for category, valid_list in valid_values.items():
        valid_lower = [v.lower() for v in valid_list]

        if category == "tiers":
            for invalid in _KNOWN_INVALID_TIERS:
                if invalid in response_lower and invalid not in valid_lower:
                    violations.append(f"{invalid}")

    if violations:
        reason = f"invented_tier:{','.join(violations)}"
        return FilterResult(passed=False, reason=reason, violations=violations)

    return FilterResult(passed=True, reason=None, violations=[])
