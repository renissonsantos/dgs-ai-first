# Skill (Foundation) — error-handling

> **Nível:** Foundation. Como erros e logging são tratados em todo o NovaTech Assistant.
> Depende de `typescript-conventions`. Pré-requisito da skill Domain `azure-functions-endpoint`.

## Quando usar (frase-ativação)
Qualquer código que lance, capture, mapeie erro, ou registre log.

## Regras prescritivas (DEVE)

1. **Hierarquia de erros própria.** Lance subclasses de `AppError` (`src/shared/errors.ts`),
   nunca `throw new Error("...")` genérico. Cada subclasse carrega `code` e `status` HTTP:
   `ValidationError` (400), `RetrievalError` (502), `CompletionError` (502).
2. **Mapeie erro → HTTP nas bordas.** Em handlers, um `try/catch` converte: `z.ZodError`→400,
   `AppError`→`err.status`, qualquer outro→500. **Um `AppError` NUNCA escapa do handler.**
3. **Nunca engula erro.** Proibido `catch {}` vazio ou `catch` que só faz `return`/log e segue
   como se nada tivesse acontecido. Ou trata (mapeia/recupera) ou re-lança.
4. **Logging só via pino** (`src/shared/logger.ts`). `console.log`/`console.error` são
   **proibidos** (o `eslint no-console` reprova). Log é objeto estruturado primeiro:
   `logger.info({ route, durationMs }, "mensagem")`.
5. **Níveis certos.** `error` = falha inesperada (500); `warn` = erro esperado de cliente
   (400/validação) ou degradação; `info` = evento de negócio (request atendido).
6. **Não vazar segredo/PII no log.** Logue `code`, `route`, ids — não o corpo bruto com chaves
   ou dados sensíveis.
7. **Mensagem ao usuário em português; identificadores/log em inglês.**

## DO
```ts
import { logger } from "../shared/logger.js";
import { isAppError } from "../shared/errors.js";
import { z } from "zod";

function toErrorResponse(err: unknown) {
  if (err instanceof z.ZodError) {
    logger.warn({ code: "VALIDATION_ERROR" }, "invalid input");
    return { status: 400, jsonBody: { error: "input inválido", code: "VALIDATION_ERROR" } };
  }
  if (isAppError(err)) {
    logger.warn({ code: err.code }, err.message);
    return { status: err.status, jsonBody: { error: err.message, code: err.code } };
  }
  logger.error({ err: String(err) }, "unhandled");
  return { status: 500, jsonBody: { error: "erro interno", code: "INTERNAL_ERROR" } };
}
```

## DON'T
```ts
try { await doWork(); }
catch (e) { console.error(e); }            // console proibido; erro engolido (segue como sucesso)

throw new Error("deu ruim");               // erro genérico, sem code/status → vira 500 sempre
```

## Anti-padrões (com o porquê)
| Anti-padrão | Por que aparece | Por que é errado |
|-------------|-----------------|------------------|
| `catch (e) { /* nada */ }` | "depois eu trato" | falha silenciosa; o pior tipo de bug |
| `throw new Error(msg)` | é o default | sem `code`/`status`; impossível mapear para 400/502 |
| `console.error` | hábito | proibido; não vai para o pipeline de logs estruturados |
| logar o body inteiro | debugar rápido | vaza segredo/PII |
| `AppError` escapando do handler | esqueceu o catch | host devolve 500 em vez do status correto |

## Dependências
- Foundation: `typescript-conventions`.
- Usa: `src/shared/errors.ts`, `src/shared/logger.ts`, `eslint.config.js` (regra `no-console`).
