<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/001-prompt-context-engineering/plan.md
<!-- SPECKIT END -->

# dgs-ai-first

Repositório das entregas da Trilha de Formação AI First da DGS. Cada cenário da trilha é
desenvolvido em sua própria branch (`cenario-1`, `cenario-2`, `cenario-3`).

**O contexto específico de cada cenário não fica fixo aqui.** Ele é fornecido por cenário —
em arquivos de contexto e/ou diretamente na spec correspondente. Este arquivo descreve apenas
o método de trabalho, que vale para qualquer cenário.

## Método de trabalho: ADR-first, depois spec-kit

```
contexto do cenário  →  ADR (decisão + devil's advocate)  →  spec-kit (specify → plan → tasks → implement)
```

1. **Entenda o contexto do cenário atual.** Leia os arquivos em `context/` referentes ao cenário em andamento e/ou o contexto descrito na spec. Não assuma dados de outros cenários.
2. **Registre as decisões arquiteturais como ADRs** em `docs/adr/`, antes de detalhar implementação. Para escrever um ADR com qualidade, use o skill **`escrever-adr`** (ver `.claude/skills/escrever-adr/`). Template em `docs/adr/ADR-template.md`.
3. **Detalhe a implementação com o spec-kit.** Cada ADR aceito vira uma ou mais specs via `/speckit.specify`. Fluxo completo em `docs/GUIA-spec-kit.md`.

## Onde está cada coisa

- `.specify/memory/constitution.md` — princípios inegociáveis do projeto (genéricos, valem para todos os cenários).
- `context/` — contexto por cenário e glossário de conceitos.
- `docs/adr/` — ADRs, template e índice.
- `docs/GUIA-spec-kit.md` — como usar o spec-kit a partir dos ADRs.
- `specs/` — specs geradas pelo `/speckit.specify`.

## Convenções

- Idioma dos artefatos: **português**.
- Trabalhe sempre na branch do cenário em andamento.
- ADRs e contexto são fonte de verdade para as specs — mantenha-os consistentes.
- Nunca invente dados do cenário; se faltar um dado, marque `[NECESSITA ESCLARECIMENTO]` em vez de chutar.
- Para escrever ADRs, acione o skill `escrever-adr` (não duplique as regras de ADR aqui).
