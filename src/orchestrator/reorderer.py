"""V-shape reordering: places highest-score chunks at start and end, lowest in the middle."""

from dataclasses import dataclass


@dataclass
class Chunk:
    id: str
    content: str
    source: str
    domain: str
    score: float
    tokens: int


def reorder_v_shape(chunks: list[Chunk]) -> list[Chunk]:
    """Reorder chunks in V-shape: highest scores at start and end, lowest in the middle.

    Input: list of chunks sorted by score descending.
    Output: same chunks in V-shape order (set unchanged, only order differs).
    """
    if len(chunks) <= 2:
        return list(chunks)

    sorted_chunks = sorted(chunks, key=lambda c: c.score, reverse=True)

    start: list[Chunk] = []
    end: list[Chunk] = []

    for i, chunk in enumerate(sorted_chunks):
        if i % 2 == 0:
            start.append(chunk)
        else:
            end.append(chunk)

    # End portion reversed so lowest-scoring is in the middle
    end.reverse()
    return start + end
