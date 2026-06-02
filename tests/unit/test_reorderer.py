"""Unit tests for src/orchestrator/reorderer.py."""

import pytest

from src.orchestrator.reorderer import Chunk, reorder_v_shape


def _make_chunk(id: str, score: float) -> Chunk:
    return Chunk(id=id, content=f"Content {id}", source=f"SRC-{id}", domain="test", score=score, tokens=50)


class TestReorderVShape:
    def test_single_chunk(self):
        chunks = [_make_chunk("1", 0.9)]
        result = reorder_v_shape(chunks)
        assert len(result) == 1
        assert result[0].id == "1"

    def test_two_chunks(self):
        chunks = [_make_chunk("1", 0.9), _make_chunk("2", 0.8)]
        result = reorder_v_shape(chunks)
        assert len(result) == 2

    def test_six_chunks_v_shape(self):
        # Input: 6 chunks with scores 0.95, 0.90, 0.85, 0.80, 0.75, 0.70
        chunks = [
            _make_chunk("A", 0.95),
            _make_chunk("B", 0.90),
            _make_chunk("C", 0.85),
            _make_chunk("D", 0.80),
            _make_chunk("E", 0.75),
            _make_chunk("F", 0.70),
        ]
        result = reorder_v_shape(chunks)

        # V-shape: highest at start and end, lowest in middle
        assert len(result) == 6
        # First element should be highest score
        assert result[0].score == 0.95
        # Last element should be second-highest
        assert result[-1].score == 0.90
        # Middle elements should have lower scores
        middle_scores = [c.score for c in result[1:-1]]
        assert min(middle_scores) < result[0].score
        assert min(middle_scores) < result[-1].score

    def test_twelve_chunks_preserves_set(self):
        chunks = [_make_chunk(str(i), 1.0 - i * 0.05) for i in range(12)]
        result = reorder_v_shape(chunks)

        # Same set, just reordered
        assert len(result) == 12
        original_ids = {c.id for c in chunks}
        result_ids = {c.id for c in result}
        assert original_ids == result_ids

    def test_empty_list(self):
        result = reorder_v_shape([])
        assert result == []

    def test_highest_scores_at_edges(self):
        chunks = [
            _make_chunk("high1", 0.99),
            _make_chunk("high2", 0.95),
            _make_chunk("mid", 0.70),
            _make_chunk("low", 0.50),
        ]
        result = reorder_v_shape(chunks)

        # Edges should have the two highest scores
        edge_scores = {result[0].score, result[-1].score}
        assert 0.99 in edge_scores
        assert 0.95 in edge_scores
