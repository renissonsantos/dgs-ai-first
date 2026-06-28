# Auto-avaliação — Tech Lead, Cenário 3

> Avaliada com `avaliacao-foundation.md` (cenário 3) + `avaliacao-tech-lead.md` (cenário 3).
> Auto-avaliação (otimista). O cenário 3 tem 2 exercícios por papel e nível deliberadamente
> mais acessível — a régua considera isso.

## ⚠️ Nota de ferramenta
3.1 espera Copilot na função de verificação; foi gerada por **agente de código (Claude Code)** de
forma transparente, com evidência executável (vitest 6/6, eslint, tsc). 3.2 é "humano primeiro" —
a análise própria está em etapa separada, antes do co-review do Claude.

## Exercício 3.1 — Design do harness
| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | Explica structured output (campo validado > pedir no prompt) e HITL com gatilho de risco. |
| D2 — Uso de Ferramentas | 2 | Função gerada e testada (6/6), mas não é Copilot literal (leitura conservadora). |
| D3 — Qualidade | 3 | 5 camadas com tem/falta/como fechar; função **bloqueia/sinaliza**, não só descreve; testada. |
| D4 — Pensamento Crítico | 3 | Distingue bloqueante vs desejável; split prompt(probabilístico) vs código(determinístico). |
| D5 — Aplicabilidade | 3 | Context&memory ancorado na ADR-0002; guardrails do cenário 2; docs válidos do Anexo A. |
| **Score** | **2.8** | Aprovado com distinção (3.0 se aceito o agente de código). |

Checklist da skill do papel (3.1): 5 camadas ✅ · ADR-0002 sem reinventar ✅ · structured outputs +
HITL ✅ · função de verificação implementada e funcional ✅ · concretude (prescreve, não descreve) ✅.

## Exercício 3.2 — Revisão crítica da arquitetura gerada com IA
| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | Entende risco de IA em artefatos (aderência, governança, rollback). |
| D2 — Uso de Ferramentas | 3 | Análise própria → co-review Claude com riscos adicionais → comparação honesta. |
| D3 — Qualidade | 3 | Tabela por artefato + priorização acionável com risco residual explícito. |
| D4 — Pensamento Crítico | 3 | Pega as 2 armadilhas (skills sem refino; prompt sem changelog) e admite o que não viu. |
| D5 — Aplicabilidade | 3 | Liga a maturidade de skill (2.3), ao changelog do prompt e à ADR-0002. |
| **Score** | **3.0** | Aprovado com distinção. |

Checklist da skill do papel (3.2): skills sem refino = risco ✅ · prompt sem changelog = risco de
governança ✅ · análise própria antes do Claude ✅ · priorização pragmática ✅ · comparação honesta ✅.

## Consolidado
| Exercício | D1 | D2 | D3 | D4 | D5 | Score |
|-----------|----|----|----|----|----|-------|
| 3.1 Harness | 3 | 2 | 3 | 3 | 3 | **2.8** |
| 3.2 Revisão crítica | 3 | 3 | 3 | 3 | 3 | **3.0** |
| **Média cenário 3** | | | | | | **2.9** |

**Aprovado com distinção.** Nenhuma regra de corte ativa: a verificação **bloqueia/sinaliza** (não
só loga); a análise do 3.2 é própria e pega as armadilhas; artefatos referenciam cenários 1 e 2.
Único lever: rodar a função no Copilot real eleva o D2 de 3.1 (2→3) e a média a 3.0.
