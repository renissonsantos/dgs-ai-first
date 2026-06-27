# dgs-ai-first

Entregas da **Trilha de Formação AI First da DGS** — papel **Tech Lead**. O repositório reúne os
exercícios da trilha, organizados por cenário, cada um em sua própria branch.

> Exercícios de formação. Não utilizam dados de clientes reais — o cenário e a documentação são
> simulados.

## Modelo de branches

Cada cenário da trilha é entregue em uma branch dedicada:

| Branch | Cenário | Status |
|--------|---------|--------|
| `cenario-1` | Fundamentos de IA Generativa, Engenharia de Prompt, Engenharia de Contexto, RAG e MCP | Entregue |
| `cenario-2` | Estruturação do Trabalho — MCP, Recorte de Domínio e SDD, AGENTS.md e Skills | Entregue |
| `cenario-3` | _a definir_ | Pendente |

> A fase 2 é entregue na branch `cenario-2`, na subpasta [`novatech-assistant/`](novatech-assistant/)
> (projeto TypeScript/Azure). A fase 1 permanece na raiz.

## Cenário 1 — Assistente de IA com RAG da NovaTech

A NovaTech (logística) quer um assistente que responda dúvidas dos atendentes em linguagem natural,
fundamentado na documentação oficial e com citação de fonte. Contexto completo do cenário em
[`context/cenario-1-novatech.md`](context/cenario-1-novatech.md).

Entregáveis do Tech Lead:

- **Ex. 1.1 — Decisões arquiteturais (ADRs):** quatro decisões fundamentadas com debate de *devil's advocate*. Ver [`docs/adr/`](docs/adr/).
  - ADR-0001 — Modelo de LLM (Azure OpenAI / GPT-4o)
  - ADR-0002 — Gerenciamento de contexto (orçamento fixo, retrieval reordenado, memória mínima)
  - ADR-0003 — Documentos contraditórios (ambas as versões com vigência + resolução determinística)
  - ADR-0004 — Build vs buy do pipeline de RAG
- **Ex. 1.2 — Prompt & context engineering como artefato de arquitetura:** estratégia versionada, anatomia de contexto, harness de teste de prompts e split de enforcement probabilístico vs determinístico. Documento em [`docs/estrategia-prompt-context-engineering.md`](docs/estrategia-prompt-context-engineering.md); código em [`src/`](src/) e [`prompts/`](prompts/); spec em [`specs/001-prompt-context-engineering/`](specs/001-prompt-context-engineering/).
- **Ex. 1.3 — Revisão crítica de proposta de RAG:** revisão própria vs revisão do Claude, comparação e proposta reescrita. Ver [`docs/revisao-proposta-rag.md`](docs/revisao-proposta-rag.md).

## Cenário 2 — Estruturação do Trabalho (NovaTech Assistant)

Aprovado o projeto, o time estrutura o ambiente e os artefatos que governam o desenvolvimento
AI First: as conexões dos agentes (MCP), o recorte de domínio (SDD), a *constitution* do projeto
(AGENTS.md) e as skills reutilizáveis. A fase parte do starter (Anexo D) e é desenvolvida na
subpasta [`novatech-assistant/`](novatech-assistant/) (projeto TypeScript/Azure Functions).

Entregáveis do Tech Lead (índice em [`novatech-assistant/docs/ENTREGAVEIS-tech-lead-cenario2.md`](novatech-assistant/docs/ENTREGAVEIS-tech-lead-cenario2.md)):

- **Ex. 2.1 — Construção e teste do AGENTS.md:** *constitution* prescritiva com o orçamento de
  contexto da ADR-0002, testada com agente e iterada v1→v2. Ver
  [`novatech-assistant/AGENTS.md`](novatech-assistant/AGENTS.md) e
  [`novatech-assistant/docs/agents-md/`](novatech-assistant/docs/agents-md/).
- **Ex. 2.2 — Arquitetura de MCP:** servers locais com *least privilege* (filesystem rw +
  fontes de negócio read-only, git, memory), health check **executável** (4/4) e plano de
  contingência. Ver [`novatech-assistant/.mcp/`](novatech-assistant/.mcp/),
  [`novatech-assistant/scripts/mcp-health-check.mjs`](novatech-assistant/scripts/mcp-health-check.mjs)
  e [`novatech-assistant/docs/mcp/`](novatech-assistant/docs/mcp/).
- **Ex. 2.3 — Skills técnicas:** skill `azure-functions-endpoint` testada em 3 gerações (query,
  feedback, health) + teste real com Copilot (escalation). Ver
  [`novatech-assistant/skills/`](novatech-assistant/skills/) e
  [`novatech-assistant/docs/skills/`](novatech-assistant/docs/skills/).

Qualidade verificada: `eslint` (no-console), `vitest` 11/11, `tsc` strict (exit 0), health check
4/4. Auto-avaliação: 3.0 — [`novatech-assistant/docs/auto-avaliacao-tech-lead.md`](novatech-assistant/docs/auto-avaliacao-tech-lead.md).

### Como rodar (Cenário 2)

Requer Node.js 20+.

```bash
cd novatech-assistant
npm install
npm run lint          # eslint (no-console)
npx tsc -p . --noEmit # type-check strict
npx vitest run        # 11 testes
node scripts/mcp-health-check.mjs   # sobe e consulta os MCP servers locais (4/4)
```

## Estrutura do repositório

> Na branch `cenario-2`, a raiz contém a fase 1 e a fase 2 vive em `novatech-assistant/`.

```
dgs-ai-first/
├─ CLAUDE.md                 # método de trabalho para o Claude Code (genérico)
├─ .claude/skills/escrever-adr/   # skill de escrita de ADRs
├─ context/                  # contexto do cenário + glossário de IA
├─ docs/
│  ├─ adr/                   # ADRs + debates de devil's advocate
│  ├─ estrategia-prompt-context-engineering.md
│  └─ revisao-proposta-rag.md
├─ prompts/                  # prompts versionados (system, guardrails, templates)
├─ src/                      # orquestração, harness de teste e filtros de enforcement (PoC)
├─ tests/                    # testes unitários e de integração + fixtures (Anexo B)
├─ specs/                    # specs geradas pelo spec-kit
├─ .specify/memory/constitution.md   # princípios AI-First do projeto
└─ novatech-assistant/       # Cenário 2 — projeto TS/Azure (AGENTS.md, .mcp, src, skills, tests)
```

## Como rodar a PoC (Ex. 1.2)

Requer Python 3.11+.

```bash
# 1. Instalar dependências
pip install -e .

# 2. Rodar a suíte de testes
pytest

# 3. Executar o harness de teste de prompts (requer credenciais Azure)
cp .env.example .env   # preencher AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, etc.
python -m src.harness.runner \
  --prompt base-v001 \
  --test-cases tests/fixtures/test_cases.json \
  --chunks tests/fixtures/sample_chunks.json
```

> O `tiktoken` baixa o encoding `cl100k_base` na primeira execução; em ambiente sem rede,
> pré-cacheie via `TIKTOKEN_CACHE_DIR`.

## Método de trabalho

O projeto segue **ADR-first → spec-kit**: decisões arquiteturais são registradas como ADRs antes
de virarem specs de implementação. As regras de escrita de ADR estão no skill `escrever-adr`; os
princípios inegociáveis, em [`.specify/memory/constitution.md`](.specify/memory/constitution.md);
o método completo, em [`CLAUDE.md`](CLAUDE.md).

## Ferramentas

Desenvolvido com Claude Code + [spec-kit](https://github.com/github/spec-kit). Stack da PoC:
Python, Azure OpenAI (GPT-4o), Azure AI Search, tiktoken.
