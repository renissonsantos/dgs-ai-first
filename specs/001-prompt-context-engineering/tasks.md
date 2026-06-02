# Tasks: Prompt & Context Engineering como Artefato de Arquitetura Versionado

**Input**: Design documents from `specs/001-prompt-context-engineering/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, Python project structure, and dependency configuration

- [x] T001 Create project directory structure per plan.md (src/orchestrator/, src/enforcement/, src/harness/, tests/unit/, tests/integration/, tests/fixtures/, prompts/system/, prompts/guardrails/, prompts/templates/)
- [x] T002 Initialize Python project with pyproject.toml including dependencies: openai, azure-search-documents, tiktoken, pytest
- [x] T003 [P] Create src/orchestrator/__init__.py, src/enforcement/__init__.py, src/harness/__init__.py package files
- [x] T004 [P] Configure pytest in pyproject.toml with test paths and markers (unit, integration)
- [x] T005 [P] Create .env.example with required Azure environment variables (AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT, AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_KEY, AZURE_SEARCH_INDEX)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented — token counting and prompt loading are shared by all stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement token counting function using tiktoken (cl100k_base encoding) in src/orchestrator/token_budget.py — contract: count_tokens(text) → int
- [x] T007 Implement budget validation function in src/orchestrator/token_budget.py — contract: fits_budget(parts: dict, ceiling: int) → BudgetResult with fits, total, per_part, overflow
- [x] T008 [P] Implement prompt loader in src/orchestrator/prompt_loader.py — contract: load_prompt(slug, version=None) → str; reads from prompts/{type}/{slug}-v{version:03d}.prompt.md
- [x] T009 [P] Create test fixtures file with sample chunks in tests/fixtures/sample_chunks.json (3–5 chunks from Anexo B with ~500 tokens each, including score metadata)
- [x] T010 [P] Create test fixtures file with test cases in tests/fixtures/test_cases.json (8–12 pairs pergunta→resposta following TestCase schema from data-model.md, covering: citação, alucinação "Platinum", conflito PROC-042, escalação)
- [x] T011 Write unit tests for token_budget module in tests/unit/test_token_budget.py (test count_tokens accuracy, test fits_budget with under/over/at ceiling)

**Checkpoint**: Foundation ready — token counting, prompt loading, and test fixtures available for all stories

---

## Phase 3: User Story 1 — Governança de prompts versionados (Priority: P1) 🎯 MVP

**Goal**: Artefatos de prompt tratados como código — versionados, nomeados por convenção, com processo de revisão documentado e papéis definidos.

**Independent Test**: Verificar que o repositório contém prompts na estrutura padronizada, com README documentando convenções, processo de revisão e papéis. Verificar que o prompt-base v001 está carregável pelo prompt_loader.

### Implementation for User Story 1

- [x] T012 [P] [US1] Create system prompt base version in prompts/system/base-v001.prompt.md with YAML frontmatter (slug, version, type, author, created_at, status: production, estimated_tokens) and content from the NovaTech prompt-base melhorado
- [x] T013 [P] [US1] Create guardrail: citação obrigatória in prompts/guardrails/citacao-obrigatoria.md with instruction "Sempre cite o documento-fonte da informação na resposta"
- [x] T014 [P] [US1] Create guardrail: não inventar in prompts/guardrails/nao-inventar.md with instruction "Nunca invente prazos, valores ou tiers que não estejam na documentação fornecida"
- [x] T015 [P] [US1] Create guardrail: escalar supervisor in prompts/guardrails/escalar-supervisor.md with instruction "Quando não encontrar resposta na documentação, diga explicitamente e sugira escalar ao supervisor"
- [x] T016 [P] [US1] Create guardrail: português formal in prompts/guardrails/portugues-formal.md with instruction "Responda em português formal mas acessível"
- [x] T017 [P] [US1] Create conflict response template in prompts/templates/resposta-com-conflito.md with template for showing both versions with dates
- [x] T018 [US1] Create prompts/README.md documenting: convenção de nomes (<slug>-v<NNN>.prompt.md), estrutura de diretórios, processo de revisão (PR com aprovação do Tech Lead), papéis (quem propõe, quem aprova), como fazer rollback, ciclo de vida (draft→review→production→deprecated), e tabela de classificação de guardrails (GR-001 citação: both, GR-002 não-inventar: both, GR-003 escalar: probabilistic, GR-004 português formal: probabilistic) com referência ao módulo de enforcement de cada guardrail determinístico

**Checkpoint**: User Story 1 completa — prompts versionados no repositório com governança documentada. Prompt-base carregável via prompt_loader (T008).

---

## Phase 4: User Story 2 — Anatomia de contexto de uma query (Priority: P1)

**Goal**: Implementar a montagem de contexto respeitando o orçamento fixo de tokens, reordenação anti-lost-in-the-middle, e regra de descarte determinística — tudo coerente com o ADR-0002.

**Independent Test**: Verificar que build_context monta um prompt com total ≤ 16K tokens, reordena chunks em V-shape, e descarta corretamente quando há overflow (histórico primeiro, chunks de menor score depois; system/guardrails e query nunca truncados).

### Implementation for User Story 2

- [x] T019 [P] [US2] Implement V-shape reordering in src/orchestrator/reorderer.py — contract: reorder_v_shape(chunks: list[Chunk]) → list[Chunk]; maior score no início e fim, menores no meio
- [x] T020 [US2] Implement context builder in src/orchestrator/context_builder.py — contract: build_context(query, session_state, retrieved_chunks) → ContextPayload; must compose system_prompt (from prompt_loader) + guardrails + reordered chunks + history + query, enforce ceiling 16K, apply discard rules
- [x] T021 [US2] Write unit tests for reorderer in tests/unit/test_reorderer.py (test V-shape ordering with 6 chunks, test with 1 chunk, test with 12 chunks multi-domain)
- [x] T022 [US2] Write integration test for context_builder in tests/integration/test_context_builder.py (test total ≤ 16K, test system never truncated, test discard order on overflow, test query always at end)

**Checkpoint**: User Story 2 completa — montagem de contexto determinística respeitando orçamento ADR-0002. Context builder integra com prompt_loader (US1) e token_budget (Phase 2).

---

## Phase 5: User Story 3 — Harness de teste automatizado de prompts (Priority: P2)

**Goal**: Mecanismo automatizado que executa pares pergunta→resposta contra o LLM, avalia por graus de qualidade (não pass/fail) e permite comparar versões de prompt.

**Independent Test**: Executar o harness com test_cases.json contra o LLM e verificar que produz relatório com taxas de aderência por critério (citation, no_hallucination, no_forbidden_terms). Comparar dois prompts e verificar delta.

### Implementation for User Story 3

- [x] T023 [P] [US3] Implement evaluator module in src/harness/evaluator.py — functions: check_citation(response, expected_sources) → float (0.0 ou 1.0 por caso; binário), check_no_hallucination(response, valid_values) → float (0.0 ou 1.0 por caso; binário), check_no_forbidden_terms(response, forbidden_terms) → float (0.0 ou 1.0 por caso; binário). Graus de qualidade (Princípio VII) emergem da agregação: taxa = soma dos scores / total de casos, reportada pelo reporter como percentual de aderência por critério
- [x] T024 [P] [US3] Implement reporter module in src/harness/reporter.py — function: generate_report(results: list[EvaluationResult]) → SuiteSummary with adherence_by_criterion and overall_adherence
- [x] T025 [US3] Implement harness runner in src/harness/runner.py — contract: run_test_suite(prompt_version, test_cases, config) → SuiteResult; loads prompt via prompt_loader, sends each question to Azure OpenAI with reference chunks, collects response, evaluates with evaluator, aggregates with reporter
- [x] T026 [US3] Implement comparator module in src/harness/comparator.py — contract: compare(suite_a, suite_b) → ComparisonReport with delta_by_criterion, regressions, improvements
- [x] T027 [US3] Write integration test for harness runner in tests/integration/test_harness_runner.py (test with 2–3 test cases from fixtures, verify SuiteResult structure, verify adherence scores are 0.0–1.0)
- [x] T028 [US3] Add CLI entry point for harness execution: python -m src.harness.runner --prompt <slug-version> --test-cases <path> and python -m src.harness.comparator --prompt-a <v1> --prompt-b <v2> --test-cases <path>

**Checkpoint**: User Story 3 completa — harness executável via CLI, produz relatório de taxas de aderência, compara versões. Integra com prompt_loader (US1) e context_builder (US2).

---

## Phase 6: User Story 4 — Split de enforcement: probabilístico vs determinístico (Priority: P2)

**Goal**: Filtros de código que bloqueiam respostas não conformes (citação ausente, tier inventado) antes de exibi-las, com fallback padronizado. Guardrails classificados explicitamente.

**Independent Test**: Enviar respostas sem citação ao citation_filter e verificar bloqueio. Enviar resposta mencionando "Platinum" ao hallucination_filter e verificar bloqueio. Verificar que fallback_handler retorna mensagem de escalação.

### Implementation for User Story 4

- [x] T029 [P] [US4] Implement citation filter in src/enforcement/citation_filter.py — contract: check(response, expected_sources) → FilterResult with passed, reason, citations_found; uses regex/pattern matching to detect source citations in response text
- [x] T030 [P] [US4] Implement hallucination filter in src/enforcement/hallucination_filter.py — contract: check(response, valid_values) → FilterResult with passed, reason, violations; checks for mention of tiers/values not in valid_values dict (ex.: "Platinum" not in ["Gold", "Silver", "Standard"])
- [x] T031 [US4] Implement fallback handler in src/enforcement/fallback_handler.py — function: generate_fallback(filter_reason) → str; returns "Não encontrei uma resposta fundamentada na documentação para esta pergunta. Sugiro escalar ao supervisor."
- [x] T032 [P] [US4] Write unit tests for citation_filter in tests/unit/test_citation_filter.py (test pass with valid citation, test fail without citation, test with partial citation)
- [x] T033 [P] [US4] Write unit tests for hallucination_filter in tests/unit/test_hallucination_filter.py (test pass with valid tier "Gold", test fail with "Platinum", test with multiple violations)
- [x] T034 [US4] Implement query orchestration pipeline in src/orchestrator/pipeline.py — contract: process_query(query, session_state, retrieved_chunks, config) → FinalResponse; calls build_context → Azure OpenAI → citation_filter.check → hallucination_filter.check → if any filter fails, return fallback_handler.generate_fallback(); exposes the full request-response cycle as a single entry point

**Checkpoint**: User Story 4 completa — filtros determinísticos bloqueiam 100% das respostas sem citação e 100% com tier inventado. Pipeline: LLM → citation_filter → hallucination_filter → resposta (ou fallback).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation end-to-end, and cleanup

- [x] T035 [P] Create quickstart validation: verify all steps in specs/001-prompt-context-engineering/quickstart.md are executable (environment setup, harness execution, pytest)
- [x] T036 [P] Add comprehensive docstrings to public functions in src/orchestrator/context_builder.py and src/enforcement/citation_filter.py (only public API contracts)
- [x] T037 Run full pytest suite (unit + integration) and fix any failures
- [x] T038 Run harness end-to-end with base-v001 prompt against test_cases.json and document initial adherence rates in specs/001-prompt-context-engineering/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (specifically T008 prompt_loader)
- **User Story 2 (Phase 4)**: Depends on Foundational (T006, T007 token_budget) + US1 (T012 for system prompt content)
- **User Story 3 (Phase 5)**: Depends on US1 (prompt_loader + prompt files) + US2 (context_builder) + Foundational (test fixtures)
- **User Story 4 (Phase 6)**: Depends on Foundational only — can run in parallel with US2/US3; integration task T034 depends on US2 (context_builder)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no dependencies on other stories
- **US2 (P1)**: Depends on US1 (needs prompt files to load for system_prompt composition)
- **US3 (P2)**: Depends on US1 + US2 (needs prompt_loader + context_builder)
- **US4 (P2)**: Core filters (T029–T033) can start after Foundational; integration (T034) depends on US2

### Within Each User Story

- Models/data structures before services
- Services before integration points
- Unit tests alongside or after implementation
- Integration tests after service implementation complete

### Parallel Opportunities

- All Setup tasks T003–T005 can run in parallel
- Foundational: T008, T009, T010 can run in parallel (after T006–T007)
- US1: All prompt files T012–T017 can run in parallel
- US2: T019 (reorderer) in parallel with other stories until T020 (context_builder) integrates
- US3: T023 (evaluator) and T024 (reporter) in parallel
- US4: T029 (citation_filter) and T030 (hallucination_filter) in parallel; T032 and T033 in parallel
- US4 core (T029–T033) can run in parallel with US2 and US3 (only T034 integration depends on US2)

---

## Parallel Example: User Story 1

```bash
# Launch all prompt artifact files together:
Task T012: "Create system prompt base-v001.prompt.md"
Task T013: "Create guardrail citacao-obrigatoria.md"
Task T014: "Create guardrail nao-inventar.md"
Task T015: "Create guardrail escalar-supervisor.md"
Task T016: "Create guardrail portugues-formal.md"
Task T017: "Create template resposta-com-conflito.md"

# Then sequentially:
Task T018: "Create prompts/README.md" (references all files above)
```

## Parallel Example: User Story 4

```bash
# Launch both filters together:
Task T029: "Implement citation_filter.py"
Task T030: "Implement hallucination_filter.py"

# Launch both test files together:
Task T032: "Unit tests for citation_filter"
Task T033: "Unit tests for hallucination_filter"

# Then sequentially:
Task T031: "Implement fallback_handler.py"
Task T034: "Integrate into context_builder pipeline"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (token_budget + prompt_loader + fixtures)
3. Complete Phase 3: User Story 1 (prompts versionados com governança)
4. **STOP and VALIDATE**: Verify prompt files exist, README documenta o processo, prompt_loader carrega base-v001
5. Deploy/demo if ready — governança de prompts já entrega valor sem o resto

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Prompts versionados (MVP!)
3. Add User Story 2 → Test independently → Context builder respeitando orçamento
4. Add User Story 4 → Test independently → Filtros determinísticos funcionando
5. Add User Story 3 → Test independently → Harness completo com relatórios
6. Polish → Validação end-to-end

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (prompts) → User Story 2 (context builder)
   - Developer B: User Story 4 (enforcement filters — core, sem integração T034)
3. After US2 complete: Developer B integra T034
4. After US1 + US2 complete: Developer A or B → User Story 3 (harness)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Harness (US3) requires Azure OpenAI credentials for integration tests — unit tests mock the LLM
- Enforcement filters (US4) are pure functions — no external dependencies for unit tests
