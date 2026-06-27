# Skill (Foundation) — typescript-conventions

> **Nível:** Foundation. Convenções globais de TypeScript do NovaTech Assistant. Toda skill
> Domain/Artifact depende desta. Lida pelo agente antes de gerar qualquer `.ts`.

## Quando usar (frase-ativação)
Qualquer geração de código TypeScript no projeto.

## Regras prescritivas (DEVE)

1. **Strict mode sempre.** `tsconfig.json` tem `strict: true` — NÃO desabilitar nem usar
   `// @ts-ignore`/`// @ts-nocheck`. Se o tipo não fecha, conserte o tipo.
2. **ESM com extensão `.js` nos imports relativos.** O projeto é `"type": "module"` com
   `moduleResolution: "Bundler"`/Node ESM. Importe `from "../shared/logger.js"` (não
   `"../shared/logger"`), mesmo o arquivo sendo `.ts`.
3. **`import type` para tipos.** O que é só tipo entra como `import type { X } from "..."` —
   evita imports em runtime desnecessários e deixa claro o que é contrato.
4. **Nada de `any`.** Use `unknown` + narrowing, generics, ou um tipo do domínio
   (`src/shared/types.ts`). `request.json()` retorna `unknown` → valide com Zod antes de usar.
5. **Nomenclatura.** `PascalCase` para tipos/classes, `camelCase` para variáveis/funções,
   `UPPER_SNAKE` só para constantes de módulo. Identificadores e comentários em **inglês**.
6. **Tipos do domínio centralizados** em `src/shared/types.ts`. NÃO redeclarar `QueryResponse`,
   `RetrievedChunk`, etc. em cada arquivo — importe.
7. **Funções puras quando possível.** Builders (`response-builder.ts`, `prompt-builder.ts`) não
   fazem I/O; recebem dados e devolvem dados — fáceis de testar.

## DO
```ts
import type { RetrievedChunk } from "../shared/types.js"; // type-only, com .js

export function topSource(chunks: readonly RetrievedChunk[]): string {
  return chunks[0]?.sourceDocument ?? "sem-fonte";
}
```

## DON'T
```ts
import { RetrievedChunk } from "../shared/types";   // sem .js, import de valor para um tipo
export function topSource(chunks: any) {            // any
  return chunks[0].sourceDocument;                  // acesso sem narrowing → crash em runtime
}
```

## Anti-padrões (com o porquê)
| Anti-padrão | Por que aparece | Por que é errado |
|-------------|-----------------|------------------|
| `import "./x"` sem `.js` | hábito de bundler/CJS | quebra em ESM Node em runtime |
| `as any` para "calar" o compilador | pressa | apaga a segurança que o strict dá |
| `// @ts-ignore` | erro chato | esconde bug; proibido |
| tipo duplicado em vários arquivos | copiar/colar | divergem com o tempo; use `src/shared/types.ts` |

## Dependências
Nenhuma (é base). É pré-requisito de `error-handling`, `project-structure` e de toda skill Domain.
