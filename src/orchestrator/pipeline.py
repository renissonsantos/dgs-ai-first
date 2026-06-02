"""Query orchestration pipeline — full request-response cycle as a single entry point."""

import os
from dataclasses import dataclass

from src.enforcement.citation_filter import check as citation_check
from src.enforcement.fallback_handler import generate_fallback
from src.enforcement.hallucination_filter import check as hallucination_check
from src.orchestrator.context_builder import SessionState, build_context
from src.orchestrator.reorderer import Chunk


@dataclass
class PipelineConfig:
    endpoint: str = ""
    api_key: str = ""
    deployment: str = "gpt-4o-2024-05-13"
    temperature: float = 0.0
    max_tokens: int = 1000
    valid_values: dict = None
    expected_sources: list[str] = None

    def __post_init__(self):
        if self.valid_values is None:
            self.valid_values = {"tiers": ["Gold", "Silver", "Standard"]}
        if self.expected_sources is None:
            self.expected_sources = []


@dataclass
class FinalResponse:
    text: str
    blocked: bool
    block_reason: str | None = None
    citations_found: list[str] = None
    total_tokens_used: int = 0

    def __post_init__(self):
        if self.citations_found is None:
            self.citations_found = []


def _call_azure_openai(system_prompt: str, context_body: str, query: str, config: PipelineConfig) -> str:
    """Call Azure OpenAI and return the response text."""
    from openai import AzureOpenAI

    client = AzureOpenAI(
        azure_endpoint=config.endpoint,
        api_key=config.api_key,
        api_version="2024-02-01",
    )

    user_content = f"{context_body}\n\nPergunta: {query}" if context_body else f"Pergunta: {query}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

    response = client.chat.completions.create(
        model=config.deployment,
        messages=messages,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
    )

    return response.choices[0].message.content or ""


def process_query(
    query: str,
    session_state: SessionState,
    retrieved_chunks: list[Chunk],
    config: PipelineConfig,
) -> FinalResponse:
    """Execute the full query pipeline: build_context → LLM → citation_filter → hallucination_filter.

    If any filter fails, returns fallback_handler response.

    Args:
        query: User question
        session_state: Conversational state (history + entity summary)
        retrieved_chunks: Pre-retrieved and scored chunks
        config: Pipeline configuration (Azure credentials, valid values, etc.)

    Returns:
        FinalResponse with the approved text or fallback.
    """
    # Step 1: Build context
    context = build_context(
        query=query,
        session_state=session_state,
        retrieved_chunks=retrieved_chunks,
    )

    # Step 2: Call Azure OpenAI
    llm_response = _call_azure_openai(
        system_prompt=context.system_prompt,
        context_body=context.context_body,
        query=context.user_query,
        config=config,
    )

    # Step 3: Citation filter
    expected_sources = config.expected_sources or [c.source for c in retrieved_chunks]
    citation_result = citation_check(llm_response, expected_sources)

    if not citation_result.passed:
        return FinalResponse(
            text=generate_fallback(citation_result.reason),
            blocked=True,
            block_reason=citation_result.reason,
            citations_found=[],
            total_tokens_used=context.total_tokens,
        )

    # Step 4: Hallucination filter
    hallucination_result = hallucination_check(llm_response, config.valid_values)

    if not hallucination_result.passed:
        return FinalResponse(
            text=generate_fallback(hallucination_result.reason),
            blocked=True,
            block_reason=hallucination_result.reason,
            citations_found=citation_result.citations_found,
            total_tokens_used=context.total_tokens,
        )

    # Step 5: All filters passed — return approved response
    return FinalResponse(
        text=llm_response,
        blocked=False,
        block_reason=None,
        citations_found=citation_result.citations_found,
        total_tokens_used=context.total_tokens,
    )
