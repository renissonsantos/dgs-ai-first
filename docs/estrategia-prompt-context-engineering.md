# Estratégia de Prompt & Context Engineering — Assistente NovaTech

> Entregável do Exercício 1.2 (Tech Lead). Documento de arquitetura que trata o prompt como
> código versionado, define a anatomia de contexto com orçamento por parte, e separa o
> enforcement probabilístico do determinístico.
>
> Implementa as decisões dos **ADR-0001** (GPT-4o) e **ADR-0002** (gerenciamento de contexto) e
> os princípios I, II, III, V e VII da constituição. Artefatos e código referenciados ao longo.

## 1. Prompt como código (versionamento e governança)

Os prompts vivem em `prompts/`, versionados e revisados com o mesmo rigor de código. Detalhe
completo em [`prompts/README.md`](../prompts/README.md).

- **Localização e nomes:** `prompts/system/<slug>-v<NNN>.prompt.md`, `prompts/guardrails/<nome>.md`, `prompts/templates/<nome>.md`. Versão em 3 dígitos (`v001`).
- **Composição modular:** o system prompt referencia guardrails individuais, reaproveitáveis entre versões.
- **Ciclo de vida:** `draft → review → production → deprecated`. A versão de produção atual é [`base-v001`](../prompts/system/base-v001.prompt.md).
- **Quem altera:** qualquer membro propõe (`draft`) e roda o harness localmente; a mudança vai a PR (`review`) com **aprovação obrigatória do Tech Lead**, que verifica conformidade com a constituição e o resultado do harness (aderência ≥ baseline); merge promove a `production` e marca a versão anterior como `deprecated`.
- **Rollback:** reverter status entre versões via o mesmo processo de PR.

## 2. Anatomia de contexto (orçamento por parte)

Cada consulta ao modelo é montada a partir de partes estáticas e dinâmicas, com orçamento de
tokens explícito. Modelo de dados completo em
[`specs/001-prompt-context-engineering/data-model.md`](../specs/001-prompt-context-engineering/data-model.md);
implementação em [`src/orchestrator/`](../src/orchestrator/) (`token_budget.py`, `reorderer.py`, `context_builder.py`).

| Parte | Tipo | Orçamento | Posição | Descartável | Prioridade de descarte |
|-------|------|-----------|---------|-------------|------------------------|
| system prompt + guardrails | estático | ~2.000 tok | início | não | — |
| chunks (single-domínio) | dinâmico | ~3.000–3.600 tok (6×~500) | meio (ordem-V) | sim | 2 (menor score primeiro) |
| chunks (multi-domínio) | dinâmico | até ~6.000 tok (até 12×~500) | meio (ordem-V) | sim | 2 |
| histórico (janela deslizante) | dinâmico | ≤2.000 tok | meio | sim | 1 (mais antigo primeiro) |
| resumo de entidade | dinâmico | ≤300 tok | meio | sim | 1 |
| pergunta atual | dinâmico | ~200 tok | fim | não | — |
| **Teto rígido** | — | **16.000 tok** | — | — | — |
| reserva de resposta | saída | ~1.000 tok | — | — | — |

Decisões de engenharia de contexto embutidas:

- **Orçamento gerenciado, não maximizado** (Princípio V): teto de 16k bem abaixo da janela de 128k do GPT-4o, para preservar orçamento de atenção e reduzir custo por consulta.
- **Lost in the middle:** chunks reordenados em **ordem-V** (`reorderer.py`) — maior score no início e no fim, menores no meio.
- **Context rot em sessões longas no Teams:** histórico tratado por janela deslizante com descarte do mais antigo primeiro; nunca se descartam system/guardrails nem a pergunta.
- **Overflow:** contagem determinística com `tiktoken` (`token_budget.py`) antes de montar; se exceder, aplica-se a ordem de descarte acima.

## 3. Harness de teste de prompts

O prompt é testável e comparável entre versões. Código em [`src/harness/`](../src/harness/);
casos em [`tests/fixtures/test_cases.json`](../tests/fixtures/test_cases.json) e chunks de
referência (Anexo B) em [`tests/fixtures/sample_chunks.json`](../tests/fixtures/sample_chunks.json).

- **Entrada:** pares pergunta→resposta esperada com fonte esperada, termos proibidos e comportamento esperado (`answer_with_citation`, `refuse_and_escalate`, `show_conflict`).
- **Critérios avaliados** (`evaluator.py`): citação presente, ausência de termos proibidos, ausência de tier/valor inexistente.
- **Agregação por graus** (Princípio VII): a taxa de aderência por critério emerge da média dos casos — não é pass/fail binário do conjunto.
- **Comparação de versões** (`comparator.py`): identifica melhora/regressão por critério entre dois prompts.
- **Execução:** `python -m src.harness.runner --prompt base-v001 --test-cases tests/fixtures/test_cases.json --chunks tests/fixtures/sample_chunks.json` (requer variáveis Azure do `.env.example`).

Os 10 casos cobrem as armadilhas do cenário: prazo/exceção de devolução, tier inexistente
("Platinum", "Diamond"), conflito PROC-042 vs v2, e escalação quando não há resposta.

## 4. Enforcement: probabilístico vs determinístico

Guardrails críticos não dependem só da obediência do modelo (Princípio III). Classificação em
[`prompts/README.md`](../prompts/README.md); filtros em [`src/enforcement/`](../src/enforcement/);
encadeamento em [`src/orchestrator/pipeline.py`](../src/orchestrator/pipeline.py).

| ID | Guardrail | Enforcement | Prompt | Código (determinístico) |
|----|-----------|-------------|--------|-------------------------|
| GR-001 | Sempre citar fonte | both | `guardrails/citacao-obrigatoria.md` | `citation_filter.py` |
| GR-002 | Nunca inventar tier/valor | both | `guardrails/nao-inventar.md` | `hallucination_filter.py` |
| GR-003 | Escalar quando não souber | probabilístico | `guardrails/escalar-supervisor.md` | — |
| GR-004 | Português formal acessível | probabilístico | `guardrails/portugues-formal.md` | — |

Fluxo de resposta: `build_context → LLM → citation_filter → hallucination_filter → resposta`;
se qualquer filtro reprova, retorna-se o fallback ("não encontrei resposta fundamentada, escalar
ao supervisor") via `fallback_handler.py`. Critérios mensuráveis: 100% das respostas sem citação
ou com tier inexistente são bloqueadas (SC-001, SC-002).

## 5. Limitações conhecidas

- **`hallucination_filter` é denylist:** barra tiers inventados conhecidos (`platinum`, `diamond`, `bronze`, ...), mas não um valor inédito que o modelo invente. Evolução recomendada: validar contra uma **allowlist** de tiers/valores extraída dos próprios documentos no momento da ingestão, em vez de lista fixa de inválidos.
- **`tiktoken` baixa o encoding na primeira execução:** em ambiente sem rede (CI restrito), pré-cachear via `TIKTOKEN_CACHE_DIR`.
- **Estimativas de tokens por parte** assumem chunks de ~500 tokens; revisar se a estratégia de chunking do pipeline de RAG mudar.

## Rastreabilidade

ADR-0001, ADR-0002 · Constituição (I, II, III, V, VII) · Feature `specs/001-prompt-context-engineering/`.
