# Design do Harness — NovaTech Assistant (Tech Lead, Cenário 3.1)

> O harness é o que separa um protótipo de um sistema de produção: o conjunto de verificações,
> limites e observabilidade que envolve o assistente. Projetado pelas **5 camadas**, cada uma com
> **o que já tem**, **o que falta** e **como fechar o gap**. Decisões herdadas dos cenários 1 e 2
> (ADRs, AGENTS.md, guardrails) são preservadas — o harness amarra tudo, não reinventa.

Estado de partida (cenário): 12% de respostas incorretas em teste interno (alucinação, doc
desatualizado, chunk errado); respostas em texto livre sem garantia de campos obrigatórios; um
módulo gerado por Copilot violou o AGENTS.md. Demo para a diretoria em 2 semanas.

---

## Camada 1 — Tool Orchestration
Coordenação de ingestão, retrieval e geração.

| | |
|---|---|
| **Tem** | Pipeline de ingestão (847 docs → Azure AI Search); `query` endpoint orquestra retrieval → `prompt-builder` → completion → `response-builder` (`src/functions/query/handler.ts`). Serviços atrás de interface (`SearchService`, `CompletionService`) com retry implícito no contrato. |
| **Falta** | Retry/backoff explícito e timeouts por chamada externa; decomposição multi-domínio (ADR-0002) ainda não implementada no orquestrador. |
| **Como fechar** | Adicionar política de retry com backoff exponencial em `src/services/*` (já previsto no plan do query endpoint); implementar o passo de decomposição por domínio quando a pergunta cruza SLA+frete+devolução. **Bloqueante p/ go-live:** timeouts (evitar requests pendurados). **Desejável:** decomposição multi-domínio. |

## Camada 2 — Verification Loops
Verificação automática de outputs antes de devolvê-los.

| | |
|---|---|
| **Tem** | Validação de **output com Zod** no handler (contrato `QueryResponse`); **verificação de fonte determinística** implementada nesta fase: `src/services/source-verifier.ts` marca como *suspeita* qualquer resposta cujo `source_document` não esteja na lista de documentos válidos (`POL-001`, `PROC-042`, `PROC-042-v2`, `SLA-2024`, `FAQ-Atendimento`). |
| **Falta** | Verificação de **groundedness** (a resposta de fato deriva dos chunks?) e o `response-validator.ts` completo (Dev 3.1) com os guardrails determinísticos (carga perigosa + devolução). |
| **Como fechar** | Encadear no handler: structured output → `verifySource` → guardrails de conteúdo → (se suspeita) rota HITL/resposta padrão. **Bloqueante:** `verifySource` + guardrail de carga perigosa. **Desejável:** groundedness automática. |

A função entregue nesta fase (recorte pedido no 3.1):
```ts
// src/services/source-verifier.ts
verifySource("PROC-042-v2#secao-2.1") // -> { suspect: false, citedDocId: "PROC-042-v2" }
verifySource("POL-999#secao-1")        // -> { suspect: true,  reason: "...não está na lista..." }
verifySource(undefined)                 // -> { suspect: true,  reason: "source_document ausente" }
```

## Camada 3 — Context & Memory
Manutenção de contexto entre interações, **respeitando o orçamento da ADR-0002 (cenário 1)**.

| | |
|---|---|
| **Tem** | `src/services/prompt-builder.ts` aplica o **orçamento de contexto da ADR-0002**: teto rígido de **16K tokens** de entrada (~2K system+guardrails, ~3–6K chunks/6 por padrão, ≤2K histórico de 3 trocas, pergunta no fim), com descarte determinístico (primeiro histórico antigo, depois chunks de menor score) e reordenação anti-lost-in-the-middle. |
| **Falta** | Memória conversacional viva (janela das últimas 3 trocas + resumo de entidades) e o **reset por mudança de tópico** descritos na ADR-0002 ainda não estão ligados ao bot do Teams. |
| **Como fechar** | Implementar o store de memória conversacional mínima conforme a ADR-0002 (não reinventar a estratégia — ela já está decidida); re-retrieval por turno; nunca tirar prazos/valores da memória, sempre do documento. **Bloqueante:** o teto de 16K já vale; **desejável:** resumo de entidades + reset por tópico. |

> Esta camada **não redefine** a estratégia de contexto — ela materializa a ADR-0002. Qualquer
> mudança de orçamento exige nova ADR.

## Camada 4 — Guardrails (structured outputs + HITL)
Limites que o sistema não pode ultrapassar — determinísticos (código) e probabilísticos (prompt).

| | |
|---|---|
| **Tem** | Guardrails do cenário 2 (DEVE/NÃO DEVE/QUANDO EM DÚVIDA) no system prompt (probabilístico); contrato `QueryResponse` com `source_document` obrigatório; `eslint no-console` e Zod (determinísticos). |
| **Falta** | **Structured output** formalizado `{ answer, source_document, confidence_score }` validado por Zod (hoje o contrato existe mas o `confidence_score` numérico do 3.1 não); guardrail determinístico de **carga perigosa + devolução**; e os **pontos de HITL**. |
| **Como fechar** | (a) **Structured output:** o modelo responde em JSON; rejeita-se programaticamente o que não bate com o schema — mais confiável que pedir a fonte no prompt, porque o campo é **validado**, não "lembrado". (b) **HITL — ponto concreto:** resposta com `confidence` baixa **sobre tema sensível** (carga perigosa, valores/multiplicadores, SLA com penalidade) **não vai direto ao atendente**: entra numa fila de revisão onde um atendente sênior/supervisor aprova antes de exibir. Também é HITL: toda mudança de system prompt ou novo documento na base (ver harness de produto). |

Split de enforcement (Princípio do cenário 1): o que é **crítico e verificável** vira código
(`source_document` obrigatório, fonte válida, negativa de carga perigosa); o que é **estilo/tom**
fica no prompt (português formal, citar seção).

## Camada 5 — Observability
Visibilidade do que acontece em produção.

| | |
|---|---|
| **Tem** | Logging estruturado **pino** (`src/shared/logger.ts`) com `route`, `durationMs`, `confidence`, `totalTokens`; `console.*` proibido por lint; health check dos MCP servers (`scripts/mcp-health-check.mjs`). |
| **Falta** | Métricas agregadas (perguntas/dia, % feedback negativo, latência p95, taxa de respostas suspeitas/HITL), alertas com threshold, e correlação por `queryId` ponta-a-ponta. |
| **Como fechar** | Emitir métricas a partir dos logs (Application Insights / equivalente); alertas concretos (ex.: *suspeita de fonte > 10% em 24h* → notificar o time; *latência p95 > 30s* → investigar). **Bloqueante:** log de toda resposta suspeita/bloqueada; **desejável:** dashboards completos. |

---

## Resumo go-live (bloqueante vs desejável)

| Camada | Bloqueante para o go-live | Desejável (pós go-live) |
|--------|---------------------------|--------------------------|
| Orchestration | timeouts nas chamadas externas | decomposição multi-domínio |
| Verification | `verifySource` + guardrail carga perigosa | groundedness automática |
| Context & memory | teto de 16K (ADR-0002) | resumo de entidades + reset por tópico |
| Guardrails | structured output + HITL p/ baixa confiança em tema sensível | confidence_score calibrado |
| Observability | log de respostas suspeitas/bloqueadas | dashboards + alertas completos |

A função de verificação da camada 2 está implementada e testada
([`src/services/source-verifier.ts`](../../src/services/source-verifier.ts),
[`tests/integration/source-verifier.test.ts`](../../tests/integration/source-verifier.test.ts)).
