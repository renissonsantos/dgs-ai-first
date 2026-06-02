# ADR-0002: Gerenciar o contexto por orçamento fixo, retrieval reordenado e memória conversacional mínima

## Status

Aceito

2026-06-01 — Tech Lead.

## Contexto

Definido o GPT-4o no Azure (ADR-0001), com janela de **128K tokens**, é preciso decidir **o que o
LLM vê a cada consulta** — não quanto cabe. O Princípio V é explícito: o orçamento de contexto é
**gerenciado, não maximizado**; e o Princípio IV trata RAG como **problema de dados**, não de volume
de prompt. Encher a janela é o anti-padrão a evitar.

Forças que pressionam a decisão (números de `context/cenario-1-novatech.md` e glossário):

- **Janela de 128K, mas teto físico ≠ orçamento de trabalho.** System prompt + guardrails ocupam
  **~2K tokens** (estáticos). Chunks têm **~500 tokens** cada (chunking por seção com overlap de
  10%, conforme análise técnica). A base de **~12M tokens** vive no vector store — nunca no prompt.
- **Orçamento de atenção é finito.** Pelo glossário, informação em excesso **degrada** a qualidade
  (não melhora), e o **lost in the middle** faz o conteúdo no meio de um contexto grande receber
  menos atenção. Logo, mais chunks ≠ melhor resposta.
- **Perguntas multi-domínio.** Casos reais cruzam SLA + frete + devolução (ex.: "qual o prazo de
  devolução de uma carga Gold acima de 500kg?"). Um top-k único por similaridade tende a ser
  dominado por **um** domínio, deixando os outros sem cobertura.
- **Conversas longas no Teams.** O bot recebe **várias perguntas na mesma sessão**; é o cenário
  clássico de **context rot** — informação do início da sessão é progressivamente "esquecida" — e de
  **context overflow** silencioso se o histórico for acumulado sem limite.
- **Risco de versão errada.** O retriever pode trazer o **PROC-042 antigo em vez do v2** (chunk
  errado). O tratamento da contradição em si é do ADR-0003; aqui importa que **inflar o número de
  chunks aumenta** a chance de injetar a versão errada.

## Decisão

Adotar um **orçamento de contexto fixo por consulta (~10K tokens de entrada, teto rígido 16K — ~8–12%
dos 128K)**, alimentado por **retrieval com reranking e reordenação anti-lost-in-the-middle**,
**decomposição por domínio** para perguntas multi-domínio, e **memória conversacional mínima** (janela
deslizante curta + resumo de entidades), com **contabilidade de tokens determinística** no harness.

### Orçamento por parte (alvo por consulta)

| Parte | Tipo | Orçamento | Regra |
|-------|------|-----------|-------|
| System prompt + guardrails | estático | ~2K | nunca truncado |
| Chunks recuperados | dinâmico | ~3–6K | 6 chunks (single-domínio); até 12 (multi-domínio) × ~500 tok |
| Histórico da sessão | dinâmico | ≤2K | janela deslizante das últimas 3 trocas + resumo de entidades ≤300 tok |
| Pergunta atual | dinâmico | ~0,2K | sempre no fim do prompt |
| **Subtotal de entrada** | | **~8–10K** | teto rígido de **16K** dispara descartes |
| Reserva para a resposta | saída | ~1K | reservada antes de montar o prompt |

O teto de 16K é deliberadamente **~8× menor** que os 128K disponíveis — aplicação direta do
Princípio V.

### Como cada questão é resolvida

1. **Número de chunks (cobertura vs orçamento de atenção).** Recuperar **top-20 candidatos** por
   similaridade, **rerankear** (semantic ranker do Azure AI Search / cross-encoder) e **manter 6**
   por padrão. Mais recall na recuperação, mais precisão no que entra no prompt. Não se mandam os 20
   ao modelo: isso gastaria orçamento de atenção e elevaria o risco de chunk de versão errada.
2. **Lost in the middle.** Ordenar os chunks selecionados em "V": **maior score no início e no fim**,
   menores no meio. System/guardrails ficam no **início** (primazia); a **pergunta no fim**
   (recência). Posicionamento determinístico por score, não aleatório.
3. **Multi-domínio (SLA + frete + devolução).** **Decompor** a pergunta em sub-perguntas por domínio,
   recuperar **top-4 por sub-pergunta**, **mesclar e deduplicar**, rerankear e cortar em ~12. Garante
   que **cada domínio** esteja representado, em vez de um domínio monopolizar o top-k.
4. **Context rot em sessões longas.** **Não carregar chunks de turnos anteriores adiante** — cada
   pergunta dispara **re-retrieval do zero**. O que sobrevive entre turnos é só **memória
   conversacional**: (a) **janela deslizante literal das últimas 3 trocas** (para correferência:
   "e para carga perigosa?") e (b) um **resumo rolante apenas de entidades/estado** (ex.: "cliente
   tier Gold; tópico atual: devolução"). Valores e prazos **nunca** vêm da memória — vêm sempre do
   re-retrieval do documento. **Reset de contexto** automático quando a similaridade entre a nova
   pergunta e o resumo da sessão cai abaixo do limiar (mudança de tópico) ou sob comando.

### Por que esta combinação (trade-off)

Ela maximiza a chance de o chunk certo estar presente **e** bem posicionado, dentro de um orçamento
pequeno — em vez de apostar que "mais contexto" compensa retrieval fraco. Trata o problema como de
**dados/curadoria** (Princípio IV): reranking e decomposição melhoram a resposta sem inflar o prompt.

## Consequências

**Positivas**

- Qualidade protegida do orçamento de atenção e do lost in the middle, com custo por consulta baixo e
  estável (alinhado aos ~12K tok/consulta do ADR-0001).
- Multi-domínio coberto por construção, não por sorte do top-k.
- Context rot eliminado na raiz: nenhum chunk velho sobrevive; só estado conversacional compacto.
- Overflow torna-se impossível silenciosamente (teto rígido + descarte ordenado).

**Negativas / custos**

- **Recall limitado pelo k pequeno**: uma resposta que exigisse o 7º chunk mais relevante pode faltar.
- **Decomposição multi-domínio adiciona latência e custo** (mais uma chamada de classificação/
  decomposição + mais buscas por consulta).
- **Reranking** adiciona uma dependência (semantic ranker / cross-encoder) e latência.
- **Janela deslizante de 3 trocas pode perder** uma referência feita 5 perguntas atrás que não tenha
  entrado no resumo de entidades.

**Mitigações** (concretas)

- **Contabilidade de tokens determinística no harness**: ao montar o prompt, mede-se o total; se
  passar de 16K, descarta-se **primeiro o histórico mais antigo, depois os chunks de menor score** —
  **system/guardrails e a pergunta nunca são truncados**. Elimina overflow silencioso (Princípio V).
- **k adaptativo com gatilho de cobertura**: se o melhor score de rerank ficar abaixo de um limiar
  (sinal de recall insuficiente), o harness amplia de 6 → até 12 chunks **antes** de responder, em
  vez de fixar k cegamente.
- **Reordenação por score** aplicada por código (não confiada ao acaso da ordem de busca) para o
  lost in the middle.
- **Resumo de entidades versionado por turno** (entidades + tópico), separado das trocas literais, de
  modo que o reset por mudança de tópico não apague o estado factual da sessão.
- **Fonte de verdade é o documento, não a memória**: prazos/valores sempre re-recuperados; a memória
  conversacional carrega só correferência — neutraliza perda por resumo.

## Alternativas consideradas

- **Context stuffing / encher a janela (top-50 chunks, usar grande parte dos 128K).** Descartada
  porque viola o Princípio V e o orçamento de atenção: degrada precisão, agrava o lost in the middle,
  multiplica o custo (~10× tokens/consulta vs ADR-0001) e **aumenta** a injeção do chunk de versão
  errada (PROC-042). Janela grande não resolve qualidade de retrieval.
- **Stateless puro (reset total a cada pergunta, zero histórico).** Descartada porque quebra
  follow-ups naturais no Teams (correferência "e para carga perigosa?"), forçando o atendente a
  repetir contexto a cada pergunta — degrada a meta de < 2 min/chamado.
- **Histórico completo acumulado (toda a conversa no prompt, sem gestão).** Descartada porque leva a
  context rot e a overflow inevitável em sessões longas, com custo crescente a cada turno.
- **Resumir todo o histórico a cada turno (memória 100% por resumo).** Descartada porque resumir cedo
  perde precisão de **valores e prazos** críticos do atendimento; por isso mantemos a janela
  deslizante literal das trocas recentes e resumimos **apenas entidades/estado**.

## Devil's advocate

Contra-argumentos mais fortes e como a decisão responde (debate completo em
[`devils-advocate/ADR-0002-debate.md`](./devils-advocate/ADR-0002-debate.md)):

- **"Mais chunks sempre melhora a resposta."** Refutado: aumentar k eleva recall mas **derruba
  precisão**, consome orçamento de atenção, agrava lost in the middle e injeta versão errada. A
  cobertura vem de **reranking + decomposição por domínio**, não de volume. O k adaptativo expande só
  quando o sinal de recall indica necessidade.
- **"Resumir o histórico perde informação crítica do atendimento (prazos, valores)."** Aceito em
  parte — e por isso a decisão **não resume as trocas recentes** (janela deslizante literal) e trata
  **o documento, não a memória, como fonte de verdade**: prazos/valores são sempre re-recuperados. O
  resumo guarda só entidades/estado, então não há perda factual a resumir.
- **"A janela de 128K torna todo esse gerenciamento desnecessário."** Refutado: 128K é teto físico,
  não orçamento de trabalho. Encher a janela não cura lost in the middle nem context rot e multiplica
  o custo; o Princípio V manda gerenciar, não maximizar.
