# Contracts: Orchestrator Interface

**Date**: 2026-06-01 | **Plan**: [../plan.md](../plan.md)

Este documento define as interfaces públicas dos módulos da camada de orquestração. São contratos internos (entre módulos) — não há API HTTP exposta nesta feature (a integração com Teams/Bot Service será outra feature).

---

## 1. Context Builder

**Módulo**: `src/orchestrator/context_builder.py`

### `build_context(query, session_state, retrieved_chunks) → ContextPayload`

Monta o prompt completo respeitando o orçamento de tokens e a reordenação.

**Input**:
```
query: str                      # Pergunta do atendente
session_state: SessionState     # Estado conversacional (janela + resumo entidades)
retrieved_chunks: list[Chunk]   # Chunks recuperados e rerankeados (já ordenados por score)
```

**Output**:
```
ContextPayload:
  system_prompt: str            # System prompt + guardrails concatenados
  context_body: str             # Chunks reordenados (V-order) + histórico
  user_query: str               # Pergunta no fim
  total_tokens: int             # Total contabilizado
  discarded_items: list[str]    # Itens descartados para caber no orçamento
  budget_report: BudgetReport   # Detalhamento de tokens por parte
```

**Invariantes**:
- `total_tokens ≤ 16.000`
- `system_prompt` nunca é truncado
- `user_query` nunca é truncado
- Se overflow: descartar `session_state.history` (mais antigo primeiro), depois `chunks` (menor score primeiro)

---

## 2. Token Budget

**Módulo**: `src/orchestrator/token_budget.py`

### `count_tokens(text) → int`

Conta tokens exatos usando `tiktoken` com encoding `cl100k_base`.

### `fits_budget(parts: dict[str, str], ceiling: int) → BudgetResult`

Verifica se a soma das partes cabe no teto.

**Output**:
```
BudgetResult:
  fits: bool
  total: int
  per_part: dict[str, int]      # Tokens por parte
  overflow: int                 # Quanto excede (0 se fits=True)
```

---

## 3. Reorderer

**Módulo**: `src/orchestrator/reorderer.py`

### `reorder_v_shape(chunks: list[Chunk]) → list[Chunk]`

Aplica reordenação em "V": chunks de maior score nas extremidades (início e fim), menores no meio.

**Input**: Lista de chunks ordenados por score decrescente.
**Output**: Lista reordenada em V-shape.

**Invariante**: O conjunto de chunks não muda (sem adição/remoção) — apenas a ordem.

---

## 4. Enforcement Filters

**Módulo**: `src/enforcement/`

### `citation_filter.check(response, expected_sources) → FilterResult`

Verifica se a resposta contém ao menos uma citação de fonte válida.

**Input**:
```
response: str                   # Resposta do LLM
expected_sources: list[str]     # Fontes que deveriam ser citadas (do retrieval)
```

**Output**:
```
FilterResult:
  passed: bool
  reason: str | None            # Ex.: "missing_citation"
  citations_found: list[str]    # Citações detectadas na resposta
```

### `hallucination_filter.check(response, valid_values) → FilterResult`

Verifica se a resposta não menciona valores/tiers inexistentes.

**Input**:
```
response: str                   # Resposta do LLM
valid_values: dict[str, list]   # Ex.: {"tiers": ["Gold", "Silver", "Standard"]}
```

**Output**:
```
FilterResult:
  passed: bool
  reason: str | None            # Ex.: "invented_tier:Platinum"
  violations: list[str]         # Valores detectados que não existem na base
```

### Comportamento em bloqueio

Quando `passed=False`, o `fallback_handler` retorna mensagem padronizada:
> "Não encontrei uma resposta fundamentada na documentação para esta pergunta. Sugiro escalar ao supervisor."

---

## 5. Harness Runner

**Módulo**: `src/harness/runner.py`

### `run_test_suite(prompt_version, test_cases, config) → SuiteResult`

Executa todo o conjunto de teste contra o LLM.

**Input**:
```
prompt_version: str             # Slug-versão do prompt (ex.: "base-v001")
test_cases: list[TestCase]      # Casos de teste (formato em data-model.md)
config: HarnessConfig           # Modelo, deployment, temperatura, etc.
```

**Output**:
```
SuiteResult:
  prompt_version: str
  model_version: str
  timestamp: datetime
  results: list[EvaluationResult]
  summary: SuiteSummary
    total_cases: int
    adherence_by_criterion: dict[str, float]   # Ex.: {"citation": 0.97, "no_hallucination": 0.99}
    overall_adherence: float
    blocked_count: int          # Quantas respostas o filtro bloqueou
```

### `compare(suite_a, suite_b) → ComparisonReport`

Compara dois resultados de suite para identificar melhora/degradação.

**Output**:
```
ComparisonReport:
  prompt_a: str
  prompt_b: str
  delta_by_criterion: dict[str, float]   # Positivo = melhora em B
  overall_delta: float
  regressions: list[str]       # Test cases que pioraram
  improvements: list[str]      # Test cases que melhoraram
```

---

## 6. Prompt Loader

**Módulo**: `src/orchestrator/prompt_loader.py`

### `load_prompt(slug, version=None) → str`

Carrega o conteúdo de um prompt versionado do diretório `prompts/`.

**Input**:
```
slug: str                       # Ex.: "base"
version: int | None             # Se None, carrega a versão com status "production"
```

**Output**: Conteúdo do prompt como string.

**Comportamento**:
- Busca em `prompts/{type}/{slug}-v{version:03d}.prompt.md`
- Se `version=None`, lê o README ou metadados para identificar a versão em produção
- Erro se slug/versão não encontrados
