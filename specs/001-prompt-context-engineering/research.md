# Research: Prompt & Context Engineering como Artefato de Arquitetura Versionado

**Date**: 2026-06-01 | **Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Resumo

Todas as decisões técnicas para esta feature já estavam resolvidas pelo input do Tech Lead e pelos ADRs aceitos. Este documento consolida as escolhas e alternativas avaliadas.

---

## R1: Stack da camada de orquestração

**Decision**: Python 3.11+ com Azure OpenAI SDK (`openai`) e Azure AI Search SDK (`azure-search-documents`).

**Rationale**:
- ADR-0004 define orquestração própria (sem LangChain/LlamaIndex) sobre infraestrutura gerenciada Azure.
- Python é a linguagem com melhor suporte nos SDKs Azure AI (first-class, documentação extensa, exemplos oficiais).
- `tiktoken` (biblioteca da OpenAI) permite contagem de tokens exata e determinística — necessário para o orçamento do ADR-0002.
- Equipe já familiarizada com Python para automação e scripts.

**Alternatives considered**:
- TypeScript/Node.js: SDKs disponíveis, mas menor ecossistema de ML/NLP para o harness.
- C#/.NET: Boa integração Azure, porém equipe sem perfil .NET declarado e ecossistema de eval de prompts menos maduro.

---

## R2: Contagem de tokens para orçamento de contexto

**Decision**: `tiktoken` com encoding `cl100k_base` (encoding do GPT-4o).

**Rationale**:
- ADR-0002 exige contabilidade determinística de tokens antes de montar o prompt.
- `tiktoken` é a biblioteca oficial da OpenAI, garante correspondência exata com o tokenizador do modelo.
- Performance: ~4M tokens/segundo em Python (suficiente para contar ≤16K por consulta sem latência perceptível).

**Alternatives considered**:
- Estimativa por heurística (0,75 palavra/token): imprecisa para PT-BR e tabelas, inaceitável para teto rígido.
- `transformers.AutoTokenizer`: mais pesado, desnecessário para encoding específico do GPT-4o.

---

## R3: Formato e organização de prompts versionados

**Decision**: Arquivos Markdown (`.prompt.md`) no diretório `prompts/` na raiz do repositório, organizados por tipo (`system/`, `guardrails/`, `templates/`).

**Rationale**:
- Markdown é legível por humanos, renderiza bem no GitHub/Azure DevOps, e suporta comentários/metadados no frontmatter YAML.
- Convenção de nomes: `<slug>-v<NNN>.prompt.md` permite identificar versão e propósito.
- Revisão via pull request (processo já utilizado pela equipe para código).
- Separação por tipo facilita reuso e composição modular do prompt.

**Alternatives considered**:
- Prompt como string em código (hardcoded): impossível de versionar/revisar independentemente.
- YAML/JSON: menos legível para texto longo; não renderiza bem para revisores não-técnicos.
- Banco de dados de prompts (ex.: LangSmith): adiciona dependência externa e custo desnecessário no volume.

---

## R4: Harness de teste de prompts

**Decision**: Módulo Python customizado (`src/harness/`) que lê conjunto de teste (JSON com pares pergunta→resposta esperada + chunks de referência do Anexo B), envia ao LLM via Azure OpenAI SDK, e avalia critérios com scoring por graus.

**Rationale**:
- Princípio VII exige avaliação por graus, não pass/fail binário — frameworks existentes (ex.: promptfoo, deepeval) assumem thresholds binários por default.
- Critérios específicos do NovaTech (citação de fonte no formato esperado, tier inexistente "Platinum", termos proibidos) requerem avaliadores customizados.
- Integra naturalmente com pytest para CI.
- Relatório comparativo entre versões de prompt é requisito.

**Alternatives considered**:
- promptfoo: bom para eval genérico, mas impõe schema próprio e não suporta scoring gradual nativo de forma simples.
- deepeval: mais flexível em métricas, porém dependência adicional e complexidade para adaptar ao formato Anexo B.
- Eval manual com planilha: não escalável, não reprodutível.

---

## R5: Enforcement determinístico (filtros de código)

**Decision**: Módulo Python (`src/enforcement/`) com filtros que validam a resposta do LLM antes de exibi-la. Dois filtros obrigatórios: `citation_filter` (rejeita sem citação) e `hallucination_filter` (rejeita tier/valor inexistente).

**Rationale**:
- Princípio III é explícito: guardrails críticos NÃO dependem apenas do prompt.
- ADR-0001 e ADR-0004 confirmam que enforcement fica na camada de orquestração própria.
- Filtros são funções puras (entrada: resposta do LLM + metadados; saída: aprovada/rejeitada + motivo) — fáceis de testar com pytest.
- Em caso de rejeição, fallback determinístico: informar que não encontrou resposta e sugerir escalar.

**Alternatives considered**:
- Guardrails apenas no prompt (probabilístico): viola Princípio III — o modelo pode ignorar.
- Azure Content Safety: cobre toxicidade/segurança, mas não critérios de negócio (citação, tier inexistente).
- Filtro no frontend/Teams: tarde demais — a validação deve ocorrer na camada de orquestração antes de qualquer canal.

---

## R6: Reordenação anti-lost-in-the-middle

**Decision**: Implementar no módulo `src/orchestrator/reorderer.py` a ordenação em "V" (maiores scores no início e fim, menores no meio), conforme ADR-0002.

**Rationale**:
- ADR-0002 define a estratégia explicitamente.
- É código determinístico simples (sort + intercalação por posição) — não justifica dependência externa.
- System/guardrails sempre no início (primazia); pergunta sempre no fim (recência).

**Alternatives considered**:
- Ordem natural do retrieval (por score decrescente): ignora o efeito lost-in-the-middle.
- Reordenação pelo LLM (pedir que o modelo priorize): probabilístico, não confiável.

---

## Unknowns resolvidos

Não restam NEEDS CLARIFICATION. Todas as decisões foram resolvidas pelo input do Tech Lead, pelos ADRs aceitos e pela pesquisa acima.
