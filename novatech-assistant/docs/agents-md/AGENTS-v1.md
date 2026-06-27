# AGENTS.md — NovaTech Assistant (v1)

> Constitution do projeto. Todo agente de IA (Copilot, Claude Code) lê este arquivo
> antes de gerar qualquer artefato. Decisões duráveis; contrato entre humanos e agentes.

## Project Overview

O NovaTech Assistant é um assistente de atendimento interno da NovaTech (logística) que
responde perguntas de atendentes sobre SLAs, frete e devoluções a partir da base
documental da empresa (847 documentos), usando RAG. As respostas sempre citam a fonte e
nunca inventam prazos ou valores.

O sistema tem 4 componentes: pipeline de ingestão, API do assistente (query + feedback),
bot do Teams e painel web. Esta fase trabalha o repositório como Git **local** (sem
remoto/Azure real).

## Tech Stack & Architecture

- TypeScript em strict mode.
- Azure Functions v4 (HTTP triggers) para os endpoints.
- Azure AI Search (retrieval) + Azure OpenAI / GPT-4o (completion).
- Zod para validação de input e output.
- Vitest para testes.
- pino para logging.
- React para o painel web; Bicep para infraestrutura.

### Gerenciamento de contexto (ADR-0002)

O contexto é **gerenciado, não maximizado**. Orçamento por consulta: ~2K tokens de
system prompt + guardrails (estático) + ~3–6K de chunks (6 chunks por padrão, até 12 em
perguntas multi-domínio) + ≤2K de histórico (últimas 3 trocas) + a pergunta. Teto rígido
de 16K tokens de entrada.

## Coding Standards (Tech Lead)

- Use Zod para validar todo input e output dos endpoints.
- Use logging estruturado em vez de prints soltos.
- Trate erros com classes de erro próprias.
- Conventional Commits nas mensagens de commit.
- Comentários e identificadores de código em inglês; documentação de status em português.

## Product Rules & Guardrails (Product Specialist)
<!-- TODO (Product Specialist — Ex. 2.3) -->

## Testing Standards (QA)
<!-- TODO (QA — Ex. 2.1) -->

## Project Management Rules (Delivery Manager)
<!-- TODO (Delivery Manager — Ex. 2.3) -->

## Build & Deploy

- `npm run build` (tsc), `npm run lint` (eslint), `npm test` (vitest).
- Branches de feature locais. "Abrir PR" = criar a branch e escrever a descrição em
  `docs/pull-requests/PR-NNNN.md`. Revisão simulada localmente.
- CI roda lint + test + build.
