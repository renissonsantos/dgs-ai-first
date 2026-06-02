"""Token budget management using tiktoken for deterministic token counting."""

from dataclasses import dataclass

import tiktoken

_ENCODING = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    """Count exact tokens using tiktoken cl100k_base encoding."""
    return len(_ENCODING.encode(text))


@dataclass
class BudgetResult:
    fits: bool
    total: int
    per_part: dict[str, int]
    overflow: int


def fits_budget(parts: dict[str, str], ceiling: int) -> BudgetResult:
    """Check if the sum of all parts fits within the token ceiling."""
    per_part = {name: count_tokens(text) for name, text in parts.items()}
    total = sum(per_part.values())
    overflow = max(0, total - ceiling)
    return BudgetResult(
        fits=total <= ceiling,
        total=total,
        per_part=per_part,
        overflow=overflow,
    )
