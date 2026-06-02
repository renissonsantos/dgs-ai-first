# Implementation Plan: Prompt & Context Engineering como Artefato de Arquitetura Versionado

**Branch**: `001-prompt-context-engineering` | **Date**: 2026-06-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-prompt-context-engineering/spec.md`

**ADRs vinculados**: [ADR-0001](../../docs/adr/ADR-0001-adotar-azure-openai-gpt-4o-como-llm-de-producao.md) (GPT-4o), [ADR-0002](../../docs/adr/ADR-0002-gerenciar-contexto-com-orcamento-fixo-e-retrieval-reordenado.md) (orçamento de contexto), [ADR-0004](../../docs/adr/ADR-0004-comprar-infra-gerenciada-azure-e-construir-orquestracao-propria.md) (infra gerenciada + orquestração própria)

## Summary

Implementar a estratégia de prompt e context engineering como artefato de arquitetura versionado para o assistente da NovaTech. Envolve: (1) governança de prompts versionados em repositório, (2) documentação da anatomia de contexto com orçamento por parte, (3) harness de teste automatizado de prompts com avaliação por graus de qualidade, e (4) split de enforcement entre probabilístico (prompt) e determinístico (código). A camada de orquestração e o harness são implementados em Python, sobre Azure OpenAI SDK e Azure AI Search (ADR-0004).

## Technical Context

**Language/Version**: Python 3.11+

**Primary Dependencies**: azure-openai SDK, azure-search-documents SDK, tiktoken (contagem de tokens), pytest (testes unitários/integração)

**Storage**: Azure AI Search (vector store, ADR-0004); sistema de arquivos (prompts versionados em `prompts/`)

**Testing**: pytest + harness de teste de prompts customizado (avaliação por graus, Princípio VII)

**Target Platform**: Azure (serviço de orquestração) — execução local para desenvolvimento e harness

**Project Type**: Biblioteca de orquestração + harness de teste CLI

**Performance Goals**: ≤ 16K tokens por consulta (teto rígido ADR-0002); 192 consultas/dia no volume atual

**Constraints**: Orçamento de contexto fixo (system ~2K + chunks ~3–6K + histórico ≤2K + pergunta ~0,2K); não introduzir framework pesado (LangChain/LlamaIndex); dados no tenant Azure; go-live em 3 meses

**Scale/Scope**: 45 atendentes, ~192 consultas/dia (~4.224/mês), ~24K chunks indexados, ~1.250 fontes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Aplicação neste plano | Status |
|-----------|----------------------|--------|
| I. Fundamentação com citação | Filtro determinístico rejeita resposta sem citação | ✅ Atendido |
| II. Não alucinar | Filtro determinístico bloqueia tier/valor inexistente (ex.: "Platinum") | ✅ Atendido |
| III. Enforcement determinístico | Guardrails críticos (citação, não-alucinação) em código Python, não apenas no prompt | ✅ Atendido |
| IV. RAG é problema de dados | Anatomia de contexto e orçamento tratam curadoria/retrieval; não dependem só do modelo | ✅ Atendido |
| V. Orçamento gerenciado | Teto rígido de 16K com descarte ordenado (ADR-0002) | ✅ Atendido |
| VI. Rastreabilidade ADR-first | Plano referencia ADR-0001, ADR-0002, ADR-0004 | ✅ Atendido |
| VII. Testabilidade de saídas de IA | Harness avalia por graus de qualidade (taxa de aderência), não pass/fail binário | ✅ Atendido |

**Gate result**: PASS — sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/001-prompt-context-engineering/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
prompts/
├── system/
│   ├── base-v001.prompt.md         # System prompt principal, versionado
│   └── base-v002.prompt.md         # Nova versão após revisão
├── guardrails/
│   ├── citacao-obrigatoria.md      # Instrução de citação
│   ├── nao-inventar.md             # Instrução de não-alucinação
│   ├── escalar-supervisor.md       # Instrução de escalação
│   └── portugues-formal.md         # Instrução de idioma
├── templates/
│   └── resposta-com-conflito.md    # Template para exibir versões conflitantes
└── README.md                       # Convenções de nomes, processo de revisão, papéis

src/
├── orchestrator/
│   ├── __init__.py
│   ├── context_builder.py          # Monta o prompt respeitando anatomia e orçamento
│   ├── token_budget.py             # Contabilidade determinística de tokens (tiktoken)
│   ├── reorderer.py                # Reordenação "V" anti-lost-in-the-middle
│   └── prompt_loader.py            # Carrega prompt versionado do diretório prompts/
├── enforcement/
│   ├── __init__.py
│   ├── citation_filter.py          # Filtro determinístico: bloqueia resposta sem citação
│   ├── hallucination_filter.py     # Filtro determinístico: bloqueia tier/valor inventado
│   └── fallback_handler.py         # Mensagem de fallback quando filtro bloqueia
└── harness/
    ├── __init__.py
    ├── runner.py                    # Executa pares pergunta→resposta contra o LLM
    ├── evaluator.py                # Avalia critérios (citação, termos proibidos, alucinação)
    ├── reporter.py                 # Gera relatório de taxas de aderência
    └── comparator.py               # Compara resultados entre versões de prompt

tests/
├── unit/
│   ├── test_token_budget.py
│   ├── test_reorderer.py
│   ├── test_citation_filter.py
│   └── test_hallucination_filter.py
├── integration/
│   ├── test_context_builder.py
│   └── test_harness_runner.py
└── fixtures/
    ├── test_cases.json             # Pares pergunta→resposta do Anexo B
    └── sample_chunks.json          # Chunks de referência para testes
```

**Structure Decision**: Projeto único (single project) com três módulos: `orchestrator` (monta contexto), `enforcement` (filtros determinísticos) e `harness` (teste de prompts). Prompts versionados ficam em `prompts/` na raiz (tratados como artefatos, não código). Não há frontend — interação é via harness CLI e integração futura com Azure Bot Service.

## Complexity Tracking

> Sem violações na Constitution Check — seção não aplicável.
