# Entregáveis — Tech Lead, Cenário 3 (Governança e Validação)

Tópicos: **Harness Engineering** (HITL + Structured Outputs) e **Revisão Crítica de Outputs de IA**.
Reusa artefatos dos cenários 1 (ADRs) e 2 (AGENTS.md, skills, guardrails).

## 3.1 — Design do harness do projeto (Harness Engineering)
| Entregável | Caminho |
|-----------|---------|
| Design do harness (5 camadas: tem/falta/como fechar) | [`docs/harness/harness-design.md`](harness/harness-design.md) |
| Função de verificação (camada Verification loops) | [`src/services/source-verifier.ts`](../src/services/source-verifier.ts) |
| Testes da verificação | [`tests/integration/source-verifier.test.ts`](../tests/integration/source-verifier.test.ts) |

Destaques: Context & memory conecta-se à **ADR-0002** (teto de 16K, não reinventa); Guardrails
indicam **structured outputs** e um ponto de **HITL** (baixa confiança em tema sensível → revisão
humana). A função `verifySource` marca como suspeita qualquer resposta cujo `source_document` não
esteja na lista de docs válidos (`POL-001`, `PROC-042`, `PROC-042-v2`, `SLA-2024`, `FAQ-Atendimento`).

## 3.2 — Revisão crítica da arquitetura gerada com IA (Revisão Crítica)
| Entregável | Caminho |
|-----------|---------|
| Avaliação própria + co-review Claude + priorização (2 semanas) | [`docs/revisao-arquitetura-ia.md`](revisao-arquitetura-ia.md) |

Destaques: identifica as 2 armadilhas centrais — **skills sem refinamento** (output inconsistente)
e **system prompt sem changelog** (rollback cego/governança) — e prioriza pragmaticamente o que
reduz mais risco no prazo, aceitando risco residual explícito.

## Validação (executada)
```bash
cd novatech-assistant
npm install
npx eslint src tests       # OK (no-console)
npx tsc -p . --noEmit      # EXIT 0
npx vitest run             # 17 passed (11 cenário 2 + 6 source-verifier)
```
