# Debate — Devil's advocate do ADR-0003

> Contraditório sobre **manter ambas as versões com metadado de vigência e resolução determinística
> de conflito na ingestão**. O rascunho confiava demais no "metadado de vigência" como se ele
> existisse; o debate forçou encarar que a vigência **não existe na fonte** e exige governança, além
> de fechar a brecha de deduplicação herdada do ADR-0002.

## Rascunho atacado

> "Mantemos as duas versões, marcamos cada uma com a data de vigência e instruímos o assistente a
> priorizar a vigente e mostrar ambas quando houver conflito."

Problemas: (a) pressupõe que a **data de vigência está disponível** — mas o cenário diz "sem
indicação de qual é vigente"; (b) "instruir o assistente" é enforcement **probabilístico** num
guardrail crítico; (c) ignora que a dedup do ADR-0002 pode **derrubar** uma das versões antes de
chegar ao modelo.

## Contra-argumento 1 — "Delegar ao LLM é mais simples e flexível"

**Ataque.** Em vez de toda essa maquinaria de ingestão, basta colocar no prompt: "se houver versões
conflitantes, mostre ambas com data e priorize a mais recente". O LLM é bom nisso, e fica flexível
para casos novos sem reprogramar pipeline.

**Resposta incorporada ao ADR.** Flexível, mas não **confiável** — e aqui confiabilidade é o
requisito. Três falhas: (1) o modelo pode **alucinar** qual é a vigente (Princípio II), justamente o
risco do tier "Platinum" aplicado a versões; (2) por efeito do recall/dedup do ADR-0002, o modelo
pode **nem receber** as duas versões, então "mostrar ambas" fica impossível por mais que o prompt
peça; (3) é enforcement **probabilístico** de um guardrail crítico, o que o **Princípio III proíbe**.
A complexidade da detecção determinística é o preço da garantia. → Decisão **reforçada**.

## Contra-argumento 2 — "Manter ambas confunde o atendente"

**Ataque.** O atendente tem < 2 min por chamado. Mostrar duas versões com datas e multiplicadores
diferentes joga a decisão de volta no colo dele, justamente o que o assistente deveria evitar. Pior
que não ter assistente.

**Resposta — revisão da decisão.** Procedente o suficiente para mudar a UX. A versão final
**distingue dois casos**: quando a vigência **é conhecida**, mostra a vigente em destaque e recolhe a
anterior (não despeja as duas); só mostra **lado a lado** quando a vigência é **não confirmada** — e,
nesse caso, acompanha de "**escalar ao supervisor**", porque aí a decisão honestamente **não é** do
sistema. O contraste decisivo: a alternativa a "confundir às vezes" é "responder **confiantemente
errado**" sobre frete ou compliance, o que é pior para a NovaTech. → Decisão **revisada** (UX
condicional à vigência).

## Contra-argumento 3 — "Quem garante a data de vigência se as áreas não revisam?"

**Ataque.** Todo o ADR se apoia em "metadado de vigência". Mas a causa-raiz do problema é exatamente
que as 3 áreas **não fazem revisão unificada**. Logo o registro de vigência ou nasce vazio ou
desatualizado, e o sistema cai sempre no "não confirmada" — entregando, na prática, a alternativa que
você diz que confunde o atendente.

**Resposta — revisão da decisão.** O ataque mais forte, e expõe uma premissa frágil do rascunho.
Mudanças: (1) o ADR **para de fingir** que a vigência vem da fonte — ela passa a vir de um **registro
canônico** mantido na **ingestão** por um **steward por área**, nomeado **como pré-condição de
go-live**; (2) na ausência de declaração, o estado é **"vigência não confirmada" (fail-safe)**, nunca
um chute; (3) cada conflito não declarado vira **tarefa de curadoria** para a área dona, com
reindexação ≤ 24h após a resposta — o que transforma o passivo em **trabalho decrescente** em vez de
permanente. Reconhece-se honestamente, nas Consequências negativas, que isso **cria uma dependência
humana que a NovaTech não tem hoje** — é custo real da decisão, não detalhe. → Decisão **revisada e
mais honesta**.

## Contra-argumento 4 (levantado no debate) — Dedup do ADR-0002 derruba uma versão

**Ataque.** Duas versões do PROC-042 são quase idênticas no texto. A etapa de merge/dedup do ADR-0002
vai tratá-las como duplicata e descartar uma — então, mesmo querendo mostrar ambas, só uma chega ao
contexto.

**Resposta incorporada ao ADR.** Brecha real entre os ADRs. Correção: chunks do mesmo **grupo de
conflito** recebem flag no índice que os torna **não-deduplicáveis entre si** e força
**co-recuperação** (entrou um, entram os pares). O tratamento do conflito acontece **antes** do corte
de top-k. → Mitigação nova, decisão **reforçada** e consistência ADR-0002 ↔ ADR-0003 restaurada.

## Resultado do debate

Decisão **mantida na direção, revisada onde era frágil**:

1. A vigência deixa de ser pressuposta na fonte e passa a um **registro canônico + steward por área**,
   com **fail-safe "não confirmada"** e **fila de curadoria** (responde ao contra-argumento 3).
2. **UX condicional**: destaque da vigente quando conhecida; lado a lado + escalonamento só quando não
   confirmada (responde ao 2).
3. **Enforcement determinístico** por filtro pós-resposta, recusando saída que não mostre ambas/datas
   conforme o caso (responde ao 1).
4. **Co-recuperação não-deduplicável** fecha a brecha com o ADR-0002 (responde ao 4).
5. O custo de governança humana é assumido **explicitamente** nas consequências negativas.
