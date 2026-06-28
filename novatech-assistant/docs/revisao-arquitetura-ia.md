# Revisão Crítica da Arquitetura Gerada com IA (Tech Lead, Cenário 3.2)

> Revisão de riscos dos artefatos produzidos com apoio de IA, antes do go-live (2 semanas).
> Método pedido: **avaliação própria primeiro**, depois **co-review com Claude**, depois
> **priorização**. Esta seção registra as três etapas com honestidade sobre o que cada uma achou.

Artefatos sob revisão (do enunciado):
- A. AGENTS.md gerado pelo Claude, refinado 4×, ~15 páginas.
- B. 3 skills — a Foundation refinada após testes; as outras 2 usadas **sem** refinamento.
- C. Pipeline de ingestão e query endpoint — ~60–70% gerados pelo Copilot.
- D. System prompt iterado 6× **sem documentar** o porquê de cada mudança.

---

## Etapa 1 — Avaliação própria (Tech Lead), ANTES do Claude

| # | Artefato | Risco de ter sido gerado por IA | O que verificar antes do go-live |
|---|----------|----------------------------------|----------------------------------|
| A | AGENTS.md 15 pág., 4 refinos | **Tamanho vs aderência:** 15 páginas competem por atenção do agente — regras no fim são menos seguidas; refino pode ter introduzido **contradições internas** entre versões. | Testar empiricamente (gerar 2–3 artefatos e medir aderência); caçar contradições; mover regras críticas para o topo / encurtar. |
| B | 2 skills sem refinamento | **Alto:** skill não testada gera **output inconsistente** — o agente segue um exemplo possivelmente errado com confiança. É o mesmo risco que já se materializou (módulo de feedback violou o AGENTS.md). | Rodar cada skill em ≥3 gerações reais e medir aderência; refinar com base no resultado antes de confiar nela. |
| C | Pipeline + query ~60–70% Copilot | **Médio:** código plausível mas com bugs sutis (validação fraca, erro engolido, sem teste de caminho infeliz); decisões implícitas não rastreadas a ADR. | Code review humano focado em validação/erro/segurança; cobertura dos caminhos de falha; conferir aderência ao AGENTS.md. |
| D | System prompt 6× sem changelog | **Alto (governança):** sem registro do **porquê** de cada mudança, não há **rollback informado** — se a v6 piorar, não se sabe ao que voltar nem por quê. Mudança de prompt é mudança de comportamento sem trilha de auditoria. | Reconstruir um changelog mínimo (o que mudou e por quê em cada iteração); congelar a versão atual; exigir changelog para mudanças futuras (HITL). |

Armadilhas que marquei como prioridade já nesta etapa: **B (skills sem refino)** e **D (prompt sem changelog)** — são os dois riscos que mais minam a *governabilidade*, não só a qualidade pontual.

## Etapa 2 — Co-review com Claude (riscos adicionais)

Pedi ao Claude uma segunda passada. Riscos que ele levantou e que eu **não** tinha listado (ou subestimei):

1. **Skills sem refino + AGENTS.md grande interagem:** uma skill Domain ruim pode **sobrepor** o AGENTS.md (o agente imita o exemplo colável mais que a prosa — exatamente o que observamos no cenário 2). Logo o risco de B é maior na presença de A.
2. **"Refinado 4×" não é o mesmo que "testado":** refino pode ter sido só edição textual sem teste empírico com agente. Verificar se houve *teste real*, não só reescrita.
3. **Acoplamento de versões:** o system prompt (D) é consumido pelo `prompt-builder` dentro do orçamento da ADR-0002 — se a v6 ficou mais longa, pode ter **estourado o ~2K** reservado a system+guardrails, comendo orçamento de chunks. Medir o tamanho em tokens da v6.
4. **Falta de owner/data nos artefatos de IA:** sem dono declarado, ninguém é responsável por revalidar quando a base documental mudar.

Comparação honesta: minha lista acertou os dois riscos centrais (B e D) e o de tamanho do AGENTS.md. **Não tinha visto** a interação A×B (#1), o risco de tokens do prompt (#3) nem a questão de ownership (#4). O Claude também concordou que **C é o de menor risco relativo** (código tem teste e compila), o que me ajudou a despriorizá-lo com segurança.

## Etapa 3 — Priorização (2 semanas)

Critério: maior **redução de risco de governança/qualidade por hora investida**, dado o prazo.

**Faço primeiro (semana 1) — bloqueante:**
1. **D — Changelog do system prompt + congelar v6** (½ dia). Barato e elimina o pior risco de
   governança (rollback cego). Passa a exigir changelog por mudança (HITL).
2. **B — Testar e refinar as 2 skills sem refino** (1–2 dias). Rodar ≥3 gerações cada, medir
   aderência, corrigir anti-padrões. Reduz o risco que já se materializou (feedback fora do padrão).
3. **#3 — Medir os tokens da v6 do prompt** vs o teto de ~2K da ADR-0002 (1h). Se estourou, cortar.

**Faço se sobrar tempo (semana 2) — alto valor, não bloqueante:**
4. **A — Teste empírico do AGENTS.md** + caça a contradições; encurtar/reordenar (1 dia).
5. **C — Code review dirigido** dos trechos Copilot (validação, erro, segurança) (1 dia).

**Aceito como risco residual explícito (com mitigação leve):**
- Cobertura 100% dos caminhos de falha do pipeline — aceito ~75% atual + monitoramento
  (observability da camada 5) para pegar o resto em produção.
- Groundedness automática das respostas — aceito por ora; mitigado pelo `verifySource` +
  guardrail de carga perigosa + HITL para baixa confiança em tema sensível.
- `#4` ownership formal de cada artefato — registro um dono provisório (Tech Lead) e formalizo depois.

**Por que esta ordem:** D e B custam pouco e atacam *governabilidade* (rollback e consistência),
que é o objetivo desta fase; A e C são qualidade incremental com custo maior; o que sobra é coberto
por observabilidade + guardrails em vez de tentar "verificar tudo" em 2 semanas (o que não cabe).

> Conexão com os cenários anteriores: a mitigação de B reusa os **critérios de maturidade de skill**
> definidos no cenário 2.3; a de D conecta-se ao `prompts/prompt-changelog.md` já existente no repo
> (a prática volta a ser obrigatória); a de #3 respeita o **orçamento da ADR-0002** (cenário 1).
