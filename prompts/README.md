# Prompts — Convenções e Governança

## Convenção de Nomes

```
prompts/
├── system/<slug>-v<NNN>.prompt.md     # Prompts de sistema
├── guardrails/<nome-do-guardrail>.md  # Instruções de guardrail
└── templates/<nome-do-template>.md    # Templates de resposta
```

- **Slug**: identificador curto, kebab-case (ex.: `base`, `citacao-obrigatoria`)
- **Versão**: 3 dígitos zero-padded (ex.: `v001`, `v002`)
- **Extensão**: `.prompt.md` para system prompts; `.md` para guardrails e templates

## Estrutura de um Prompt de Sistema

```yaml
---
slug: base
version: 1
type: system
author: tech-lead
created_at: 2026-06-01
status: production
estimated_tokens: 1800
principles: [I, II, III, V]
---

# Título do Prompt

Conteúdo em Markdown...
```

## Ciclo de Vida

```
draft → review → production → deprecated
  ↑        |
  └────────┘ (revisão reprova → volta a draft)
```

| Status | Significado |
|--------|-------------|
| `draft` | Criado/alterado pelo autor. Harness pode ser executado localmente. |
| `review` | PR aberto. Revisão obrigatória do Tech Lead. Harness executado como gate. |
| `production` | Aprovado e promovido. Prompt ativo no assistente. |
| `deprecated` | Substituído por nova versão. Mantido para histórico/rollback. |

## Processo de Revisão

1. **Autor** cria nova versão do prompt (`draft`)
2. **Autor** executa o harness localmente e verifica aderência
3. **Autor** abre PR com a nova versão (status → `review`)
4. **Tech Lead** revisa o PR:
   - Verifica conformidade com os princípios da constituição
   - Verifica resultado do harness (taxa de aderência ≥ baseline)
   - Aprova ou solicita alterações
5. **Merge** → status promovido a `production`
6. **Versão anterior** → status atualizado para `deprecated`

## Papéis

| Papel | Quem | Responsabilidade |
|-------|------|------------------|
| Autor | Qualquer membro da equipe | Propõe nova versão, executa harness local |
| Revisor (Tech Lead) | Tech Lead designado | Aprova/reprova PR, garante conformidade |
| Mantenedor | Tech Lead + DevOps | Promove a produção, gerencia rollback |

## Rollback

Para reverter um prompt a uma versão anterior:
1. Mudar status da versão atual para `deprecated`
2. Mudar status da versão desejada para `production`
3. Abrir PR com a alteração (mesmo processo de revisão)

## Classificação de Guardrails

| ID | Guardrail | Enforcement | Prompt | Código |
|----|-----------|-------------|--------|--------|
| GR-001 | Sempre citar fonte | both | `guardrails/citacao-obrigatoria.md` | `src/enforcement/citation_filter.py` |
| GR-002 | Nunca inventar tier/valor | both | `guardrails/nao-inventar.md` | `src/enforcement/hallucination_filter.py` |
| GR-003 | Escalar quando não souber | probabilistic | `guardrails/escalar-supervisor.md` | — |
| GR-004 | Português formal acessível | probabilistic | `guardrails/portugues-formal.md` | — |

**Legenda**:
- **both**: enforcement no prompt (probabilístico) E em código (determinístico). O filtro de código bloqueia a resposta se o guardrail não for cumprido.
- **probabilistic**: enforcement apenas no prompt. O modelo é instruído a cumprir, mas não há validação em código.
- **deterministic**: enforcement apenas em código (não aplicável nesta feature — todos os determinísticos também têm instrução no prompt).

## Referências

- [Constitution](./../.specify/memory/constitution.md) — Princípios I, II, III
- [ADR-0001](../docs/adr/ADR-0001-adotar-azure-openai-gpt-4o-como-llm-de-producao.md)
- [ADR-0002](../docs/adr/ADR-0002-gerenciar-contexto-com-orcamento-fixo-e-retrieval-reordenado.md)
