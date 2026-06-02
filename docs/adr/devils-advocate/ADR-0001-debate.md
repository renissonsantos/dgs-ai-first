# Debate — Devil's advocate do ADR-0001

> Histórico do contraditório sobre **adotar Azure OpenAI (GPT-4o) como LLM de produção**.
> O rascunho original justificava a escolha sobretudo por "integração com Azure". O debate
> abaixo estressou essa justificativa e tornou a decisão final mais robusta (camada de
> abstração, benchmark recorrente, enforcement determinístico, fixação de versão).

## Rascunho atacado

> "Escolhemos Azure OpenAI GPT-4o porque a NovaTech já é Microsoft, integra fácil com Teams e
> SharePoint, tem janela de 128K e custo competitivo."

Problema do rascunho: é uma justificativa por **preferência de stack**, não por trade-off ancorado
em número. Não diz por que não Claude, não quantifica custo, e trata "não alucinar" como se fosse
resolvido pela escolha do modelo.

## Contra-argumento 1 — Lock-in na Azure

**Ataque.** Casar com Azure OpenAI prende a NovaTech ao SDK, ao formato de deployment e à fatura da
Microsoft. Se a Azure subir preço, deprecar o GPT-4o ou degradar o serviço, o custo de saída é alto
e a NovaTech fica refém.

**Resposta incorporada ao ADR.** O ativo caro de um sistema RAG não é o LLM — é o índice vetorial, a
estratégia de chunking, o harness de avaliação e os guardrails. Esses componentes ficam **agnósticos
ao provedor**. Adicionando uma **camada de abstração de modelo** (Azure AI Inference SDK / LiteLLM),
trocar o LLM vira mudança de configuração. O lock-in real fica restrito ao SDK de chamada, e é
**aceito conscientemente** porque a integração nativa (Entra ID, AI Search, Bot Service) é o que
viabiliza o go-live em 3 meses. → Decisão **reforçada** com mitigação concreta, não revisada.

## Contra-argumento 2 — Custo do GPT-4o no volume real

**Ataque.** "Custo competitivo" é afirmação vazia sem número. No volume real pode ser caro.

**Resposta incorporada ao ADR.** Forçou a estimativa explícita: ~12K tokens in + ~0,5K out por
consulta, 4.224 consultas/mês → ~US$ 148/mês; ~US$ 750/mês mesmo a 5× de crescimento. O ataque se
**auto-refuta**: o custo só seria material com ~50× de crescimento, irreal para 45 atendentes. Efeito
colateral importante do número: ele mostra que **custo não é o critério de desempate** — o que
reposicionou a justificativa principal do ADR de "custo competitivo" para "integração + prazo".

## Contra-argumento 3 — Claude é melhor em grounding e PT-BR

**Ataque.** Claude (Sonnet) tende a seguir melhor instruções do tipo "cite ou recuse", tem janela
maior e prompt caching, e costuma ir bem em PT-BR. Vocês escolheram conscientemente um modelo
marginalmente pior para o requisito mais crítico (não alucinar). Isso contradiz os Princípios I–II.

**Resposta incorporada ao ADR.** Dois pontos. (a) Não-alucinação **não é** propriedade que se compra
no modelo: pelos Princípios III–IV e pelo glossário, é garantida por RAG curado + **filtro
determinístico** que rejeita resposta sem fonte. A vantagem de modelo do Claude incide sobre a
camada já blindada por código. (b) Claude **não roda nativamente no tenant Azure** (primeira-parte é
Bedrock/Vertex); adotá-lo reintroduz segundo fornecedor, rede, fatura e compliance — o oposto do
objetivo da integração — por ~US$ 36/mês de diferença. **Risco residual reconhecido e mitigado**: a
camada de abstração mantém Claude como candidato de benchmark, e o harness trimestral contra o
gabarito (Anexos A/B) compara GPT-4o vs Claude em PT-BR/grounding; se o GPT-4o ficar atrás, a
migração é mudança de config. → Decisão **reforçada**, com a honestidade de listar "não escolhemos o
melhor modelo disponível" nas consequências negativas.

## Contra-argumento 4 — Open-source dá soberania de dados e custo zero

**Ataque.** Self-host via Ollama elimina custo por token e mantém todos os dados internos —
atraente para uma logística com docs sensíveis (frete, compliance).

**Resposta incorporada ao ADR.** (a) Soberania já é atendida pelo Azure OpenAI: dados ficam no
tenant, não treinam o modelo, região fixável — o ataque resolve um problema que não existe. (b)
"Custo zero" é ilusão contábil: migra para GPU 24/7 (~US$ 1.500–3.000/mês para um 70B viável em
PT-BR), **acima** das APIs no volume real. (c) Modelos abertos menores são mais fracos em PT-BR
formal + seguir instrução + citação estruturada, exigindo fine-tuning/MLOps que a equipe não tem em
3 meses. → Alternativa **descartada** com motivo ancorado em custo e capacidade, não em preconceito.

## Resultado do debate

Decisão **mantida** (Azure OpenAI GPT-4o), porém visivelmente mais robusta que o rascunho:

1. Justificativa principal migrou de "custo competitivo" para **integração + prazo**, porque os
   números mostraram que custo não desempata.
2. Adicionada **camada de abstração de modelo** como mitigação central de lock-in e como porta de
   saída para Claude.
3. Não-alucinação reposicionada como responsabilidade de **pipeline + enforcement determinístico**,
   não do modelo.
4. Adicionados **benchmark trimestral contra o gabarito** e **fixação de versão de deployment** como
   mitigações acionáveis.
