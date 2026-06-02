# Data Model: Prompt & Context Engineering

**Date**: 2026-06-01 | **Plan**: [plan.md](plan.md)

## Entities

### PromptArtifact (Artefato de Prompt)

Arquivo versionado contendo instruções ao modelo.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| slug | string | Identificador curto único (ex.: `base`, `citacao-obrigatoria`) |
| version | int | Número sequencial da versão (v001, v002, ...) |
| type | enum | `system` \| `guardrail` \| `template` |
| content | text | Conteúdo Markdown das instruções ao modelo |
| author | string | Quem criou/alterou esta versão |
| created_at | datetime | Data de criação da versão |
| status | enum | `draft` \| `review` \| `production` \| `deprecated` |
| metadata | dict | Frontmatter YAML (tokens estimados, princípios aplicáveis, notas) |

**Convenção de nome de arquivo**: `<slug>-v<NNN>.prompt.md`

**Relacionamentos**:
- Um PromptArtifact do tipo `system` compõe-se de vários `guardrail` (composição modular).
- Um PromptArtifact pode ter múltiplas versões (histórico linear por slug).

---

### ContextAnatomy (Anatomia de Contexto)

Especificação das partes que compõem cada chamada ao modelo.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| part_name | string | Nome da parte (ex.: `system_prompt`, `guardrails`, `chunks`, `history`, `query`) |
| type | enum | `static` \| `dynamic` |
| budget_tokens | int | Orçamento máximo em tokens para esta parte |
| position | enum | `start` \| `middle` \| `end` |
| truncatable | bool | Se pode ser descartada quando o total excede o teto |
| discard_priority | int | Ordem de descarte (menor = descartado primeiro). System/guardrails e query = nunca |

**Valores de referência (ADR-0002)**:

| Parte | Tipo | Orçamento | Posição | Descartável | Prioridade descarte |
|-------|------|-----------|---------|-------------|---------------------|
| system_prompt + guardrails | static | ~2.000 tok | start | não | — |
| chunks (single-domínio) | dynamic | ~3.000–3.600 tok (6×~500) | middle (V-order) | sim | 2 (menor score primeiro) |
| chunks (multi-domínio) | dynamic | ~3.000–6.000 tok (até 12×~500) | middle (V-order) | sim | 2 |
| history (janela deslizante) | dynamic | ≤2.000 tok | middle | sim | 1 (mais antigo primeiro) |
| entity_summary | dynamic | ≤300 tok | middle | sim | 1 |
| query (pergunta atual) | dynamic | ~200 tok | end | não | — |
| **Teto rígido** | — | **16.000 tok** | — | — | — |
| Reserva resposta | output | ~1.000 tok | — | — | — |

---

### TestCase (Caso de Teste do Harness)

Par pergunta→resposta esperada com metadados para avaliação.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único do caso (ex.: `TC-001`) |
| question | text | Pergunta a enviar ao assistente |
| reference_chunks | list[string] | IDs dos chunks que devem fundamentar a resposta (Anexo B) |
| expected_source | string | Documento-fonte esperado na citação (ex.: `SLA-2024`) |
| forbidden_terms | list[string] | Termos que NÃO devem aparecer (ex.: `Platinum`) |
| expected_behavior | enum | `answer_with_citation` \| `refuse_and_escalate` \| `show_conflict` |
| domain | string | Domínio da pergunta (ex.: `sla`, `frete`, `devolucao`) |
| notes | text | Observações sobre o caso (armadilhas, edge cases) |

---

### EvaluationResult (Resultado de Avaliação)

Resultado da avaliação de uma resposta do LLM pelo harness.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| test_case_id | string | Referência ao TestCase avaliado |
| prompt_version | string | Slug + versão do prompt usado (ex.: `base-v001`) |
| response_text | text | Resposta bruta do LLM |
| criteria_scores | dict | Score por critério (0.0–1.0): `citation`, `no_hallucination`, `no_forbidden_terms` |
| overall_adherence | float | Média ponderada dos critérios |
| blocked_by_filter | bool | Se o filtro determinístico bloqueou esta resposta |
| filter_reason | string \| null | Motivo do bloqueio (ex.: `missing_citation`, `invented_tier`) |
| timestamp | datetime | Quando a avaliação foi executada |
| model_version | string | Versão do deployment do modelo (ex.: `gpt-4o-2024-05-13`) |

---

### Guardrail (Regra de Comportamento)

Classificação de enforcement de cada guardrail.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador (ex.: `GR-001`) |
| name | string | Nome descritivo (ex.: "Citar fonte obrigatoriamente") |
| description | text | O que o guardrail exige |
| enforcement_type | enum | `probabilistic` \| `deterministic` \| `both` |
| prompt_instruction | string \| null | Referência ao artefato de prompt que contém a instrução |
| code_filter | string \| null | Referência ao módulo de código que implementa o filtro |
| fallback_action | string | Ação quando o guardrail é violado (ex.: "bloquear e sugerir escalar") |

**Guardrails do NovaTech (classificação)**:

| ID | Guardrail | Enforcement | Prompt | Código |
|----|-----------|-------------|--------|--------|
| GR-001 | Sempre citar fonte | both | `guardrails/citacao-obrigatoria.md` | `enforcement/citation_filter.py` |
| GR-002 | Nunca inventar tier/valor | both | `guardrails/nao-inventar.md` | `enforcement/hallucination_filter.py` |
| GR-003 | Escalar quando não souber | probabilistic | `guardrails/escalar-supervisor.md` | — |
| GR-004 | Português formal acessível | probabilistic | `guardrails/portugues-formal.md` | — |

---

## State Transitions

### PromptArtifact Lifecycle

```
draft → review → production → deprecated
  ↑        |
  └────────┘ (revisão reprova → volta a draft)
```

- **draft**: Criado/alterado pelo autor. Harness pode ser executado localmente.
- **review**: PR aberto, revisão obrigatória do Tech Lead. Harness executado como gate.
- **production**: Aprovado e promovido. É o prompt ativo no assistente.
- **deprecated**: Substituído por nova versão. Mantido para histórico/rollback.

### Response Pipeline (filtro determinístico)

```
Query → Context Builder → LLM → [citation_filter] → [hallucination_filter] → Resposta ao atendente
                                       |                      |
                                       ↓                      ↓
                                  (bloqueado)            (bloqueado)
                                       ↓                      ↓
                                  fallback_handler → "Não encontrei resposta, escalar"
```
