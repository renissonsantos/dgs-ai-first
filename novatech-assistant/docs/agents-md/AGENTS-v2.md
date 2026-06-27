# AGENTS.md — NovaTech Assistant

> **Constitution do projeto.** Todo agente de IA (GitHub Copilot, Claude Code) DEVE ler
> este arquivo antes de gerar qualquer artefato. Contém decisões duráveis; é o contrato
> entre humanos e agentes. Regras são **prescritivas** (DEVE / NÃO DEVE), não descritivas.
>
> Versão: v2 (iterada após teste empírico com agente — ver `docs/agents-md/teste-agente.md`).
> Decisões técnicas rastreiam as ADRs do cenário 1 (`docs/adr/`).

---

## Project Overview

O NovaTech Assistant é um assistente interno de atendimento da NovaTech (logística). Ele
responde perguntas de atendentes sobre **SLAs, frete e devoluções** consultando a base
documental da empresa (847 documentos consolidados) via RAG. Toda resposta **cita a fonte**
e **nunca inventa** prazos, valores ou multiplicadores.

Componentes (4): (1) pipeline de ingestão, (2) API do assistente — `query` e `feedback`,
(3) bot do Teams, (4) painel web. Objetivo de negócio: atendente resolve a dúvida em
< 30 s, reduzindo tempo por chamado.

**Restrição desta fase:** o repositório é **Git local**. NÃO há remoto, GitHub, nem
recursos Azure provisionados. Endpoints DEVEM ser escritos como se fossem para Azure, mas
NÃO DEVEM abrir conexões reais a serviços externos (ver Coding Standards § Serviços).

## Tech Stack & Architecture

| Camada | Tecnologia | Regra |
|--------|-----------|-------|
| Linguagem | TypeScript **strict** | `tsconfig.json` já tem `strict: true`. NÃO desabilitar. |
| Runtime endpoints | Azure Functions **v4** (HTTP trigger) | Assinatura `(request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>`. |
| Validação | **Zod** | Validar input **e** output. |
| Retrieval | Azure AI Search | Acesso só via `src/services/search.ts`. |
| Completion | Azure OpenAI / **GPT-4o** (ADR-0001) | Acesso só via `src/services/completion.ts`. |
| Logging | **pino** via `src/shared/logger.ts` | NUNCA `console.log`/`console.error`. |
| Testes | **Vitest** | Ver seção Testing Standards. |
| Painel web | React | `src/web/`. |
| Infra | Bicep | `infra/` (estado narrativo nesta fase). |

### Organização de diretórios (DEVE seguir)

```
src/functions/<nome>/handler.ts        # HTTP trigger — orquestra, não contém regra de negócio
src/functions/<nome>/validator.ts      # schemas Zod de input/output
src/functions/<nome>/response-builder.ts  # monta o objeto de resposta com fonte
src/services/*.ts                      # integração externa (search, completion, prompt-builder)
src/shared/types.ts                    # tipos do domínio (QueryRequest, QueryResponse, ...)
src/shared/errors.ts                   # classes de erro (AppError e subclasses)
src/shared/logger.ts                   # logger pino exportado
tests/integration/<nome>.test.ts       # testes de integração do endpoint
```

Um endpoint NÃO DEVE ser um único `handler.ts` monolítico: separar handler / validator /
response-builder é obrigatório.

### Gerenciamento de contexto (ADR-0002) — obrigatório

O contexto é **gerenciado, não maximizado**. Orçamento por consulta (teto rígido **16K
tokens de entrada**, ~8× menor que os 128K da janela):

| Parte | Orçamento | Regra |
|-------|-----------|-------|
| System prompt + guardrails | ~2K (estático) | nunca truncado |
| Chunks recuperados | ~3–6K | **6 chunks** padrão; até **12** em pergunta multi-domínio |
| Histórico da sessão | ≤2K | últimas **3 trocas** + resumo de entidades ≤300 tok |
| Pergunta atual | ~0,2K | sempre no **fim** do prompt |

Regras que o código DEVE respeitar:
- A montagem do prompt vive em `src/services/prompt-builder.ts` e DEVE aplicar contabilidade
  de tokens determinística; ao exceder 16K, descartar **primeiro histórico mais antigo,
  depois chunks de menor score**. System/guardrails e a pergunta NUNCA são truncados.
- Re-retrieval a cada turno: NÃO DEVE carregar chunks de turnos anteriores adiante.
- Prazos/valores vêm sempre do documento recuperado, NUNCA da memória conversacional.

### Contrato de resposta da API (DEVE)

Toda resposta do `query` endpoint DEVE seguir o tipo `QueryResponse` de `src/shared/types.ts`
e incluir, mesmo com baixa confiança, o campo **`source_document`** (identificador do doc +
seção). Forma mínima:

```ts
type QueryResponse = {
  answer: string;
  source_document: string;   // ex: "PROC-042-v2#secao-3" — obrigatório
  confidence: "alta" | "media" | "baixa";
  low_confidence_warning?: string;
};
```

## Coding Standards (Tech Lead)

Derivados das ADRs do cenário 1. São regras que o agente DEVE seguir ao gerar código.

1. **Validação (Zod).** Todo handler DEVE validar o input com um schema Zod definido em
   `validator.ts` e validar o output contra o schema de `QueryResponse` antes de retornar.
   DON'T: confiar em `request.json()` sem parse/validação.
2. **Erros.** Lançar subclasses de `AppError` (`src/shared/errors.ts`): `ValidationError`
   (400), `RetrievalError` (502), `CompletionError` (502). O handler converte erro em
   `HttpResponseInit` com `status` e `{ error, code }`. DON'T: `throw new Error("...")`
   genérico nem `catch` silencioso.
3. **Logging.** Importar `logger` de `src/shared/logger.ts` (pino). Logar eventos com
   objeto estruturado: `logger.info({ route, durationMs }, "query handled")`. DON'T:
   `console.log` / `console.error` — proibidos (o `lint` reprova).
4. **Serviços externos.** Handlers NÃO DEVEM instanciar `OpenAIClient`/`SearchClient` nem
   ler `process.env.*_KEY` diretamente. Toda integração externa passa por `src/services/*`
   atrás de uma interface, com config lida em `src/shared/config.ts`. Nesta fase local, os
   services podem usar implementação stub/injetável — o handler depende da **interface**,
   não do SDK. Isso mantém o handler testável sem rede.
5. **Idioma.** Identificadores, comentários e mensagens de log em **inglês**. Texto voltado
   ao usuário final (respostas do assistente, mensagens de erro de negócio) e documentação
   de status em **português**.
6. **Commits.** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).

## Product Rules & Guardrails (Product Specialist)
<!-- TODO (Product Specialist — Ex. 2.3). Contrato técnico relacionado já fixado em
     "Contrato de resposta da API" acima: source_document obrigatório. -->

## Testing Standards (QA)
<!-- TODO (QA — Ex. 2.1). Até lá, vale o mínimo: Vitest, arrange/act/assert,
     assertions específicas (nunca só toBeDefined), services externos mockados. -->

## Project Management Rules (Delivery Manager)
<!-- TODO (Delivery Manager — Ex. 2.3) -->

## Build & Deploy

- `npm run lint` (eslint) → `npm test` (vitest run) → `npm run build` (tsc). CI roda os três.
- Branches de feature **locais**. "Abrir PR" = criar a branch e escrever a descrição em
  `docs/pull-requests/PR-NNNN.md` com: objetivo, mudanças, e checklist dos validation gates.
  A revisão é simulada localmente.
- **Validation gates** (cenário 2.1) que o agente DEVE respeitar ao gerar artefatos:
  - Gate 1 — Spec → Plan: PS aprova `requirements.md` antes do TL gerar `plan.md`.
  - Gate 2 — Tasks → Implement: TL aprova `tasks.md` antes do Dev iniciar.
  - Gate 3 — Code → Merge: TL faz code review; PR precisa de 1 approval.
  - Gate 4 — Tests → Deploy: QA valida cobertura/cenários; TL aprova deploy.
- Decisões técnicas ou de escopo DEVEM virar ADR em `docs/adr/` (`NNNN-titulo.md`).
