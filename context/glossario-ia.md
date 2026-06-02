# Glossário de IA Generativa, Contexto e RAG

Definições precisas para usar nos ADRs e specs. Estes termos são parte da régua de avaliação do
Cenário 1 — devem ser usados com rigor técnico, não como jargão genérico.

## Fundamentos

- **LLM / resposta probabilística** — o modelo prevê o próximo token mais provável; não "sabe" fatos. Por isso pode soar confiante e estar errado.
- **Alucinação** — geração de informação fabricada que parece correta. Perigosa quando o modelo "preenche lacunas" misturando dado real com inferência não fundamentada. Ex.: inventar o tier "Platinum" que não existe no SLA-2024.
- **Janela de contexto (context window)** — limite máximo de tokens que entram numa única chamada (GPT-4o: 128K). Tudo compete por esse espaço: system prompt + instruções + chunks + histórico + pergunta.
- **Token** — unidade de texto do modelo. Regra prática: ~0,75 palavra por token.

## Engenharia de contexto

- **Engenharia de prompt vs engenharia de contexto** — prompt engineering é *como pedir*; context engineering é *decidir o que o modelo vê antes de responder* (o que entra, em que ordem, com que prioridade).
- **Orçamento de atenção (attention budget)** — a capacidade do modelo é limitada; informação em excesso **degrada** a qualidade. Mais contexto não é melhor.
- **Context rot** — em conversas/contextos longos, informação fornecida no início é progressivamente "esquecida". Relevante para o bot no Teams, onde o atendente faz várias perguntas na mesma sessão.
- **Lost in the middle** — informação no meio de um contexto grande é processada com menos atenção que a do início ou do fim. Afeta posicionamento de chunks no prompt.
- **Context overflow / truncamento** — quando system prompt + chunks + histórico + pergunta excedem a janela, há corte; partes do contexto somem silenciosamente.
- **Progressive disclosure** — alimentar o modelo em etapas (visão geral → aprofundamento → cruzamento), em vez de despejar tudo de uma vez. Preserva orçamento de atenção.
- **Contexto estático vs dinâmico** — estático = raramente muda (system prompt, guardrails); dinâmico = muda por query (chunks recuperados, tier do cliente, histórico). A "anatomia do contexto" decide como essas partes se compõem e o orçamento de cada uma.

## RAG (Retrieval-Augmented Generation)

Pipeline: documentos → extração/conversão em texto → **chunking** (divisão em pedaços) →
**embeddings** (representação numérica) → **vector store** → na pergunta, gera embedding da query,
**recupera (retrieval)** os N chunks mais similares → monta prompt (system + chunks + pergunta) →
LLM **gera** a resposta usando os chunks como contexto.

- **Chunking** — estratégia de divisão. Fixo (ex.: 512 tokens) é simples mas corta tabelas/seções no meio. Por seção com **overlap** (ex.: 10%) preserva contexto nas fronteiras. A estratégia deve ser justificada pelo tipo de pergunta e pelo conteúdo (tabelas, fluxogramas).
- **Embedding** — vetor que captura significado; permite busca por similaridade semântica.
- **Vector store** — banco que indexa embeddings (ex.: ChromaDB/FAISS local, Azure AI Search gerenciado).
- **Retrieval / score de similaridade** — quantos e quais chunks trazer; equilíbrio entre cobertura (perguntas multi-domínio) e orçamento de atenção.
- **Chunk errado** — o retriever traz trecho irrelevante ou de **versão errada** (ex.: PROC-042 antigo em vez do v2), contaminando a resposta. RAG é, antes de tudo, um problema de **dados/curadoria**, não só de modelo.
- **Feedback loop / manutenção** — RAG precisa de manutenção contínua: reindexação ao publicar docs, sinalização de respostas erradas, versionamento com data de vigência.

## Enforcement: probabilístico vs determinístico

- **Probabilístico (no prompt)** — instruções/guardrails que o modelo *tende* a seguir, mas pode violar. Ex.: "sempre cite a fonte".
- **Determinístico (fora do prompt / Harness)** — validação por código, garantida. Ex.: filtro que **rejeita** qualquer resposta sem citação antes de exibi-la ao atendente. Guardrails críticos devem ter enforcement determinístico.

## MCP (Model Context Protocol)

Protocolo aberto para conectar LLMs a fontes de dados e ferramentas externas de forma padronizada
(servidores expõem recursos/ferramentas; o modelo os consome). Relevante para integrar o assistente
a SharePoint/Teams sem acoplamento ad-hoc.
