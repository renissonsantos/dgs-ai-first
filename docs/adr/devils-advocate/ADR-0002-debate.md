# Debate — Devil's advocate do ADR-0002

> Contraditório sobre **gerenciar o contexto por orçamento fixo, retrieval reordenado e memória
> conversacional mínima**. O rascunho inicial era mais ingênuo (k fixo, resumo de histórico a cada
> turno); o debate o endureceu (k adaptativo, documento como fonte de verdade, contabilidade
> determinística de tokens).

## Rascunho atacado

> "Recuperamos os chunks mais relevantes, mandamos pro GPT-4o junto com o histórico da conversa
> resumido e a pergunta. Como a janela é de 128K, sobra espaço de sobra."

Problemas: confia na folga da janela (anti-Princípio V), fixa k sem justificar cobertura vs atenção,
e resume histórico sem distinguir o que é seguro resumir do que é factual.

## Contra-argumento 1 — "Mais chunks sempre melhora a resposta"

**Ataque.** Se o risco é faltar informação, traga mais chunks. Com 128K de janela, por que limitar a
6? Top-30 cobre praticamente tudo e elimina o risco de recall insuficiente.

**Resposta incorporada ao ADR.** Recall e precisão se opõem. Subir k aumenta a chance de o chunk
certo estar presente, mas (a) consome **orçamento de atenção** — pelo glossário, excesso de
informação **degrada** a resposta; (b) agrava o **lost in the middle**, enterrando o chunk bom no
meio de 30; (c) multiplica custo (~10× tokens/consulta vs ADR-0001); (d) **aumenta a injeção da
versão errada** (PROC-042 antigo vs v2). A cobertura correta vem de **reranking** (top-20 → 6) e, em
multi-domínio, de **decomposição por domínio**, não de volume. Concessão incorporada: **k adaptativo**
— se o melhor score de rerank ficar abaixo do limiar, o harness expande 6 → 12 antes de responder.
Assim cobre-se o caso real de recall insuficiente sem pagar o custo de inundar todas as consultas.
→ Decisão **reforçada**.

## Contra-argumento 2 — "Resumir histórico perde informação crítica do atendimento"

**Ataque.** Atendimento lida com prazos e valores exatos (7 dias úteis, multiplicador de frete). Se
você resume o histórico, vai arredondar/perder esses números, e o atendente responde errado ao
cliente — violando o requisito de não inventar prazos/valores.

**Resposta — revisão da decisão.** Ataque procedente contra o rascunho (que resumia tudo). A decisão
final **separa dois tipos de memória**: (a) as **últimas 3 trocas ficam literais** (janela
deslizante, sem resumo) e (b) o **resumo rolante guarda só entidades/estado** ("cliente Gold; tópico:
devolução"), nunca valores. O ponto central da revisão: **a fonte de verdade é o documento, não a
conversa** — prazos e valores são sempre **re-recuperados** do RAG a cada pergunta, então não existe
número crítico "preso" no histórico que o resumo possa corromper. O histórico serve só para
correferência linguística. → Decisão **revisada e mais robusta**.

## Contra-argumento 3 — "A janela de 128K torna o gerenciamento desnecessário"

**Ataque.** Todo esse aparato (orçamento, reranking, janela deslizante, reset) é over-engineering.
Cabe tudo em 128K com folga; basta jogar chunks + histórico inteiro e deixar o modelo lidar.

**Resposta incorporada ao ADR.** 128K é **teto físico, não orçamento de trabalho**. Caber não é o
mesmo que ser bem atendido: lost in the middle e context rot **independem de haver espaço** — são
efeitos de como a atenção se distribui num contexto grande. Encher a janela ainda **multiplica o
custo** linear de tokens (ADR-0001) e degrada precisão. O Princípio V é taxativo: gerenciar, não
maximizar. O aparato existe justamente porque a folga de janela **não** compra qualidade. → Decisão
**reforçada**.

## Contra-argumento 4 (levantado no debate) — Overflow e descarte silencioso

**Ataque.** Se a sessão crescer e o orçamento estourar, o que é cortado? Um truncamento cego pode
derrubar os guardrails ou a própria pergunta, quebrando a não-alucinação.

**Resposta incorporada ao ADR.** Adicionada **contabilidade de tokens determinística** no harness com
ordem de descarte explícita: primeiro o **histórico mais antigo**, depois os **chunks de menor
score**; **system/guardrails e pergunta nunca são truncados**. Overflow deixa de ser silencioso e
nunca compromete os elementos críticos. → Mitigação nova, decisão **reforçada**.

## Resultado do debate

Decisão **mantida na estrutura, revisada nos detalhes**:

1. Introduzido **k adaptativo** (6 → 12 por gatilho de score), respondendo ao recall insuficiente sem
   inundar o contexto.
2. Memória **dividida** em janela literal recente + resumo só de entidades, com o **documento como
   fonte de verdade** — neutraliza a perda por resumo.
3. Adicionada **contabilidade determinística de tokens** com ordem de descarte protegendo
   system/guardrails/pergunta.
4. Reafirmado que 128K é teto físico, não licença para encher a janela (Princípio V).
