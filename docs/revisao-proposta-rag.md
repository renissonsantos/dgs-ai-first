# Revisão Crítica de Proposta de RAG

> Entregável do Exercício 1.3 (Tech Lead). Estrutura: revisão própria → revisão do Claude →
> comparação honesta → proposta reescrita. Contexto do cenário: `context/cenario-1-novatech.md`.

## Proposta original (do desenvolvedor júnior)

> Vamos usar Azure AI Search com embeddings do ada-002. Todos os documentos serão indexados num
> único índice. Chunking fixo de 512 tokens sem overlap. O LLM recebe os 3 chunks mais similares.
> Usaremos GPT-4o para geração. O pipeline de ingestão roda manualmente quando alguém lembra de
> atualizar.

---

## Seção 1 — Minha revisão (independente, sem IA)

> **Preencha você primeiro, antes de pedir a revisão do Claude.** Liste ao menos 4 problemas/riscos.
> Dica neutra: percorra o pipeline inteiro — ingestão → chunking → embeddings → indexação →
> retrieval → geração → operação/manutenção — e pergunte "o que falha aqui no cenário NovaTech?".
> Ancore nos fatos do cenário (12M tokens, ~15% escaneados, ≥3 docs contraditórios, atualização
> mensal por 3 áreas, requisito de não alucinar e citar fonte).

| # | Problema / risco | Por que é um risco (no cenário NovaTech) | Alternativa que eu proponho |
|---|------------------|------------------------------------------|------------------------------|
| 1 | Chunking fixo de 512 tokens sem sobreposição | limitar apenas baseado em contagem de tokens pode quebrar sentenças no meio, quebrar a construção de tabelas ao meio. Sem sobreposição, o LLM perde totalmente o contexto nas quebras, tornando impossível responder perguntas sobre regras contínuas. | Utilizar uma **quebra semântico** (dividr por sessões por exemplo) em vez de tamanho fixo de tokens. |
| 2 | Pipeline de alimentação de informações manual | A alimentação de informações manual gera o problema que o modelo pode ficar desatualizado rapidamente. Um usuário pode usar o informações desatualizadas oque inflige problema de consistência de dados e até causar algum problema financeiro. | Implementar **uma rotina automatizada de inserção de dados**. Configurar webhooks ou CRON jobs diários integrados às fontes (SharePoint, Confluence) para detectar alterações. |
| 3 | Não possuir memória conversacional | A proposta trata cada consulta de forma isolada (pega a pergunta e traz os chunks). Como o bot será usado no Microsoft Teams, os usuarios farão perguntas de entrada, como: "Qual o SLA do cliente Gold?" seguido de "E se for incidente crítico?"). Sem gestão de histórico, o modelo não saberá que a segunda pergunta ainda é sobre o cliente Gold. Isso quebra a fluidez do atendimento, forçando o atendente a reescrever o contexto toda hora e prejudicando a meta de reduzir o tempo do chamado para menos de 2 minutos. | Implementar uma **memória conversacional mínima** (Uma Janela das três últimas interações). Antes de buscar no índice vetorial, o sistema usa o LLM para ler o histórico e reformular a pergunta atual para que ela seja autossuficiente e mais completa, melhorando assim a assertividade. |
| 4 | Todos os documentos num índice único | Jogar todos os documentos em um índice único só como vetor de texto, impossibilita que o sistema filtre por versão, data de validade ou fonte, forçando o LLM a "adivinhar" qual regra está valendo. | Enviar **metadados estruturados** (ID do documento, versão, data de atualização, departamento, status de vigência). Isso permite usar filtros para priorizar documentos mais recentes ou ignorar os obsoletos. |

---

## Seção 2 — Revisão do Claude

> Revisão independente feita pelo Claude a partir da proposta original, percorrendo o pipeline
> de ponta a ponta. Não foi calibrada pela Seção 1.

| # | Problema / risco | Por que é um risco (no cenário NovaTech) | Alternativa proposta |
|---|------------------|------------------------------------------|----------------------|
| C1 | **Embeddings `ada-002` (modelo legado)** | O `text-embedding-ada-002` foi superado pelos `text-embedding-3-small/large`, que têm melhor qualidade de recuperação e melhor desempenho multilíngue — relevante porque a base é toda em PT-BR com termos técnicos de logística. ada-002 também não permite reduzir dimensionalidade para baratear o índice. | Usar `text-embedding-3-large` (ou `3-small` se custo for crítico). Validar a escolha medindo recall no gabarito do Anexo B antes de fechar. |
| C2 | **Top-k = 3 chunks fixo** | 3 chunks são insuficientes para perguntas multi-domínio (ex.: "cliente Gold, frete para o Norte acima de 500kg e prazo de devolução" cruza SLA + frete + devolução). Com k=3, parte do contexto necessário simplesmente não chega ao LLM, gerando resposta incompleta ou inventada. | Top-k maior e adaptável (ex.: 6–12) dentro do orçamento de contexto do ADR-0002, com **reranking** para selecionar os melhores e reordenar (ordem-V), mitigando *lost in the middle*. |
| C3 | **Sem extração específica para PDFs escaneados e tabelas** | ~15% da base é escaneada (precisa OCR) e há tabelas de frete com 15+ colunas. "Indexar todos os documentos" sem tratar extração faz esses ~187 mil docs entrarem como lixo ou texto corrompido — o frete (núcleo do negócio) é justamente o mais tabular. | Pipeline de ingestão com OCR (ex.: Azure Document Intelligence) e extração estruturada de tabelas, com validação de qualidade da extração antes de indexar. |
| C4 | **Sem resolução de contradições no índice** | Indexar PROC-042 e PROC-042-v2 no mesmo índice, sem metadado de vigência nem regra de resolução, faz o retriever trazer as duas versões e o LLM misturar regras de frete de versões diferentes — exatamente o erro que o cenário quer evitar (≥3 procedimentos contraditórios). | Versionamento com data de vigência na ingestão + resolução determinística de conflito (conforme ADR-0003): mostrar ambas com data ou priorizar a vigente; nunca silenciosamente misturar. |
| C5 | **Sem grounding/citação e sem comportamento de "não sei"** | A proposta não exige citar fonte nem define o que fazer quando nenhum chunk é relevante. Do jeito descrito, o GPT-4o pode responder com conhecimento geral e sem fonte — violando os guardrails de não alucinar e citar fonte (constituição I e II). | Enforcement determinístico: bloquear resposta sem citação (`citation_filter`) e acionar fallback de escalonamento quando o score de recuperação for baixo (sem chunk relevante → "não encontrei, escale ao supervisor"). |
| C6 | **Sem avaliação de qualidade de retrieval nem loop de feedback** | "Roda manualmente quando alguém lembra" não tem teste de que os chunks certos são recuperados, nem forma de detectar regressão quando docs/embeddings mudam. Sem isso, a qualidade degrada silenciosamente. | Suíte de avaliação de retrieval usando o mapa de cobertura do Anexo B (pergunta → chunks esperados) como gabarito, rodada na ingestão; canal de feedback do atendente para respostas erradas. |
| C7 | **Chunking fixo de 512 sem overlap** | Corta sentenças e tabelas nas fronteiras; sem overlap, regras contínuas ficam partidas entre chunks e nenhum deles responde sozinho. | Chunking por seção/semântico com overlap (~10%, conforme análise do dev), respeitando limites de tabela. |
| C8 | **Ingestão manual** | Atualização disparada "quando alguém lembra" não atende ao requisito de ≤24h após publicação e cria janelas de informação desatualizada — risco de o atendente passar regra de frete/SLA vencida. | Ingestão automatizada agendada/event-driven (ex.: gatilho do SharePoint/Confluence ou job diário) com reindexação incremental. |

---

## Seção 3 — Comparação: minha revisão vs Claude

> Revise e ajuste com suas próprias palavras — abaixo é o cruzamento objetivo das duas listas.

**Pontos em que coincidimos** (eu e o Claude, de forma independente):

- Chunking fixo de 512 sem overlap (meu #1 ≈ C7).
- Ingestão manual (meu #2 ≈ C8).
- Índice único sem estrutura para versão/vigência (meu #4 ≈ C4) — convergência forte, embora com ênfases diferentes (ver abaixo).

**O que o Claude encontrou que eu não vi:**

- **Modelo de embedding legado (ada-002)** — eu não questionei a escolha do modelo de embeddings; o Claude apontou que há modelos mais novos e melhores para PT-BR (C1).
- **Top-k = 3 fixo** — não percebi que 3 chunks são insuficientes para perguntas multi-domínio (SLA + frete + devolução), nem a necessidade de reranking (C2).
- **Extração de PDFs escaneados e tabelas (OCR)** — meu ponto de ingestão foi sobre atualização/automação; não cobri a *qualidade da extração* dos ~15% escaneados e das tabelas de frete (C3).
- **Grounding/citação e comportamento de "não sei"** — não tratei do risco de o modelo responder sem fonte ou com conhecimento geral quando não há chunk relevante (C5).
- **Avaliação de retrieval e loop de feedback** — não previ como medir que os chunks certos são recuperados nem como detectar regressão (C6).

**O que eu encontrei que o Claude não mencionou:**

- **Memória conversacional** (meu #3) — o Claude fez uma revisão focada no pipeline e não levantou o problema das perguntas em sequência no Teams ("Qual o SLA do Gold?" → "E se for incidente crítico?"). Esse foi um ganho da minha revisão, alinhado ao que o ADR-0002 já decidiu (memória conversacional mínima).

**Onde nos complementamos / refino:**

- No índice único, minha proposta foi adicionar **metadados** para filtrar por versão/data. O Claude reforçou que metadado é o *meio*, mas é preciso também uma **regra determinística de resolução de conflito** (ADR-0003) — só filtrar não basta; tem que definir o que fazer quando duas versões vigentes aparecem. Incorporo esse refino.
- Não rejeitei nada da revisão do Claude; as listas foram complementares. A minha trouxe a ótica de *experiência do atendente* (memória conversacional); a do Claude trouxe profundidade técnica de *qualidade de recuperação* (embeddings, top-k, OCR, avaliação).

---

## Seção 4 — Proposta reescrita

> Incorpora as duas revisões, sem overengineering. Cada decisão resolve um problema concreto das
> Seções 1–2 e é coerente com os ADRs aceitos.

**Arquitetura de RAG — versão revisada**

1. **Geração e infraestrutura:** manter **GPT-4o** para geração e **Azure AI Search** como vector store gerenciado (coerente com ADR-0001 e ADR-0004). A camada de orquestração é própria.

2. **Ingestão com qualidade de extração** (resolve C3, #2/C8): pipeline automatizado, agendado/event-driven a partir de SharePoint e Confluence, com reindexação incremental e meta de disponibilidade ≤24h. PDFs escaneados passam por OCR (Azure Document Intelligence) e tabelas por extração estruturada, com validação de qualidade antes de indexar.

3. **Chunking semântico com overlap** (resolve #1/C7): dividir por seção/semântica com overlap ~10%, respeitando limites de tabela — em vez de 512 tokens fixos sem overlap.

4. **Embeddings atualizados** (resolve C1): `text-embedding-3-large` (ou `3-small` se custo apertar), com a escolha validada por recall no gabarito do Anexo B.

5. **Índice com metadados e resolução de conflito** (resolve #4 + C4): cada chunk carrega metadados estruturados (ID do documento, versão, data de vigência, área, status). O retrieval filtra por vigência; quando há versões conflitantes, aplica-se resolução determinística (ADR-0003) — priorizar a vigente e/ou mostrar ambas com data, nunca misturar silenciosamente.

6. **Retrieval com top-k adaptativo e reranking** (resolve C2): recuperar 6–12 chunks dentro do orçamento de contexto (ADR-0002), aplicar reranking e reordenar em ordem-V para mitigar *lost in the middle* — em vez de top-3 fixo.

7. **Memória conversacional mínima** (resolve #3): janela das últimas ~3 interações; antes de buscar no índice, reformular a pergunta atual para torná-la autossuficiente, suportando o uso multi-turno no Teams sem inflar o contexto.

8. **Grounding e fallback determinísticos** (resolve C5): toda resposta cita a fonte; filtro determinístico bloqueia resposta sem citação; quando o score de recuperação indica ausência de chunk relevante, retorna fallback de escalonamento ao supervisor — nunca responde com conhecimento geral.

9. **Avaliação contínua** (resolve C6): suíte de avaliação de retrieval com o mapa de cobertura do Anexo B rodando na ingestão, mais canal de feedback do atendente para sinalizar respostas erradas/desatualizadas.

**O que deliberadamente NÃO mudei** (evitar overengineering): mantive GPT-4o e Azure AI Search como na proposta original; não introduzi grafo de conhecimento, múltiplos índices por domínio nem fine-tuning — nenhum se justifica no volume e no prazo atuais. As mudanças se concentram em qualidade de dados, recuperação e guardrails, que é onde estão os riscos reais.
