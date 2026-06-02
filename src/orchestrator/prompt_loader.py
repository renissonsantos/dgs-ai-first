"""Prompt loader — reads versioned prompt files from prompts/ directory."""

from pathlib import Path

_PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"


def load_prompt(slug: str, version: int | None = None, prompt_type: str = "system") -> str:
    """Load a versioned prompt from the prompts directory.

    Args:
        slug: Prompt identifier (e.g. 'base')
        version: Version number. If None, loads highest version available.
        prompt_type: One of 'system', 'guardrails', 'templates'

    Returns:
        Prompt content as string.

    Raises:
        FileNotFoundError: If no matching prompt file exists.
    """
    type_dir = _PROMPTS_DIR / prompt_type

    if version is not None:
        filename = f"{slug}-v{version:03d}.prompt.md"
        path = type_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"Prompt not found: {path}")
        return path.read_text(encoding="utf-8")

    # Find highest version for the slug
    pattern = f"{slug}-v*.prompt.md"
    matches = sorted(type_dir.glob(pattern))
    if not matches:
        raise FileNotFoundError(
            f"No prompt found for slug '{slug}' in {type_dir}"
        )
    return matches[-1].read_text(encoding="utf-8")
