# Teste empírico do AGENTS.md com agente — Tech Lead Ex. 2.1

> **Nota de método.** O enunciado pede teste com **GitHub Copilot**. Esta execução foi feita
> com um **agente de código (Claude Code)** atuando como o coder que lê o AGENTS.md antes de
> gerar — o protocolo (gerar → analisar aderência → reescrever seções → regerar) é idêntico
> e a evidência é executável (arquivos + saída de `vitest`/`tsc`), não screenshots. Onde o
> Copilot se comportaria diferente, está anotado.

## Protocolo

1. Escrever `AGENTS.md` **v1** (`docs/agents-md/AGENTS-v1.md`).
2. Pedir ao agente: "gere um Azure Function endpoint `query` e um teste", lendo **apenas** o
   AGENTS.md v1, sem skills. Output → `docs/agents-md/round1/`.
3. Analisar o que o agente seguiu e o que ignorou.
4. Reescrever as seções fracas → `AGENTS.md` **v2** (raiz do repo, `docs/agents-md/AGENTS-v2.md`).
5. Regerar com o v2. Output → código real em `src/` + `tests/integration/query.test.ts`.
6. Validar de verdade: `npx vitest run` e `npx tsc --noEmit`.

---

## Rodada 1 — output sob o AGENTS.md v1

Arquivos: [`round1/handler.ts`](round1/handler.ts), [`round1/handler.test.ts`](round1/handler.test.ts).

### O que o agente SEGUIU (v1 já era prescritivo)

| Regra do v1 | Seguiu? | Evidência no output |
|-------------|---------|---------------------|
| TypeScript + Azure Functions v4 (`app.http`) | ✅ | `app.http("query", {...})` |
| Zod para validar input | ✅ | `QuerySchema.parse(body)` |
| GPT-4o / Azure OpenAI + AI Search | ✅ | instancia `OpenAIClient` e `SearchClient` |
| Idioma (logs/identificadores) | ⚠️ parcial | identificadores em inglês, mas log em português |

### O que o agente IGNOROU (lacunas do v1)

| Problema no output | Causa-raiz no v1 | Impacto |
|--------------------|------------------|---------|
| `console.log`/`console.error` em vez de pino | v1 dizia "logging estruturado" sem proibir `console` nem indicar `src/shared/logger.ts` | viola padrão; passa despercebido |
| **Sem `source_document`** na resposta (`{ answer }` solto) | v1 não definia o contrato de resposta | quebra guardrail de produto (toda resposta cita fonte) |
| `class ValidationError extends Error {}` vazia, nunca usada; `catch` genérico → 500 | v1 dizia "classes de erro próprias" sem path nem mapa status→erro | erros mal classificados (tudo vira 500) |
| Handler **monolítico** (busca + prompt + completion + IO no mesmo arquivo) | v1 não exigia split handler/validator/response-builder | difícil testar e revisar |
| Lê `process.env.*_KEY` e abre conexões **reais** | v1 não proibia I/O externo real nesta fase local | não roda/testa sem rede e sem segredos |
| Sem orçamento de contexto: manda `chunks.join("\n")` cru | v1 citava a ADR-0002 mas não dava regra de código | risco de overflow / lost-in-the-middle |
| Teste com `expect(res).toBeDefined()` | v1 não tinha Testing Standards prescritivos | teste não verifica comportamento |

---

## Reescrita v1 → v2 (mudanças concretas)

Cada lacuna acima virou regra prescritiva no v2:

1. **Logging:** `## Coding Standards` rule 3 — "Importar `logger` de `src/shared/logger.ts`
   (pino). `console.log`/`console.error` proibidos (o `lint` reprova)."
2. **Contrato de resposta:** nova subseção `### Contrato de resposta da API (DEVE)` com o
   tipo `QueryResponse` e `source_document` **obrigatório**.
3. **Erros:** rule 2 — subclasses de `AppError` com mapa `ValidationError→400`,
   `RetrievalError/CompletionError→502`; proíbe `throw new Error` genérico e `catch` mudo.
4. **Split obrigatório:** `### Organização de diretórios` — handler/validator/response-builder
   separados; "NÃO DEVE ser um `handler.ts` monolítico".
5. **Serviços externos:** rule 4 — handlers não instanciam SDK nem leem `process.env.*_KEY`;
   dependem da **interface** de `src/services/*`; na fase local usam stub injetável.
6. **Orçamento de contexto (ADR-0002):** tabela de orçamento + regra de descarte determinístico
   em `src/services/prompt-builder.ts` (teto 16K; descarta histórico→chunks de menor score).

Diff resumido: v1 tinha **0** menções a `source_document`, `pino`, `AppError`, split de
arquivos e teto de 16K; v2 fixa as cinco como DEVE/NÃO DEVE. (`diff AGENTS-v1.md AGENTS-v2.md`.)

---

## Rodada 2 — output sob o AGENTS.md v2

Código real gerado seguindo o v2:

- `src/shared/{types,errors,logger,config}.ts` — contrato `QueryResponse`, hierarquia
  `AppError`, logger pino, config via Zod.
- `src/services/{search,completion,prompt-builder}.ts` — integração atrás de interface, com
  stub local; `prompt-builder` aplica o orçamento da ADR-0002 (16K, anti-lost-in-the-middle).
- `src/functions/query/{handler,validator,response-builder}.ts` + `index.ts` — split completo;
  `source_document` garantido; erros mapeados para status.
- `tests/integration/query.test.ts` — 4 cenários com arrange/act/assert e assertions
  específicas (status, `source_document`, `confidence`, aviso de baixa confiança).

### Aderência v2 (medida no output)

| Regra v2 | Seguiu? | Evidência |
|----------|---------|-----------|
| pino, zero `console.*` | ✅ | logs JSON do pino na saída do teste; `grep` por `console.` = 0 |
| `source_document` obrigatório | ✅ | teste "still include a source_document even when no chunk matches" passa |
| `AppError` + status corretos | ✅ | input vazio → 400 `VALIDATION_ERROR` |
| Split handler/validator/response-builder | ✅ | 3 arquivos + `index.ts` |
| Sem SDK/segredos no handler | ✅ | handler recebe `QueryDeps`; nenhum `process.env.*_KEY` |
| Orçamento de contexto | ✅ | `buildPrompt` mede tokens e descarta na ordem da ADR-0002 |

### Saída de execução real

```
$ npx vitest run tests/integration/query.test.ts
 ✓ tests/integration/query.test.ts (4 tests) 4ms
 Test Files  1 passed (1)
      Tests  4 passed (4)

$ npx tsc -p . --noEmit
EXIT: 0
```

---

## Limitações reconhecidas (honestidade do exercício)

O AGENTS.md **não resolve tudo** — e isso é esperado:

1. **Aderência é probabilística.** Mesmo com v2, um agente pode ignorar regras sob prompt
   ambíguo. O AGENTS.md reduz a variância, não a zera. Por isso regras críticas (proibir
   `console`, exigir `source_document`) são **também** reforçadas por código/lint/teste —
   enforcement determinístico, não só textual.
2. **Quanto maior o arquivo, menor a adesão.** Regras lá embaixo competem por atenção. Mantive
   o v2 em tabelas curtas e DEVE/NÃO DEVE; seções de outros papéis ficam como `TODO` para não
   inflar o contexto antes da hora.
3. **O Copilot inline (autocomplete) lê menos contexto** que um agente de chat; tende a seguir
   o estilo do arquivo aberto mais que o AGENTS.md. Mitigação: skills de Domain/Artifact (Ex. 2.3)
   dão exemplos colados ao código, que o autocomplete copia melhor.
4. **`source_document` é guardrail de produto** (dono: Product Specialist, Ex. 2.3). Fixei aqui
   só o **contrato técnico**; a regra de negócio completa entra na seção do PS.
