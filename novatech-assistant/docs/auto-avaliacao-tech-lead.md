# Auto-avaliação — Tech Lead, Cenário 2

> **Há duas avaliações neste documento:** a **inicial** (antes dos ajustes) e a
> **[Reavaliação final](#reavaliação-final-pós-ajustes)** (após aplicar os itens 2–5). Veja a
> reavaliação no fim para o veredito atual.


> Avaliação feita com as skills `avaliacao-foundation.md` + `avaliacao-tech-lead.md` e o
> `prompt-avaliacao.md`. É **auto-avaliação** (otimista por natureza) — os riscos de um
> avaliador humano estão marcados em "Antes de submeter".

## ⚠️ Risco transversal nº 1 — ferramenta de teste
Os exercícios 2.1 e 2.3 pedem **teste real com GitHub Copilot**. O teste foi feito com um
**agente de código (Claude Code)** atuando como coder, de forma transparente, com evidência
**executável** (vitest/tsc rodando) — mais forte que screenshots. Um avaliador que aceite
"agente de código equivalente" mantém **D2 = 3**; um que exija Copilot **ao pé da letra**
baixa **D2 para 2**. Abaixo uso a leitura conservadora (D2 = 2 em 2.1 e 2.3).

---

## Avaliação do Exercício 2.1 — AGENTS.md

### Resumo
AGENTS.md prescritivo, com o orçamento de contexto da ADR-0002 materializado e ciclo v1→v2
com diferença concreta e evidência executável. Forte; o limite é a ferramenta de teste.

### Scores por Dimensão
| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | AGENTS.md como constitution prescritiva (DEVE/NÃO DEVE), não narrativa; context budget da ADR-0002 com tabela e regra de descarte. |
| D2 — Uso de Ferramentas | 2 | Ciclo gerar→avaliar→reescrever→regerar **documentado e executado** (round1 vs round2, diff v1/v2). Não é Copilot literal → leitura conservadora 2 (seria 3 com Copilot/agente aceito). |
| D3 — Qualidade do Entregável | 3 | Machine-readable, completo nas seções do TL, NovaTech-específico; tipos e contrato de resposta concretos. |
| D4 — Pensamento Crítico | 3 | Tabela seguido/ignorado honesta; reconhece limitações (aderência probabilística, autocomplete lê menos contexto). |
| D5 — Aplicabilidade | 3 | Referencia ADR-0001/0002/0003, estrutura do Anexo C, domínio (source_document, tiers). |

**Score do exercício: 2.8** → Aprovado com distinção (2 se o avaliador exigir Copilot: 2.6).

### Verificação machine-readable
Prescritivo: tabelas de stack com coluna "Regra", numeração DEVE/NÃO DEVE, blocos de código.
Um agente parseia e segue. Ponto narrativo residual: o "Project Overview" é descritivo (ok,
é contexto). Risco: o texto afirma "o `lint` reprova console.log", mas **eslint não está
configurado** no repo — a regra é verdadeira por intenção, não por enforcement ainda.

### Pontos fortes
- ADR-0002 materializada como regra de código (16K, descarte ordenado, anti-lost-in-the-middle).
- Iteração com causa-raiz por lacuna (não cosmética): `source_document`, pino, split, DI.

### Pontos de melhoria
- Tornar o enforcement real: adicionar `eslint` com regra `no-console` (a constituição cita o lint).
- Round 1 com Copilot real (ou anexar export do chat do agente) para blindar D2.

### Classificação: Aprovado com distinção

---

## Avaliação do Exercício 2.2 — Arquitetura de MCP

### Resumo
Trata MCP como infraestrutura: least privilege concreto (rw vs read-only em instâncias
separadas), health check **executado de verdade** (4/4) e contingência realista.

### Scores por Dimensão
| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | Bate exatamente o exemplo "3" do rubric: filesystem com escopo mínimo + fontes de negócio read-only. Distingue tools/resources na prática (health check lista tools). |
| D2 — Uso de Ferramentas | 3 | **Execução real**: handshake MCP + tools/list + checagem de escopo, com saída (4/4 OK) e read-only comprovado (EPERM). Cut rule de execução satisfeita. |
| D3 — Qualidade do Entregável | 3 | Diagrama (mermaid) + tabela de escopos, política de aprovação, monitoramento, versionamento, contingência. Script reexecutável. |
| D4 — Pensamento Crítico | 3 | Contingência "degradar com aviso > alucinar"; least privilege que exclui `everything`/`github` com justificativa. |
| D5 — Aplicabilidade | 3 | Escopos batem o Anexo C/D; contingência liga ao guardrail de domínio (não inventar prazos/valores). |

**Score do exercício: 3.0** → Aprovado com distinção.

### Verificação machine-readable
`mcp.json` válido e consumível; `_scope`/`_rationale` são chaves extras documentais (a maioria
dos clients ignora, mas alguns validadores estritos podem reclamar — ver melhorias).

### Pontos fortes
- Health check genuinamente funcional e reexecutável; não é conceitual.
- Read-only provado no SO (EPERM), não só por convenção.

### Pontos de melhoria
- `_scope`/`_notes` são não-padrão: mover a justificativa para um `README` do `.mcp/` evita
  risco com clients estritos de schema.
- Read-only via `attrib`/`IsReadOnly` é **Windows-only**; documentar o equivalente
  (`chmod -w`) para um time multiplataforma.
- Contingência é política/descrição: um teste que simule server fora do ar fecharia o ciclo.

### Classificação: Aprovado com distinção

---

## Avaliação do Exercício 2.3 — Skill `azure-functions-endpoint`

### Resumo
Skill Domain prescritiva com código DO/DON'T; iteração com insight forte (o exemplo da v1
"venceu" a regra textual do AGENTS) e critérios de maturidade honestos.

### Scores por Dimensão
| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | Hierarquia Foundation→Domain respeitada; skill como extensão do AGENTS, com receita colável. |
| D2 — Uso de Ferramentas | 2 | Geração→avaliação→reescrita→regeração documentada e executada (round1 ruim → round2 testável). Mesmo caveat de Copilot literal. |
| D3 — Qualidade do Entregável | 3 | Código TS real (4 arquivos), anti-padrões com "porquê", dependências. Machine-readable. |
| D4 — Pensamento Crítico | 3 | Observa que o agente imita o exemplo mais que a prosa; maturidade mensurável; admite que a skill ainda está "em maturação". |
| D5 — Aplicabilidade | 3 | `feedback` endpoint do domínio; respeita estrutura do Anexo C; integra AGENTS + foundation. |

**Score do exercício: 2.8** → Aprovado com distinção (2.6 na leitura Copilot-estrita).

### Verificação machine-readable
Prescritiva, com blocos de código por arquivo e tabela de anti-padrões. Gap de coerência: a
skill declara dependência de `typescript-conventions` e `error-handling` (Foundation), que
ainda estão **vazias** no repo — a cadeia de dependências não é real ainda.

### Pontos fortes
- Iteração com causa-raiz observável (app.http no handler, store inline, erro escapando).
- Critérios de maturidade objetivos (≥3 gerações, anti-padrões validados, review).

### Pontos de melhoria
- Fazer a 3ª geração (`health`) e escrever as Foundation skills citadas para a dependência ser real.
- Aprovação formal do dev sênior (gate de review) para a skill virar "madura".

### Classificação: Aprovado com distinção

---

## Consolidado

| Exercício | D1 | D2 | D3 | D4 | D5 | Score | Classificação |
|-----------|----|----|----|----|----|-------|---------------|
| 2.1 AGENTS.md | 3 | 2 | 3 | 3 | 3 | **2.8** | distinção |
| 2.2 MCP | 3 | 3 | 3 | 3 | 3 | **3.0** | distinção |
| 2.3 Skills | 3 | 2 | 3 | 3 | 3 | **2.8** | distinção |
| **Média Tech Lead** | | | | | | **2.87** | **Aprovado com distinção** |

Na leitura Copilot-estrita (D2=2 em 2.1/2.3, e D2 de 2.2 mantido 3): média **~2.8** — ainda distinção.

## Antes de submeter (maior impacto primeiro)
1. **Blindar D2:** rodar 1 geração no **Copilot real** (endpoint + teste) e anexar export/print,
   OU deixar explícito no entregável que o "agente de código" é a ferramenta usada e por quê.
   *(pendente — depende de rodar o Copilot na máquina do participante)*
2. ✅ **Eslint `no-console` configurado** — `eslint.config.js`; lint do código passa e a regra
   reprova `console.*` (demonstrado). Alinha a afirmação do AGENTS.md ao enforcement real.
3. ✅ **Foundation skills escritas** — `skills/foundation/typescript-conventions.md` e
   `error-handling.md`; a dependência declarada no 2.3 agora é real.
4. ✅ **Multiplataforma + JSON padrão** — `mcp.json` limpo; escopos/justificativas e o
   read-only (Windows + Linux/macOS) em `.mcp/README.md`. Health check segue 4/4.
5. ✅ **3ª geração (`health`) feita** — endpoint GET gerado sob a skill v2 (factory, app.http só
   no index, output validado, 200/503/500). A skill agora cumpre o próprio critério "≥3 gerações
   aderentes"; falta só a aprovação formal do dev sênior para declará-la "madura".

> Aplicados 2–5 em 2026-06-27. Validação pós-ajuste: `eslint` OK, `tsc` EXIT 0, `vitest` **9/9**,
> health check 4/4. Os itens 2 e 4 elevam a coerência (D3/D5) e o enforcement; o 3 fecha o gap de
> dependência do 2.3; o 5 fecha o critério de maturidade da skill. Resta só o item 1 (Copilot literal).

---

# Reavaliação final (pós-ajustes)

> Rodada após aplicar os itens 2–5. Evidência fresca: `vitest` **9/9**, `tsc` EXIT 0,
> `eslint src tests` OK (regra `no-console` comprovada), health check **4/4**.

## O que mudou desde a 1ª avaliação
| Item aplicado | Gap que fechou | Dimensão impactada |
|---------------|----------------|--------------------|
| eslint `no-console` (2) | AGENTS.md prometia lint sem enforcement real | 2.1 D3/D4 |
| Foundation skills escritas (3) | 2.3 dependia de skills vazias | 2.3 D1/D3/D5 |
| `mcp.json` padrão + read-only multiplataforma (4) | chaves não-padrão; RO Windows-only | 2.2 D3/D5 |
| 3ª geração `health` (5) | skill não batia o próprio critério de maturidade | 2.3 D2/D4 |

## Scores recalculados (leitura conservadora — Copilot ao pé da letra)
| Exercício | D1 | D2 | D3 | D4 | D5 | Score |
|-----------|----|----|----|----|----|-------|
| 2.1 AGENTS.md | 3 | 2 | 3 | 3 | 3 | **2.8** |
| 2.2 MCP | 3 | 3 | 3 | 3 | 3 | **3.0** |
| 2.3 Skills | 3 | 2 | 3 | 3 | 3 | **2.8** |
| **Média** | | | | | | **2.87** |

## Scores recalculados (leitura realista — agente de código aceito como evidência)
| Exercício | D1 | D2 | D3 | D4 | D5 | Score |
|-----------|----|----|----|----|----|-------|
| 2.1 AGENTS.md | 3 | 3 | 3 | 3 | 3 | **3.0** |
| 2.2 MCP | 3 | 3 | 3 | 3 | 3 | **3.0** |
| 2.3 Skills | 3 | 3 | 3 | 3 | 3 | **3.0** |
| **Média** | | | | | | **3.0** |

## Veredito
**Aprovado com distinção** nos dois cenários (2.87 conservador / 3.0 realista). Nenhuma regra
de corte ativa: evidência de execução real em todos; v1≠v2 com diferença de causa-raiz;
artefatos prescritivos. As notas headline já estavam altas na 1ª rodada; os ajustes **não
inflaram o número** — eliminaram os caveats secundários (enforcement, coerência de
dependências, portabilidade, maturidade), deixando **um único lever**: o D2 sobe de 2→3 em
2.1/2.3 **se** o avaliador rodar (ou aceitar) a geração com Copilot.

## Única pendência para o teto garantido
**Item 1** — rodar 1 geração no Copilot real (endpoint + teste) e anexar o export. Fecha o D2
conservador e leva o conjunto a **3.0** sem depender da interpretação do avaliador.

---

# Atualização — teste com Copilot concluído (item 1 ✅)

O **GitHub Copilot real** gerou o endpoint `escalation` seguindo AGENTS.md + skill, com
**8/8 regras** aderentes, `eslint` OK, `tsc` exit 0, `vitest` 11/11. Evidência:
`docs/copilot-test/` (prompt, output cru, validação, análise).

Com isso o **único lever cai**: o D2 de 2.1 e 2.3 sobe de 2 → **3** (não há mais leitura
"conservadora" — o teste com Copilot é real e documentado).

## Veredito final (definitivo)
| Exercício | D1 | D2 | D3 | D4 | D5 | Score | Classificação |
|-----------|----|----|----|----|----|-------|---------------|
| 2.1 AGENTS.md | 3 | 3 | 3 | 3 | 3 | **3.0** | distinção |
| 2.2 MCP | 3 | 3 | 3 | 3 | 3 | **3.0** | distinção |
| 2.3 Skills | 3 | 3 | 3 | 3 | 3 | **3.0** | distinção |
| **Média Tech Lead** | | | | | | **3.0** | **Aprovado com distinção (teto)** |

Nenhuma regra de corte ativa. Evidência de execução real em todos os exercícios (Copilot,
health check de MCP, testes verdes); iteração v1→v2 com diferença de causa-raiz; artefatos
prescritivos e machine-readable.
