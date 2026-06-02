# Debate — Devil's advocate do ADR-0004

> Contraditório sobre **comprar a infra de RAG gerenciada e construir só a camada de orquestração**.
> O rascunho tratava a questão como binária (build OU buy) e dizia "Azure já está pago"; o debate
> desmontou as duas premissas e produziu a posição buy-infra **+** build-orquestração, com PoC como
> gate.

## Rascunho atacado

> "Como a NovaTech já é Azure e já paga o M365, usamos Azure AI Search nativo de ponta a ponta —
> menos trabalho, tudo integrado, sem manter open-source."

Problemas: (a) "já paga" é falso — E3 não cobre AI Search/Azure OpenAI; (b) "nativo de ponta a ponta"
sugere no-code, que **não implementa** ADR-0002/0003; (c) trata build vs buy como binário, ignorando
que a lógica crítica é código de aplicação em qualquer cenário.

## Contra-argumento 1 — "Azure nativo elimina a integração e já está pago"

**Ataque.** A NovaTech já vive no ecossistema Microsoft. Azure AI Search + "OpenAI On Your Data"
conectam no SharePoint sozinhos; é tudo no-code, já contratado, sem dev. Por que escrever código?

**Resposta incorporada ao ADR.** Duas correções factuais e uma de fundo. (1) **M365 E3 não inclui**
Azure AI Search nem Azure OpenAI — são serviços provisionados e faturados à parte; "já está pago" é
falso. (2) O caminho **no-code** ("On Your Data") **não implementa** o orçamento/reordenação do
ADR-0002 nem a co-recuperação/vigência/enforcement do ADR-0003 — que são justamente os guardrails
críticos dos Princípios III–IV. (3) Por isso a decisão **concorda em comprar a infra**, mas a
orquestração determinística **precisa ser construída**. O no-code fica como **acelerador de PoC**, não
arquitetura final. → Decisão **refinada** para buy-infra + build-orquestração.

## Contra-argumento 2 — "Open-source vira dívida operacional sem time para manter"

**Ataque.** Construir com LangChain + Chroma é divertido, mas em 6 meses vira um Frankenstein que só
o dev original entende, com indexer caseiro quebrando e ninguém de MLOps para socorrer.

**Resposta incorporada ao ADR.** Concordamos — e é **por isso** que rejeitamos self-host de vector
store e framework pesado. A dívida operacional de infraestrutura (indexação, OCR, agendamento,
monitoração, backup) fica **com a Azure**. O que construímos é uma **camada fina** (orçamento,
reordenação, conflito, enforcement) — código pequeno, focado e **testado contra o gabarito** —, não
infraestrutura. O ataque, na verdade, **reforça** a decisão de não fazer self-host. → Decisão
**reforçada**.

## Contra-argumento 3 — "Lock-in vs flexibilidade no prazo de 3 meses"

**Ataque.** Comprar Azure AI Search prende a NovaTech à API e ao formato de skillset da Microsoft. E
se o semantic ranker for ruim em PT-BR? E se quiserem trocar de nuvem? Open-source daria flexibilidade.

**Resposta — revisão da decisão.** O ataque inverte as prioridades do prazo: em **3 meses**,
flexibilidade-para-reconstruir vale pouco; **time-to-value** vale tudo — e a infra gerenciada entrega
indexação/OCR/agendamento prontos. A flexibilidade que **realmente** importa (ADR-0002/0003) é
preservada porque vive no **nosso código**, não na ferramenta. Sobre os riscos concretos levantados,
incorporadas duas mitigações: (1) **reranking atrás de interface** — se a PoC mostrar o semantic
ranker fraco em PT-BR/tabelas de frete, troca-se por **cross-encoder na aplicação** sem refazer o
resto; (2) **interface de retrieval abstraída**, confinando o lock-in à implementação. → Decisão
**revisada** com plano B explícito.

## Contra-argumento 4 (levantado no debate) — "Então use LangChain para ir mais rápido"

**Ataque.** Se a orquestração tem de ser construída de qualquer jeito, um framework (LangChain/
LlamaIndex) acelera isso — conectores, retrievers e memória prontos. Escrever do zero é reinventar a
roda no meio de um prazo apertado.

**Resposta incorporada ao ADR.** Os requisitos do ADR-0002/0003 são **específicos e determinísticos**
demais para as abstrações genéricas do framework: orçamento com ordem de descarte, co-recuperação
não-deduplicável, enforcement que **rejeita** saída. Domar a opinião do framework e depurar através de
suas camadas, num time que **mantém o código depois**, custa mais que escrever código direto sobre o
SDK da Azure. Frameworks também trazem **churn de versão**. O "build" aqui é deliberadamente **fino e
sobre o SDK**, não um framework caseiro nem um framework de terceiro. → Decisão **reforçada**.

## Contra-argumento 5 (levantado no debate) — Extração imperfeita das fontes

**Ataque.** O indexer gerenciado pode estragar tabelas de frete (15+ colunas), macros do Confluence e
planilhas com fórmulas — e aí a qualidade do RAG cai independentemente da arquitetura.

**Resposta incorporada ao ADR.** Risco real e independente de build/buy. Mitigação: **validação de
extração determinística na ingestão** (ex.: conferir a contagem de colunas esperada de tabelas de
frete, integridade de chunks de docs OCR), com **fila de curadoria** em caso de falha — reaproveitando
o mecanismo do ADR-0003. A PoC inclui explicitamente um doc de tabela complexa e um escaneado no
gabarito. → Mitigação nova, decisão **reforçada**.

## Resultado do debate

Decisão **reposicionada e endurecida**:

1. Deixa de ser binária: vira **buy-infra (Azure AI Search/OpenAI/Document Intelligence) +
   build-orquestração fina** (responde aos contra-argumentos 1 e 4).
2. Self-host de store e framework pesado **descartados** justamente para evitar dívida operacional
   (responde ao 2).
3. **PoC com gate antes das licenças**, em Basic/semantic grátis, contra os casos difíceis do gabarito
   (PROC-042, Platinum, tabela de frete, OCR).
4. **Plano B explícito**: reranking e store atrás de interface; cross-encoder próprio se o semantic
   ranker reprovar (responde ao 3).
5. **Validação de extração na ingestão** com fila de curadoria (responde ao 5).
