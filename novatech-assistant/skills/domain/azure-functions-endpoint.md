# Skill (Domain) — azure-functions-endpoint

> **Nível:** Domain. Define como TODO endpoint HTTP do NovaTech Assistant é estruturado.
> Lida pelo agente antes de gerar qualquer Azure Function. Estende o `AGENTS.md` com o
> **padrão concreto** da camada de endpoints (o AGENTS.md diz as regras; esta skill mostra a
> receita colável).
>
> Versão: v2 (iterada após teste — ver `docs/skills/teste-azure-functions-endpoint.md`).

## Quando usar (frase-ativação)
"Criar/gerar um endpoint Azure Functions", "novo HTTP trigger", "implementar a API de X"
(query, feedback, health, etc.).

## Regras prescritivas (DEVE)

1. **Estrutura de 4 arquivos** por endpoint, em `src/functions/<nome>/`:
   - `validator.ts` — schemas Zod de **input e output**.
   - `response-builder.ts` — monta o objeto de resposta (puro, sem I/O).
   - `handler.ts` — **factory** `create<Nome>Handler(deps)` que retorna a função
     `(request, context) => Promise<HttpResponseInit>`. Orquestra; sem regra de negócio.
   - `index.ts` — **único** lugar com `app.http(...)`; injeta as deps reais (stubs na fase local).
2. **Injeção de dependência.** O handler recebe `deps` (services atrás de **interface**).
   NÃO instanciar SDK (`OpenAIClient`/`SearchClient`/cliente de DB) nem ler `process.env.*_KEY`
   dentro do handler (AGENTS.md § Coding Standards, rule 4). Persistência também é interface
   (ex.: `FeedbackStore`), nunca array/cliente inline no handler.
3. **`app.http` só no `index.ts`.** NUNCA registrar no `handler.ts` — senão o teste que importa
   o handler sobe o host das Functions. O `handler.ts` exporta apenas a factory.
4. **Validar input (quando houver) E output com Zod.** Input no início (endpoints `POST`/com
   body); a resposta é **sempre** validada contra o schema de output **antes** de retornar
   (garante o contrato, ex.: `source_document`). Em `GET` sem body, valida-se só o output.
5. **Mapa erro→HTTP no próprio handler.** `try/catch` envolve o fluxo; um `toErrorResponse`
   converte `z.ZodError`→400, subclasses de `AppError`→`err.status`, resto→500. Um `AppError`
   NUNCA escapa do handler (senão o host retorna 500 genérico).
6. **Logging** com `logger` (pino) de `src/shared/logger.ts`, objeto estruturado. Zero `console.*`.

## Exemplo completo (DO)

`validator.ts`
```ts
import { z } from "zod";

export const InputSchema = z.object({
  queryId: z.string().min(1),
  helpful: z.boolean(),
  comment: z.string().max(1_000).optional(),
});
export const OutputSchema = z.object({
  status: z.literal("registrado"),
  feedbackId: z.string().min(1),
});
```

`handler.ts`
```ts
import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod";
import { logger } from "../../shared/logger.js";
import { AppError, isAppError } from "../../shared/errors.js";
import type { FeedbackStore } from "../../services/feedback-store.js";
import { InputSchema, OutputSchema } from "./validator.js";
import { buildFeedbackResponse } from "./response-builder.js";

export interface FeedbackDeps { store: FeedbackStore; }

export function createFeedbackHandler(deps: FeedbackDeps) {
  return async function feedback(
    request: HttpRequest,
    _context?: InvocationContext,
  ): Promise<HttpResponseInit> {
    try {
      const input = InputSchema.parse(await request.json());        // valida input
      const saved = await deps.store.save(input);                   // service injetado
      const body = OutputSchema.parse(buildFeedbackResponse(saved)); // valida output
      logger.info({ route: "feedback", feedbackId: saved.id }, "feedback stored");
      return { status: 201, jsonBody: body };
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

function toErrorResponse(err: unknown): HttpResponseInit {
  if (err instanceof z.ZodError) {
    return { status: 400, jsonBody: { error: "input inválido", code: "VALIDATION_ERROR" } };
  }
  if (isAppError(err)) {
    return { status: err.status, jsonBody: { error: err.message, code: err.code } };
  }
  logger.error({ route: "feedback", err: String(err as AppError) }, "unhandled");
  return { status: 500, jsonBody: { error: "erro interno", code: "INTERNAL_ERROR" } };
}
```

`index.ts`
```ts
import { app } from "@azure/functions";
import { InMemoryFeedbackStore } from "../../services/feedback-store.js";
import { createFeedbackHandler } from "./handler.js";

const handler = createFeedbackHandler({ store: new InMemoryFeedbackStore() });
app.http("feedback", { methods: ["POST"], authLevel: "function", route: "feedback", handler });
```

## Anti-padrões (DON'T) — com o porquê

| Anti-padrão | Por que o agente gera | Por que é errado |
|-------------|------------------------|------------------|
| `app.http` dentro do `handler.ts` | é o exemplo "mínimo" mais comum na web | acopla o handler ao host; teste que importa o handler tenta registrar a function |
| `const store = []` (persistência inline) | parece simples e "funciona" | viola DI; impossível mockar; estado vaza entre requests; troca por DB depois quebra tudo |
| Validar só o input | a resposta "é minha, confio" | quebra o contrato em silêncio (ex.: esquece `source_document`) |
| `throw new ValidationError(...)` sem catch que mapeie | acha que lançar basta | o erro escapa e o host devolve 500, não 400 |
| `console.log`/`console.error` | hábito | proibido (AGENTS.md); o `lint` reprova |
| Handler monolítico (tudo em um arquivo) | menos arquivos | dificulta teste e review; viola a estrutura de 4 arquivos |

## Dependências (ler antes)
- Foundation: `typescript-conventions`, `error-handling`, `project-structure`.
- AGENTS.md: §§ "Organização de diretórios", "Coding Standards", "Contrato de resposta".
- Para endpoints RAG (query), combinar com a skill Domain `azure-ai-search-integration` e a
  Artifact `create-rag-endpoint`.
