# Skill (Domain) — azure-functions-endpoint (v1)

## Quando usar
Gerar um endpoint HTTP (Azure Functions v4) do NovaTech Assistant.

## Regras
- Use Azure Functions v4 com `app.http`.
- Valide o input com Zod.
- Use o logger pino de `src/shared/logger.ts`.
- Lance erros de `src/shared/errors.ts`.
- Separe handler, validator e response-builder.

## Exemplo (DO)
```ts
import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { z } from "zod";
import { logger } from "../../shared/logger.js";

const Schema = z.object({ value: z.string() });

export async function handler(req: HttpRequest): Promise<HttpResponseInit> {
  const data = Schema.parse(await req.json());
  logger.info({ route: "x" }, "ok");
  return { status: 200, jsonBody: { ok: true } };
}

app.http("x", { methods: ["POST"], authLevel: "function", handler });
```

## DON'T
- Não use `console.log`.
- Não retorne sem validar o input.

## Dependências
- Foundation: typescript-conventions, error-handling.
