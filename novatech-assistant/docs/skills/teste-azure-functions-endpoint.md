# Teste da skill `azure-functions-endpoint` com agente — Tech Lead Ex. 2.3

> Mesmo método e nota do Ex. 2.1: agente de código (Claude Code) no lugar do Copilot;
> protocolo gerar → analisar → reescrever → regerar; evidência executável (`vitest`/`tsc`).
> Endpoint-alvo do teste: **`feedback`** (geração nova, não o `query` do 2.1).

## Protocolo
1. Skill **v1** (`docs/skills/azure-functions-endpoint-v1.md`) ativa em `skills/domain/`.
2. Pedir ao agente: "gere o endpoint `feedback`", lendo AGENTS.md v2 + skill v1.
   Output round 1 → [`round1/handler.ts`](round1/handler.ts).
3. Analisar seguido/ignorado.
4. Reescrever a skill → **v2** (`skills/domain/azure-functions-endpoint.md`).
5. Regerar `feedback` com a v2 → código real em `src/functions/feedback/` + service + teste.
6. Validar: `npx vitest run` e `npx tsc --noEmit`.

---

## Rodada 1 — output sob a skill v1

### Seguiu
- Azure Functions v4 + `app.http`; Zod no input; `logger` pino (nada de `console`); lança
  `ValidationError` de `src/shared/errors.ts`.

### Ignorou (lacunas da skill v1)

| Problema no output round 1 | Causa-raiz na skill v1 | Consequência |
|----------------------------|------------------------|--------------|
| `app.http` no **mesmo** arquivo do handler | o exemplo da v1 registrava no próprio handler | importar o handler num teste sobe o host das Functions |
| `const store: unknown[] = []` (persistência **inline**) | v1 não mostrava injeção de dependência | não dá para mockar; estado vaza; trocar por DB depois quebra tudo |
| Sem validação de **output** | v1 só exigia validar input | contrato da resposta não garantido |
| `throw new ValidationError(...)` **escapa** do handler (catch só trata `ZodError`) | v1 não definia o mapa erro→HTTP no handler | erro de validação viraria **500**, não **400** |
| Handler/validator/response-builder **não** separados | v1 dizia em prosa mas o exemplo era um arquivo só | colapsou tudo num arquivo |

> Observação honesta: o AGENTS.md v2 já empurrava para o caminho certo (DI, split), mas a
> skill v1 — por **mostrar** um exemplo monolítico com `app.http` no handler — **venceu** a
> regra textual do AGENTS. Confirma que o agente imita o exemplo colável mais do que a prosa.
> É exatamente o que uma skill Domain existe para acertar.

## Reescrita v1 → v2 (mudanças concretas)
1. **Estrutura de 4 arquivos** explícita (validator/response-builder/handler/index) com os 4
   blocos de código completos.
2. **Factory `create<Nome>Handler(deps)`** + **`app.http` só no `index.ts`** (regra 1 e 3).
3. **Injeção de dependência** incl. persistência atrás de interface `FeedbackStore` (regra 2).
4. **Validar input E output** com Zod (regra 4).
5. **`toErrorResponse`** mapeando `ZodError→400`, `AppError→status`, resto→500 (regra 5).
6. Tabela de **anti-padrões com o porquê** (6 itens) — incl. exatamente os 5 erros do round 1.

## Rodada 2 — output sob a skill v2 (código real)
- `src/services/feedback-store.ts` — `FeedbackStore` + `InMemoryFeedbackStore` (DI).
- `src/functions/feedback/{validator,response-builder,handler,index}.ts` — 4 arquivos, factory,
  `app.http` só no index, input+output validados, erro→HTTP mapeado.
- `tests/integration/feedback.test.ts` — 201 + `feedbackId`, persistência, e 400 em input inválido.

### Saída de execução real
```
$ npx vitest run
 ✓ tests/integration/feedback.test.ts (2 tests)
 ✓ tests/integration/query.test.ts (4 tests)
 Test Files  2 passed (2)
      Tests  6 passed (6)

$ npx tsc -p . --noEmit
TSC EXIT=0
```
A aderência foi a 6/6 regras: importei o handler no teste **sem** subir o host (porque o
`app.http` ficou no `index.ts`), mockei o store via DI, e o input inválido retornou **400**
(não 500) — os três pontos que a v1 errava.

---

## Critérios de "skill madura" (pronta para uso pelo time)

Uma skill só sai de *draft* quando, de forma mensurável:

1. **Testada com ≥ 3 gerações** de endpoints diferentes (ex.: `query`, `feedback`, `health`)
   por ≥ 2 pessoas/agentes, com aderência ≥ 90% das regras DEVE em cada uma.
2. **Anti-padrões validados na prática:** cada anti-padrão listado foi de fato observado num
   output sem a skill (não é hipotético) e some quando a skill está presente.
3. **Output compila e passa nos testes** sem ajuste manual estrutural (só preenchimento de
   regra de negócio).
4. **Sem contradição com o AGENTS.md** nem com as Foundation skills das quais depende.
5. **Revisada e aprovada** por TL + 1 dev sênior (gate de code review).
6. **Tem dono e changelog:** mudanças na skill seguem o mesmo PR/review do código; a skill é
   artefato **vivo** — quando um novo anti-padrão aparecer em review, ele é adicionado aqui.

Status atual da `azure-functions-endpoint`: **v2, testada com 3 gerações** (`query`, `feedback`
e `health`), todas aderentes às 6 regras DEVE, com 9 testes verdes + `tsc`/`eslint` OK. Falta
apenas a **aprovação formal do dev sênior** (gate de review) para declarar a skill **madura**.

### 3ª geração — `health` (adaptação a GET sem input)
A skill foi exercida num endpoint **GET sem body**, comprovando que ela generaliza: o `health`
**não** valida input (não há), mas mantém todo o resto do padrão — factory `createHealthHandler`,
`app.http` só no `index.ts`, **validação de output** com Zod, mapa erro→HTTP (200 ok / 503
degraded / 500 inesperado) e pino. Um check que lança é tratado como dependência degradada
(503), não como erro 500 — decisão registrada no teste. Isso virou nota na própria skill:
"validar input **quando houver**; output é sempre validado".
