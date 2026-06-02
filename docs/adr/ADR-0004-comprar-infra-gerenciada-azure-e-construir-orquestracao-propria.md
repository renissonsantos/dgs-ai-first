# ADR-0004: Comprar a infraestrutura de RAG gerenciada (Azure AI Search) e construir só a camada de orquestração

## Status

Aceito

2026-06-01 — Tech Lead.

## Contexto

Decididos o LLM (ADR-0001, Azure OpenAI/GPT-4o), o gerenciamento de contexto (ADR-0002) e o
tratamento de contradições (ADR-0003), falta decidir **como montar o pipeline de RAG**: construir com
ferramentas open-source (LangChain/LlamaIndex + ChromaDB/FAISS, mais controle) **ou** usar
infraestrutura gerenciada da Azure (Azure AI Search + Azure OpenAI nativo, menos controle, mais
integrado).

A pergunta "build vs buy" é, na verdade, **mal posta como binária**, porque as decisões anteriores
puxam para os dois lados:

- **ADR-0002 e ADR-0003 exigem lógica que nenhuma ferramenta entrega pronta:** orçamento de contexto
  fixo com descarte ordenado, reordenação anti-lost-in-the-middle, decomposição multi-domínio,
  **co-recuperação não-deduplicável** de versões em conflito, **registro de vigência** e **filtros de
  enforcement determinístico**. Isso é **código de aplicação**, não configuração.
- **ADR-0001 já comprometeu a infraestrutura com Azure** (tenant M365 E3, Entra ID, dados no tenant,
  go-live em 3 meses, equipe sem MLOps). Self-host de vector store contraria essa escolha.

Forças que pressionam a decisão (números de `context/cenario-1-novatech.md`):

- **Volume real e baixo:** 320 chamados/dia × ~60% ≈ **192 consultas/dia (~4.224/mês)**. Não justifica
  infraestrutura dedicada nem dimensiona um problema de escala.
- **Base:** ~1.250 fontes, **~12M tokens**; em chunks de ~500 tokens (ADR-0002) ≈ **~24 mil chunks** —
  pequeno para qualquer vector store. **15% escaneados precisam de OCR**; PDFs com tabelas complexas.
- **Latência de atualização ≤ 24h** após publicação de novo documento (reindexação).
- **Prazo de 3 meses** (discovery + dev + go-live), **com PoC obrigatória antes de comprometer
  licenças**.
- **M365 E3 NÃO inclui Azure AI Search nem Azure OpenAI** — são serviços Azure provisionados e
  faturados à parte. "Já está pago" é falso; o E3 entrega SharePoint/Teams/Entra, não a infra de IA.

### Estimativa de custo (volume real)

| Item | Opção gerenciada (Azure) | Opção self-host |
|------|--------------------------|-----------------|
| Vector store | Azure AI Search Basic ~US$ 75/mês (PoC) → S1 ~US$ 250/mês (prod, se preciso) | VM p/ Chroma/FAISS ~US$ 70–100/mês **+ tempo de ops** |
| Reranking | Semantic ranker ~US$ 4–8/mês neste volume (1ª mil/mês grátis) | cross-encoder self-host (mesma VM/GPU) |
| OCR (~188 docs escaneados) | Azure AI Document Intelligence ~US$ 1,50/1.000 págs → dezenas de US$ one-time | construir/integrar OCR |
| Embeddings (indexar 12M tok) | text-embedding-3 ~US$ 0,24–1,56 **one-time** + deltas | idem (ainda usa Azure OpenAI) |
| LLM (ADR-0001) | ~US$ 148/mês | ~US$ 148/mês |

**Conclusão dos números:** o vector store gerenciado custa **na mesma ordem de grandeza** do self-host
(dezenas a poucas centenas de US$/mês) — mas o self-host **ainda depende do Azure OpenAI** para
embeddings/LLM e **adiciona trabalho de ops** (indexer, agendador, monitoração, backup) que a equipe
não tem. Custo não diferencia; **operação e prazo, sim**.

## Decisão

**Comprar a infraestrutura gerenciada** — **Azure AI Search** (vector store + indexer + semantic
ranker), **Azure OpenAI** (LLM + embeddings) e **Azure AI Document Intelligence** (OCR) — e
**construir apenas uma camada fina de orquestração própria** (código de aplicação) que implementa
ADR-0002 e ADR-0003. **Não** adotar framework pesado (LangChain/LlamaIndex) **nem** vector store
self-host (Chroma/FAISS). Validar tudo numa **PoC com gate de decisão antes de comprometer licenças**.

Repartição **buy / build**:

- **Buy (heavy lifting indiferenciado):** ingestão agendada do SharePoint/Confluence/rede via
  **indexer** (atende ≤ 24h por agendamento gerenciado), OCR por skillset, geração e indexação de
  embeddings, busca vetorial + híbrida e o semantic ranker.
- **Build (lógica diferenciada, que é o nosso valor):** o orquestrador de consulta que aplica o
  **orçamento de contexto e a reordenação** (ADR-0002), a **decomposição multi-domínio**, a
  **detecção de conflito + co-recuperação não-deduplicável + registro de vigência** (ADR-0003) e os
  **filtros de enforcement determinístico** (citação obrigatória, ambas as versões datadas).

### Justificativa por trade-off

A lógica diferenciada (ADR-0002/0003) **vive na camada de aplicação independentemente** de build ou
buy — então construir o vector store do zero **não compra mais controle** onde ele importa; só
adiciona ops. Comprar a infra elimina o trabalho indiferenciado (indexação, OCR, agendamento) que
domina o esforço num prazo de 3 meses, e a Azure AI Search **não impede** nenhuma das decisões
anteriores: metadados customizados (`id_base`, `data_vigencia`, `status`) suportam o ADR-0003, e
top-k/dedup/reordenação/orçamento ficam **no nosso código**. Já um framework pesado **brigaria** com
requisitos tão específicos e determinísticos, custando mais para domar do que escrever código direto
sobre o SDK.

## Consequências

**Positivas**

- Time-to-value compatível com 3 meses: indexação, OCR e agendamento prontos; o esforço concentra-se
  na lógica que é o diferencial.
- ≤ 24h de atualização atendido por **indexer agendado** gerenciado, sem construir agendador/monitor.
- Controle total sobre ADR-0002/0003 mantido — vive na nossa camada, não refém de framework.
- Integração nativa coerente com o ADR-0001 (Entra ID, dados no tenant, Azure AI Search ↔ OpenAI).
- Custo previsível e baixo, sem dívida operacional de infraestrutura.

**Negativas / custos**

- **Lock-in adicional** na API de consulta e no formato de skillset/indexer da Azure AI Search.
- **Semantic ranker é caixa-preta:** não dá para tunar o reranker como um cross-encoder próprio; sua
  qualidade em **PT-BR e tabelas complexas de frete** é uma incógnita até a PoC.
- **A camada de orquestração é manutenção nossa** — código que alguém precisa manter após o go-live.
- **Indexer do SharePoint** depende de conector/permissões corretas e da estrutura das fontes (macros
  do Confluence, planilhas com fórmulas) — risco de extração imperfeita.
- Custo cresce ao subir de tier (Basic → S1) se a PoC exigir.

**Mitigações** (concretas)

- **PoC com gate de decisão antes das licenças:** rodar em **Basic tier + semantic grátis** contra o
  gabarito (Anexos A/B) nos casos difíceis — **conflito PROC-042**, alucinação "Platinum", **tabela de
  frete 15+ colunas**, **doc escaneado (OCR)** — e só comprar S1/produção se os critérios de recall e
  citação passarem.
- **Reranking atrás de uma interface:** se a PoC mostrar o semantic ranker fraco em PT-BR/tabelas,
  troca-se por um **cross-encoder na camada de aplicação** sem refazer o resto.
- **Interface de retrieval abstraída** (mesma do ADR-0001 para o LLM): o vector store é acessado por
  um contrato próprio, confinando o lock-in à implementação e permitindo trocar o store se preciso.
- **Camada de orquestração pequena e testada** contra o gabarito (mesmos casos da PoC), versionada —
  evita que "build" vire framework caseiro.
- **Validação de extração na ingestão:** checagem determinística de que tabelas de frete e docs OCR
  produziram chunks íntegros (ex.: contagem de colunas esperada), com fila de curadoria em falha
  (reaproveita o mecanismo do ADR-0003).

## Alternativas consideradas

- **Construir com open-source (LangChain/LlamaIndex + ChromaDB/FAISS, self-host).** Descartada porque
  (a) **não compra controle adicional** onde importa — a lógica ADR-0002/0003 fica na aplicação de
  qualquer forma; (b) **adiciona dívida operacional** (indexer, agendador, OCR, monitoração, backup)
  que a equipe sem MLOps não sustenta em 3 meses; (c) **não economiza** — ainda usa Azure OpenAI e
  custa VM + tempo; (d) frameworks pesados **brigam** com requisitos determinísticos muito
  específicos. Mantém-se apenas a ideia de **cross-encoder próprio** como plano B do reranker.
- **Azure "nativo" end-to-end sem código (ex.: "Azure OpenAI On Your Data" apontando para AI
  Search).** Descartada porque a solução no-code **não implementa** o orçamento/reordenação do
  ADR-0002 nem a co-recuperação/vigência/enforcement do ADR-0003 — exatamente os guardrails críticos
  (Princípios III–IV). Serve de acelerador de PoC, não de arquitetura final.
- **Híbrido invertido (build vector store, buy só o LLM).** Descartada por combinar o pior dos dois:
  assume a ops do store self-host sem ganho de controle, contrariando a coerência de tenant do
  ADR-0001.

## Devil's advocate

Contra-argumentos mais fortes e como a decisão responde (debate completo em
[`devils-advocate/ADR-0004-debate.md`](./devils-advocate/ADR-0004-debate.md)):

- **"Azure nativo elimina a integração e já está pago."** Parcialmente falso: M365 E3 **não inclui**
  AI Search nem Azure OpenAI (faturados à parte), e o caminho no-code **não implementa** ADR-0002/0003.
  Concordamos em **comprar a infra**, mas a orquestração determinística **tem de ser construída** —
  por isso a decisão é buy-infra **+** build-orquestração, não "buy tudo".
- **"Open-source vira dívida operacional sem time para manter."** Exatamente por isso **rejeitamos**
  self-host de vector store e framework pesado. O "build" aqui é uma camada fina e testada, não
  infraestrutura — a dívida operacional fica com a Azure.
- **"Lock-in vs flexibilidade no prazo de 3 meses."** Em 3 meses, flexibilidade-para-reconstruir vale
  pouco; **time-to-value** vale tudo. A infra gerenciada acelera, e a flexibilidade que importa
  (ADR-0002/0003) é preservada no nosso código. Lock-in confinado à API de retrieval e abstraído por
  interface, com plano B (cross-encoder, troca de store) caso a PoC reprove.
