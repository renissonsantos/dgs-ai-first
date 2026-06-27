# Análise — geração do Copilot (endpoint `escalation`)

> Teste real com **GitHub Copilot** (item 1). Prompt em [`PROMPT-copilot.md`](PROMPT-copilot.md);
> output cru preservado em [`output/`](output/); validação em [`validacao.txt`](validacao.txt).

## Aderência ao AGENTS.md + skill `azure-functions-endpoint`

| Regra (AGENTS.md / skill) | Copilot seguiu? | Evidência / observação |
|---------------------------|-----------------|------------------------|
| 4 arquivos (handler/validator/response-builder/index) | ✅ | os 4 arquivos em `src/functions/escalation/` |
| `app.http` só no `index.ts` | ✅ | `grep app.http(` → só `index.ts` (no handler é só comentário) |
| DI via interface `EscalationStore` (sem persistência inline) | ✅ | `escalation-store.ts` com interface + `InMemoryEscalationStore`; handler recebe `deps.store` |
| Zod no input **e** no output | ✅ | `EscalationInputSchema` no parse do body; `EscalationOutputSchema.parse(...)` antes de retornar |
| pino, zero `console.*` | ✅ | `logger.info/warn/error`; `grep console.` = 0; eslint `no-console` passou |
| `AppError` mapeado p/ status, não escapa | ✅ | `toErrorResponse`: ZodError→400, AppError→status, resto→500; `ValidationError` para body inválido |
| imports ESM com `.js`, sem `any`, strict | ✅ | imports `../../shared/logger.js` etc.; `tsc --noEmit` exit 0; sem `any` |
| teste com assertions específicas (sem `toBeDefined` solto) | ✅ | testa status 201, `escalationId`, `savedInputs`; e 400 `VALIDATION_ERROR` com store vazio |

**Resultado: 8/8 regras seguidas.** `eslint` OK, `tsc` exit 0, `vitest` 2/2 (suíte total 11/11).

## Detalhes que mostram que o Copilot leu a guidance (não foi sorte)
- Reproduziu o **mesmo padrão do `feedback`** (factory `create<Nome>Handler`, `toErrorResponse`,
  contador de id `esc-${++seq}`) — herdou a convenção do projeto, não um template genérico da web.
- Tratou **body inválido** com `request.json().catch(() => { throw new ValidationError(...) })` —
  exatamente o anti-padrão "confiar no `request.json()`" que o AGENTS.md proíbe.
- O **teste** usou um `FakeEscalationStore` injetado (sem rede) e checou `savedInputs` — segue o
  "injete um store fake" e "assertions específicas".

## Conclusão (2–3 frases)
O Copilot acertou **de primeira** as 8 regras não-negociáveis — não precisei de nenhum ajuste
estrutural; só preenchimento de regra de negócio (que já veio no contrato). Comparando com o
round 1 da skill v1 (que colapsava em 1 arquivo, persistia inline e deixava o erro escapar como
500), fica evidente que **AGENTS.md v2 + skill v2 mudaram o output**: a guidance prescritiva,
com exemplo colável, é o que faz o agente gerar código aderente. Confirma a tese do exercício:
artefatos para agentes precisam de refinamento empírico, e quando maduros, funcionam.
