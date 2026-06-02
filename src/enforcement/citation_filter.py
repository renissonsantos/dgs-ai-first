"""Citation filter — deterministic enforcement that blocks responses without source citations."""

import re
from dataclasses import dataclass, field


@dataclass
class FilterResult:
    passed: bool
    reason: str | None = None
    citations_found: list[str] = field(default_factory=list)


def check(response: str, expected_sources: list[str]) -> FilterResult:
    """Verify if the response contains at least one citation of an expected source.

    Uses pattern matching to detect source references in the response text.
    Patterns recognized:
    - "Conforme <SOURCE>"
    - "De acordo com <SOURCE>"
    - "Fonte: <SOURCE>"
    - "(Fonte: <SOURCE>)"
    - "[<SOURCE>]"
    - Direct mention of the source identifier
    """
    citations_found: list[str] = []
    response_upper = response.upper()

    for source in expected_sources:
        source_upper = source.upper()
        if source_upper in response_upper:
            citations_found.append(source)

    if citations_found:
        return FilterResult(passed=True, reason=None, citations_found=citations_found)

    return FilterResult(
        passed=False,
        reason="missing_citation",
        citations_found=[],
    )
