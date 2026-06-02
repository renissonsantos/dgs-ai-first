# Architecture Decision Records

Registro das decisões arquiteturais do projeto. Cada decisão é um arquivo próprio, imutável
depois de "Aceito"; para mudar uma decisão, crie um novo ADR e marque o antigo como
"Substituído por".

- **Como escrever um ADR de qualidade:** use o skill `escrever-adr` (`.claude/skills/escrever-adr/`).
- **Template:** [`ADR-template.md`](./ADR-template.md).
- **Convenções:** arquivo `ADR-NNNN-titulo-em-kebab-case.md`, numeração sequencial de 4 dígitos, idioma português, uma decisão por ADR, ancorado nos números do cenário.

## Processo (resumo)

1. Entender o contexto do cenário (`context/`).
2. Escrever o rascunho do ADR (skill `escrever-adr`).
3. Rodar o **devil's advocate** e reforçar/revisar a decisão.
4. Registrar o debate de ADRs relevantes em `devils-advocate/ADR-NNNN-debate.md`.
5. Mudar Status para "Aceito".
6. Criar as specs do spec-kit que implementam a decisão (`docs/GUIA-spec-kit.md`).

## Índice de ADRs

| ID | Decisão | Status |
|----|---------|--------|
| [ADR-0001](./ADR-0001-adotar-azure-openai-gpt-4o-como-llm-de-producao.md) | Adotar Azure OpenAI (GPT-4o) como LLM de produção | Aceito |
| [ADR-0002](./ADR-0002-gerenciar-contexto-com-orcamento-fixo-e-retrieval-reordenado.md) | Gerenciar contexto por orçamento fixo, retrieval reordenado e memória conversacional mínima | Aceito |
| [ADR-0003](./ADR-0003-manter-ambas-versoes-com-vigencia-e-resolucao-deterministica-de-conflito.md) | Manter ambas as versões com metadado de vigência e resolução determinística de conflito | Aceito |
| [ADR-0004](./ADR-0004-comprar-infra-gerenciada-azure-e-construir-orquestracao-propria.md) | Comprar infra de RAG gerenciada (Azure AI Search) e construir só a camada de orquestração | Aceito |

---

## Cenário 1 (NovaTech) — ADRs a produzir

Contexto: `context/cenario-1-novatech.md`. Decisões pedidas no exercício de Tech Lead:

| ID | Decisão | Foco da avaliação |
|----|---------|-------------------|
| ADR-0001 | Escolha do modelo de LLM (Azure OpenAI GPT-4o vs Claude API vs open-source/Ollama) | Custo/token p/ o volume real, janela de contexto, requisito de não alucinar, integração Azure |
| ADR-0002 | Estratégia de gerenciamento de contexto | Context rot, orçamento de atenção, perguntas multi-domínio, conversas longas no Teams |
| ADR-0003 | Tratamento de documentos contraditórios (PROC-042 vs PROC-042-v2) | RAG como problema de dados: versão única vs ambas com vigência vs delegar ao LLM |
| ADR-0004 | Build vs buy do pipeline de RAG (LangChain/LlamaIndex + Chroma/FAISS vs Azure AI Search nativo) | Custo, complexidade operacional, flexibilidade, NovaTech já tem Azure |
