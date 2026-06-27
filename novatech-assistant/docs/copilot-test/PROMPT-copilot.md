# Teste com GitHub Copilot — roteiro e prompt (TL 2.1 e 2.3, item 1)

> Objetivo: gerar evidência de **teste real com Copilot** para blindar a dimensão D2 dos
> exercícios 2.1 (AGENTS.md) e 2.3 (skill `azure-functions-endpoint`). Alvo: um endpoint
> **novo** (`escalation`) — não existe no repo, então é geração genuína, comparável ao padrão.

## Pré-requisitos (1 min)
1. Abra a pasta `novatech-assistant` no **VS Code** com o **GitHub Copilot Chat** ativo.
2. Garanta que estes arquivos existem (já estão no repo) — o Copilot os lê do workspace:
   - `AGENTS.md`
   - `skills/domain/azure-functions-endpoint.md`
   - `skills/foundation/typescript-conventions.md`, `error-handling.md`
   - `src/shared/{types,errors,logger,config}.ts` (referência de padrão)
3. (Opcional, recomendado) abra o `src/functions/feedback/` ao lado para comparar.

---

## Prompt para colar no Copilot Chat (modo Agent/Edits, se disponível)

> Antes de colar: abra no VS Code a pasta `C:\Pessoal\IA First\novatech-assistant` (raiz do
> repo). Todos os caminhos abaixo são relativos a essa pasta.

```
Contexto: a raiz do workspace é C:\Pessoal\IA First\novatech-assistant (repositório
novatech-assistant). Todos os caminhos abaixo são relativos a essa raiz.

Leia o AGENTS.md e skills/domain/azure-functions-endpoint.md deste repositório e siga as duas
fontes à risca. Gere um endpoint NOVO chamado "escalation" (atendente escala um caso ao
supervisor), com a estrutura de 4 arquivos em src/functions/escalation/ e um teste de
integração em tests/integration/escalation.test.ts.

Contrato:
- POST /api/escalation
- Input: { queryId: string (>=1), reason: string (>=1, <=1000), attendantId: string (>=1) }
- Persistência via uma INTERFACE EscalationStore (com InMemoryEscalationStore para a fase
  local), em src/services/escalation-store.ts — NÃO persista inline no handler.
- Output: { status: "escalado", escalationId: string }, HTTP 201.
- Erros: input inválido -> 400 VALIDATION_ERROR; siga o mapa erro->HTTP do AGENTS.md.

Requisitos NÃO-NEGOCIÁVEIS (do AGENTS.md + skill):
- 4 arquivos: validator.ts (Zod input E output), response-builder.ts (puro), handler.ts
  (factory createEscalationHandler(deps)), index.ts (ÚNICO lugar com app.http).
- Injeção de dependência; o handler NÃO instancia SDK nem lê process.env.*_KEY.
- Logging só com o logger pino de src/shared/logger.js; ZERO console.*.
- Erros como subclasses de AppError de src/shared/errors.js; nenhum AppError escapa do handler.
- Imports ESM com extensão .js; TypeScript strict; nada de any.
- Teste Vitest com arrange/act/assert e assertions específicas (status, escalationId,
  VALIDATION_ERROR) — nada de toBeDefined() solto; injete um store fake, sem rede.

Gere todos os arquivos.
```

---

## O que capturar como evidência (checklist)
Salve tudo em `docs/copilot-test/`:

- [ ] **Print/Export do Copilot Chat** mostrando o prompt e a resposta (os arquivos gerados).
      Nome sugerido: `docs/copilot-test/copilot-chat-escalation.md` (ou `.png`).
- [ ] **Os arquivos gerados pelo Copilot**, exatamente como vieram, em
      `docs/copilot-test/output/` (antes de qualquer ajuste seu).
- [ ] **Saída da validação** (cole o terminal em `docs/copilot-test/validacao.txt`):
      ```
      npx eslint src tests
      npx tsc -p . --noEmit
      npx vitest run tests/integration/escalation.test.ts
      ```
- [ ] **Análise seguido/ignorado** preenchida (template abaixo) em
      `docs/copilot-test/analise.md`.

## Template de análise (preencha após gerar)

| Regra (AGENTS.md / skill) | Copilot seguiu? | Evidência / ajuste necessário |
|---------------------------|-----------------|-------------------------------|
| 4 arquivos (handler/validator/response-builder/index) | | |
| `app.http` só no index.ts | | |
| DI via interface `EscalationStore` (sem persistência inline) | | |
| Zod no input **e** no output | | |
| pino, zero `console.*` | | |
| `AppError` mapeado para 400/502 (não escapa) | | |
| imports ESM com `.js`, sem `any` | | |
| teste com assertions específicas (sem `toBeDefined` solto) | | |

> 2–3 frases de conclusão: o que o Copilot acertou de primeira, o que precisou de ajuste, e se
> a **skill** fez diferença sobre o AGENTS.md sozinho.

---

## Variante rigorosa (opcional — evidência mais forte do valor do AGENTS/skill)
Para mostrar o **delta** que o AGENTS.md + skill causam:
1. Renomeie temporariamente `AGENTS.md` → `AGENTS.md.bak` e
   `skills/domain/azure-functions-endpoint.md` → `...md.bak`.
2. Rode o **mesmo** prompt (sem a parte "Leia o AGENTS.md..."). Salve o output em
   `docs/copilot-test/output-sem-guidance/`.
3. Restaure os arquivos e compare: tipicamente o output "sem guidance" colapsa em 1 arquivo,
   usa `console.log`, persiste inline e valida só o input — exatamente os anti-padrões que a
   skill lista. Esse antes/depois é a evidência de iteração mais convincente.

## Como isso fecha o D2
Com o export do chat + os arquivos gerados + a validação verde, o avaliador vê **teste real
com Copilot** (geração → avaliação → ajuste). D2 de 2.1 e 2.3 sobe de 2 → 3, levando a média
do Tech Lead a **3.0**.
```
