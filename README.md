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
| `cenario-2` | _a definir_ | Pendente |
| `cenario-3` | _a definir_ | Pendente |

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

## Estrutura do repositório

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
└─ .specify/memory/constitution.md   # princípios AI-First do projeto
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
