"""Fallback handler — generates standardized fallback message when filters block a response."""

_FALLBACK_MESSAGE = (
    "Não encontrei uma resposta fundamentada na documentação para esta pergunta. "
    "Sugiro escalar ao supervisor."
)


def generate_fallback(filter_reason: str) -> str:
    """Generate a fallback response when an enforcement filter blocks the LLM response.

    Args:
        filter_reason: The reason the filter blocked (e.g., 'missing_citation', 'invented_tier:Platinum')

    Returns:
        Standardized fallback message suggesting escalation.
    """
    return _FALLBACK_MESSAGE
