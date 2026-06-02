# ADR-0001: Adotar Azure OpenAI (GPT-4o) como LLM de produção do assistente da NovaTech

## Status

Aceito

2026-06-01 — Tech Lead.

> **Errata (2026-06-01).** Onde se lê, na Decisão (item 3), que o **filtro determinístico que
> rejeita resposta sem fonte** é responsabilidade do "(ADR-0002 / Princípio III)", leia-se
> **(ADR-0003 / Princípio III)**: o enforcement determinístico de citação e de exibição de ambas as
> versões foi detalhado no ADR-0003. O ADR-0002 trata da contabilidade determinística de **tokens**
> (orçamento/descarte), não do filtro de citação. Correção de referência apenas — a decisão original
> permanece inalterada.

## Contexto

A NovaTech precisa de um assistente que responda perguntas em linguagem natural sobre sua
documentação interna (~12M tokens, ~1.250 fontes em SharePoint/Confluence/rede), **com citação de
fonte** e **sem alucinar**, integrado a Teams + SharePoint, com go-live em 3 meses. A escolha do
LLM de produção é a primeira decisão e condiciona integração, custo operacional e o teto de
qualidade das respostas.

Forças que pressionam a decisão (números de `context/cenario-1-novatech.md`):

- **Volume real e baixo.** 320 chamados/dia, ~60% com consulta ≈ **192 consultas/dia**. Com 22 dias
  úteis, ~**4.224 consultas/mês**. Não é um volume que justifique infraestrutura dedicada.
- **A base de 12M tokens NÃO precisa entrar na janela de contexto.** O padrão é RAG: o vector store
  guarda os 12M tokens; cada consulta recupera apenas os chunks relevantes. O orçamento por
  consulta é da ordem de **~12K tokens de entrada** (≈2K system+guardrails + ~8K chunks
  recuperados + ~2K histórico da sessão no Teams + pergunta) e **~0,5K de saída**. Logo, a janela de
  **128K do GPT-4o é folgada** — e, pelo Princípio V (orçamento de contexto é gerenciado, não
  maximizado), janela maior não é vantagem por si.
- **Não alucinar é inegociável** (Constituição, Princípios I e II), incluindo recusar o tier
  "Platinum" inexistente e mostrar PROC-042 vs PROC-042-v2 com vigência. Pelo glossário e pelos
  Princípios III e IV, **não-alucinação é propriedade do pipeline de dados + enforcement
  determinístico**, não um atributo que se "compra" escolhendo o modelo certo.
- **Stack Microsoft.** A NovaTech tem **Microsoft 365 E3** e disposição para provisionar **Azure AI
  Services**. A integração-alvo (bot no Teams, SharePoint, Entra ID) é nativamente Azure.
- **Prazo de 3 meses** e **equipe sem MLOps declarado** — não há margem para operar e ajustar
  infraestrutura de inferência própria.

### Estimativa de custo por token (premissas explícitas acima)

| Opção | Preço (USD / 1M tok, in / out) | Custo mensal estimado (4.224 consultas) | Observação |
|-------|--------------------------------|------------------------------------------|------------|
| **Azure OpenAI GPT-4o** | ~2,50 / ~10,00 | ~50,7M in + 2,1M out → **~US$ 148/mês** | ~US$ 35 por 1.000 consultas |
| Claude (Sonnet) via API | ~3,00 / ~15,00 | **~US$ 184/mês** (sem cache) | Não roda nativamente no tenant Azure |
| Open-source via Ollama | sem custo/token | **~US$ 400–3.000/mês** de GPU 24/7 + ops | T4 insuficiente p/ 70B; A100/H100 = topo da faixa |

**Conclusão dos números:** no volume real, custo de token **não é o fator decisivo** — GPT-4o e
Claude diferem ~US$ 36/mês, ambos irrisórios diante de um projeto de 3 meses para 45 atendentes. A
única opção cara é justamente a "gratuita" (self-host), que inverte o custo para infraestrutura e
operação. A decisão deve, portanto, pesar **integração, prazo e capacidade da equipe**, não centavos
por token.

## Decisão

Adotar **Azure OpenAI Service com GPT-4o** como LLM de produção, atrás de uma **camada de abstração
de modelo** (Azure AI Inference SDK / LiteLLM) que mantém o pipeline de RAG agnóstico ao provedor.

Justificativa por trade-off, não por preferência:

1. **Custo não diferencia, integração sim.** Como os três caminhos de API custam dezenas de dólares
   por mês, o desempate é a integração. Azure OpenAI vive **dentro do tenant Azure/M365 já existente**:
   autenticação via Entra ID, dados que não saem do tenant nem treinam o modelo, fixação de região,
   conexão nativa com **Azure AI Search** (vector store), **Azure Bot Service** para o Teams e
   compliance sob o Enterprise Agreement vigente. Isso colapsa fornecedores, redes, faturas e
   superfície de compliance em **um só ambiente** — decisivo para um go-live em 3 meses.
2. **Janela suficiente, não máxima.** 128K cobre com folga os ~12K tokens/consulta do desenho RAG; a
   base de 12M vive no índice, não no prompt. Optar por janela maior seria pagar por contexto que o
   Princípio V manda **não** maximizar.
3. **Não-alucinação é resolvida fora do modelo.** GPT-4o segue bem instruções e produz citação
   estruturada, o que basta como insumo; a garantia vem do RAG curado (ADR-0003) e do **filtro
   determinístico** que rejeita resposta sem fonte (ADR-0002 / Princípio III). Nenhum LLM, sozinho,
   satisfaz os Princípios I–II.
4. **Prazo e equipe.** Serviço gerenciado elimina provisionamento, escalonamento e tuning de GPU que
   a equipe não tem mandato nem tempo para operar em 3 meses.

## Consequências

**Positivas**

- Integração nativa com Teams, SharePoint, Entra ID e Azure AI Search → menos cola, menos risco no
  prazo de 3 meses.
- Custo operacional baixo e previsível (~US$ 148/mês no volume atual; ~US$ 750/mês mesmo com 5× de
  crescimento).
- Governança/compliance herdadas do tenant Azure já contratado (dados no tenant, sem treino, região
  fixada).
- Serviço gerenciado: sem operação de GPU, sem MLOps.

**Negativas / custos**

- **Lock-in** no ecossistema Azure/OpenAI (SDK, deployment, faturamento).
- **Dependência de roadmap de terceiro**: deprecações de versão de modelo e mudanças silenciosas de
  comportamento na plataforma.
- Marginalmente **não escolhemos o modelo de melhor grounding/idioma disponível** (ver Claude nas
  alternativas) — aposta de que a diferença é coberta pelo pipeline + enforcement.
- Custo cresce linearmente com o volume (ao contrário de capex fixo de self-host num cenário de
  volume muito alto — não é o caso hoje).

**Mitigações** (concretas)

- **Camada de abstração de modelo** (Azure AI Inference SDK / LiteLLM): troca de LLM vira mudança de
  configuração; o vector store, o chunking e o retrieval permanecem independentes do provedor. É o
  que torna esta decisão **reversível a baixo custo**.
- **Fixar a versão do deployment** (`gpt-4o-AAAA-MM-DD`) e só promover nova versão após reprovar/
  aprovar no harness de avaliação — neutraliza drift silencioso.
- **Harness de avaliação offline** contra o gabarito dos Anexos A/B medindo correção factual,
  citação e PT-BR formal; rodar **antes do go-live e trimestralmente**, comparando GPT-4o com ao
  menos um candidato (ex.: Claude) para validar que a escolha continua certa.
- **Filtro determinístico de citação** (Princípio III) que rejeita qualquer resposta sem fonte —
  independe do modelo e blinda o requisito de não-alucinação contra a troca de LLM.
- **Guardrail de custo**: alerta de orçamento no Azure + teto de tokens por consulta.

## Alternativas consideradas

- **Claude (Sonnet) via API** — modelo forte em grounding, em seguir "cite ou recuse" e com janela
  maior + prompt caching. **Descartada** porque **não roda nativamente no tenant Azure** (oferta de
  primeira-parte é AWS Bedrock / GCP Vertex): adotá-lo reintroduz um segundo fornecedor, outra rede,
  outra fatura e outra superfície de compliance — exatamente o que a integração M365/Azure existe
  para evitar — em troca de uma vantagem de modelo que o pipeline + enforcement determinístico em
  grande parte neutralizam, ao custo extra irrisório de ~US$ 36/mês. Mantido como **candidato de
  benchmark** na camada de abstração.
- **Open-source via Ollama (self-host em Azure GPU)** — atrai por "custo zero de token" e soberania
  de dados. **Descartada** porque (a) a soberania já é atendida pelo Azure OpenAI (dados no tenant,
  sem treino, região fixada); (b) o custo **inverte para infraestrutura**: GPU 24/7 capaz de rodar um
  70B com PT-BR aceitável custa ~US$ 1.500–3.000/mês — ordem de grandeza acima das APIs no volume
  real; (c) modelos abertos menores são mais fracos em **PT-BR formal + seguir instrução + citação
  estruturada**, exigindo fine-tuning/MLOps que a equipe não tem em 3 meses.

## Devil's advocate

Contra-argumentos mais fortes levantados e como a decisão responde (debate completo em
[`devils-advocate/ADR-0001-debate.md`](./devils-advocate/ADR-0001-debate.md)):

- **"Lock-in na Azure é uma armadilha."** Respondido pela camada de abstração + pipeline RAG
  agnóstico: o ativo caro (índice, chunking, eval, guardrails) é independente do LLM; trocar de
  modelo é mudança de config. O lock-in fica restrito ao SDK, e é aceito conscientemente em troca da
  integração nativa que o prazo exige.
- **"O custo do GPT-4o no volume real inviabiliza."** Refutado pelos números: ~US$ 148/mês,
  ~US$ 750/mês mesmo a 5× de crescimento. Só se tornaria material com crescimento de ~50×, irreal
  para 45 atendentes.
- **"Claude é melhor em não alucinar e em PT-BR — vocês escolheram o pior modelo."** Aceito como
  vantagem marginal de modelo, mas não-alucinação é garantida fora do modelo (RAG + filtro
  determinístico, Princípios III–IV); a vantagem não compensa quebrar a história de tenant único
  Azure. Risco coberto pelo benchmark trimestral GPT-4o vs Claude — se o gabarito mostrar GPT-4o
  pior em PT-BR/grounding, a camada de abstração permite migrar.
- **"Open-source dá soberania e custo zero."** Refutado: soberania já entregue pelo Azure OpenAI; o
  custo migra para GPU + ops acima das APIs; qualidade PT-BR/instrução insuficiente sem MLOps no
  prazo.
