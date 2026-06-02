# ADR-0003: Manter ambas as versões com metadado de vigência e resolução determinística de conflito na ingestão

## Status

Aceito

2026-06-01 — Tech Lead.

## Contexto

A base da NovaTech contém **documentos contraditórios** — caso de referência: **PROC-042 vs
PROC-042-v2**, mesma numeração, **multiplicadores de frete diferentes e sem indicação de qual é
vigente**. Não é incidente isolado: foram identificados **ao menos 3 procedimentos** em conflito.

Forças que pressionam a decisão (números de `context/cenario-1-novatech.md`):

- **A documentação é atualizada por 3 áreas** (Operações, Compliance, Comercial), **sem processo de
  revisão unificado** e em cadências diferentes (mensal/semanal). É a causa-raiz dos conflitos: ninguém
  declara qual versão é a vigente.
- **A fonte não carrega vigência confiável.** O nome "v2" sugere ordem, mas **não garante** que a v2
  esteja em vigor (uma área pode ter revertido). `Last-modified` do arquivo é frágil (cópia/migração
  reseta a data). Ou seja, **não dá para derivar a vigência só do conteúdo** — é o cerne do problema.
- **Requisito explícito do Product Specialist:** "documentos contraditórios devem **mostrar ambas as
  versões com indicação de data**". Isso descarta de saída qualquer solução que esconda uma versão.
- **Princípios da Constituição:** IV (RAG é, antes de tudo, **problema de dados** — conflitos e
  obsolescência tratados **no pipeline com mecanismos concretos**, não com "atenção" do modelo); II
  (não inventar — aqui, não inventar qual versão vale); III (guardrails críticos com **enforcement
  determinístico**).
- **Interação com o ADR-0002.** O retrieval recupera top-20 → rerank → 6 chunks e, em multi-domínio,
  **mescla e deduplica**. Duas versões do mesmo procedimento são textualmente parecidas e correm o
  risco de serem **deduplicadas — descartando silenciosamente uma versão** — ou de só uma ser
  recuperada (o "chunk de versão errada" do ADR-0002). O tratamento do conflito precisa acontecer
  **antes** desse corte.
- **Latência de atualização ≤ 24h** após publicação de novo documento (reindexação).

## Decisão

**Manter ambas as versões** indexadas, com **metadado de vigência** atribuído na **ingestão**, e
**resolver o conflito de forma determinística no pipeline** — não no prompt. Concretamente:

1. **Detecção de conflito na ingestão (determinística).** Agrupar documentos por **ID base**
   (ex.: `PROC-042`) normalizando o sufixo de versão. Dois itens com mesmo ID base e conteúdo
   divergente são marcados como **grupo de conflito**.
2. **Registro de vigência (governança de dados).** Um **registro canônico** (fora do conteúdo) guarda,
   por documento: `id_base`, `versao`, `data_vigencia`, `area_dona`, `status` (vigente | superado |
   **vigência não confirmada**). É a fonte de verdade da vigência, **mantida na ingestão** por um
   **steward por área**, não inferida do texto.
3. **Quando a vigência é conhecida:** o assistente **prioriza a versão vigente** e cita sua data;
   pode referenciar a superada como "versão anterior (data)". 
4. **Quando a vigência NÃO é confirmada** (o caso PROC-042 hoje): **fail-safe, não fail-guess** — o
   assistente **apresenta ambas as versões com suas datas/identificadores**, sinaliza
   "**vigência não confirmada — escalar ao supervisor**" e o pipeline **abre uma tarefa de curadoria**
   para a área dona declarar a versão canônica. Nunca escolhe um vencedor por conta própria.
5. **Enforcement determinístico (Princípio III).** Para um documento marcado como grupo de conflito,
   um **filtro pós-resposta rejeita** qualquer saída que cite **apenas uma** das versões sem
   apresentar a outra (quando vigência não confirmada) ou sem indicar data de vigência (quando
   conhecida). A obrigação de "mostrar ambas com data" **não depende da obediência do prompt**.
6. **Proteção no retrieval (corrige a interação com ADR-0002):** chunks do mesmo grupo de conflito são
   marcados como **não-deduplicáveis entre si** e **co-recuperados** (se um entra no contexto, a(s)
   contraparte(s) também entra). Impede que a deduplicação do ADR-0002 derrube uma versão.

### Justificativa por trade-off

A opção trata o conflito onde ele nasce — **nos dados e na governança de ingestão** (Princípio IV) — e
garante o requisito do Product Specialist por **código** (Princípio III), em vez de confiar que o
modelo "perceba" o conflito a cada resposta. Aceita-se o custo de governança (registro + steward) em
troca de uma garantia determinística sobre um guardrail crítico.

## Consequências

**Positivas**

- Atende o requisito "mostrar ambas com data" por construção, com **garantia de código**, não
  probabilística.
- Trata a causa-raiz (ausência de declaração de vigência) com um mecanismo de governança concreto.
- Elimina o risco de **descarte silencioso da versão certa** (vs "manter só a mais recente").
- Fecha a brecha do ADR-0002 (dedup que derrubava uma versão).
- "Vigência não confirmada" vira **trabalho rastreável** (fila de curadoria), reduzindo conflitos ao
  longo do tempo.

**Negativas / custos**

- **Cria uma dependência humana**: o registro de vigência e os stewards por área precisam existir e
  ser mantidos — trabalho de governança que a NovaTech hoje **não tem**.
- **Mais ruído potencial ao atendente** quando ambas as versões são exibidas (risco de confusão).
- **Complexidade de ingestão maior**: detecção de conflito, normalização de ID, co-recuperação,
  filtro de enforcement.
- **Não resolve o conflito de fato** enquanto a área não declarar vigência — apenas o expõe com
  segurança.

**Mitigações** (concretas)

- **Steward por área nomeado no go-live** (Operações, Compliance, Comercial) como dono do `status` de
  vigência; sem steward, o item entra como "vigência não confirmada" por padrão (fail-safe).
- **Fila de curadoria automática**: todo grupo de conflito sem vigência declarada gera tarefa para a
  área dona; reindexação em ≤ 24h após a declaração (atende a meta de latência).
- **UX que reduz confusão**: quando a vigência é conhecida, mostra a vigente em destaque e a anterior
  recolhida ("ver versão anterior"); só mostra lado a lado quando **não confirmada** — confusão
  pontual é preferível a uma resposta **confiantemente errada** de versão única.
- **Filtro de enforcement versionado** com teste contra o gabarito (Anexos A/B), incluindo o caso
  PROC-042, garantindo que ambas as versões saiam datadas.
- **Co-recuperação marcada no índice** (flag de grupo de conflito por chunk) para blindar contra a
  deduplicação do ADR-0002.

## Alternativas consideradas

- **Manter apenas a versão mais recente (descartar a antiga na ingestão).** Descartada porque (a)
  **viola o requisito** do Product Specialist de mostrar ambas com data; (b) "mais recente" é
  **indefinível com segurança** aqui — `last-modified` é frágil e "v2" não garante vigência; descartar
  cegamente pode **apagar justamente a versão em vigor**; (c) destrói a evidência que o atendente
  precisa para escalar.
- **Delegar a decisão ao LLM em tempo de resposta (via instrução no prompt).** Descartada porque
  **viola o Princípio IV** (trata problema de dados como atenção do modelo) e o **Princípio III**
  (guardrail crítico sob enforcement probabilístico): o modelo pode **alucinar** qual versão vale,
  pode receber só uma versão por efeito da dedup/recall (ADR-0002) e **não garante** que ambas sejam
  mostradas. Flexível, porém não confiável onde a confiabilidade é o requisito.
- **Resolução 100% manual fora do sistema (planilha de "qual vale", consultada pelo atendente).**
  Descartada porque é exatamente o estado atual ("perguntar para quem sabe") que o projeto veio
  eliminar; não escala para ~1.250 fontes nem cumpre a meta de < 2 min/chamado.

## Devil's advocate

Contra-argumentos mais fortes e como a decisão responde (debate completo em
[`devils-advocate/ADR-0003-debate.md`](./devils-advocate/ADR-0003-debate.md)):

- **"Delegar ao LLM é mais simples e flexível."** Refutado: simplicidade não pode custar a garantia.
  Delegar torna um guardrail crítico probabilístico (viola Princípios III–IV) e expõe a alucinação de
  vigência. A detecção determinística + enforcement por código é mais complexa, mas é a única que
  **garante** o requisito.
- **"Manter ambas confunde o atendente."** Parcialmente válido — endereçado pela UX (vigente em
  destaque; lado a lado só quando não confirmada) e pela sinalização de escalonamento. Confusão
  pontual é um custo menor que uma resposta única **confiantemente errada** sobre frete/compliance.
- **"Quem garante a data de vigência se as áreas não revisam?"** O ponto mais forte. A decisão **não
  finge** que a fonte tem vigência: cria o **registro de vigência com steward por área** e, na
  ausência de declaração, **assume "não confirmada"** (fail-safe) — mostra ambas, escala e abre
  curadoria. A governança é reconhecida como **pré-condição** e listada como custo/risco real, não
  varrida para baixo do tapete.
