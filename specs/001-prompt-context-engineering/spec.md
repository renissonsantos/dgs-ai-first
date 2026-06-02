# Feature Specification: Prompt & Context Engineering como Artefato de Arquitetura Versionado

**Feature Branch**: `001-prompt-context-engineering`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Estratégia de prompt e context engineering como artefato de arquitetura versionado, para o assistente da NovaTech."

## Rastreabilidade

| ADR | Decisão | Relação com esta spec |
|-----|---------|----------------------|
| [ADR-0001](../../docs/adr/ADR-0001-adotar-azure-openai-gpt-4o-como-llm-de-producao.md) | Azure OpenAI GPT-4o como LLM de produção | Define o modelo cujos prompts esta spec versiona e testa |
| [ADR-0002](../../docs/adr/ADR-0002-gerenciar-contexto-com-orcamento-fixo-e-retrieval-reordenado.md) | Orçamento fixo de contexto (~10K entrada, teto 16K) com reranking e reordenação | Define a anatomia e limites do contexto que esta spec estrutura |

**Princípios da constituição aplicáveis**: I (fundamentação com citação), II (não alucinar), III (enforcement determinístico), V (orçamento gerenciado), VI (rastreabilidade ADR-first), VII (testabilidade de saídas de IA).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Governança de prompts versionados (Priority: P1)

O Tech Lead precisa garantir que as instruções do assistente (system prompt, guardrails, templates de resposta) sejam tratadas como código: versionadas em repositório, nomeadas por convenção, revisadas antes de entrar em produção e com controle de acesso claro sobre quem pode alterá-las.

**Why this priority**: Sem governança, qualquer alteração ad-hoc no prompt pode quebrar guardrails críticos (ex.: remover a instrução de citar fonte) sem rastro, impactando todos os 45 atendentes simultaneamente. É a fundação sobre a qual os demais cenários operam.

**Independent Test**: Pode ser validado verificando que o repositório contém os artefatos de prompt na estrutura definida, com histórico de alterações e que o fluxo de revisão está documentado e aplicável.

**Acceptance Scenarios**:

1. **Given** um novo prompt-base do assistente criado no repositório, **When** um desenvolvedor submete uma alteração ao prompt, **Then** a alteração passa por revisão (pull request ou equivalente) antes de ser promovida ao ambiente de produção.
2. **Given** a estrutura de diretórios do repositório, **When** qualquer membro da equipe precisa localizar o system prompt vigente, **Then** ele encontra o artefato na localização padronizada, com nome que identifica versão e data.
3. **Given** os papéis definidos no projeto (Tech Lead, Product Specialist, Desenvolvedor), **When** o Product Specialist tenta alterar um guardrail de comportamento, **Then** a alteração é submetida ao processo de revisão com aprovação obrigatória do Tech Lead.
4. **Given** um prompt em produção, **When** se consulta o histórico de versões, **Then** é possível identificar quem alterou, quando e qual era a versão anterior (rollback possível).

---

### User Story 2 — Anatomia de contexto de uma query (Priority: P1)

O arquiteto precisa documentar, para cada consulta ao assistente, quais partes compõem o contexto enviado ao modelo, classificando-as como estáticas ou dinâmicas, estimando o consumo em tokens de cada parte e definindo o orçamento total — de forma coerente com o ADR-0002.

**Why this priority**: Sem a anatomia explícita, não há como garantir que o teto de 16K tokens seja respeitado nem como diagnosticar problemas de context rot, lost in the middle ou overflow. É pré-requisito para o harness de teste (P2).

**Independent Test**: Pode ser validado verificando que existe documentação da anatomia de contexto com estimativas de tokens por seção, que a soma respeita o orçamento do ADR-0002 e que identifica riscos (context rot, lost in the middle, overflow).

**Acceptance Scenarios**:

1. **Given** a anatomia de contexto documentada, **When** se somam os orçamentos de cada parte (system prompt ~2K + chunks ~3–6K + histórico ≤2K + pergunta ~0,2K), **Then** o total respeita o teto rígido de 16K tokens definido no ADR-0002.
2. **Given** cada parte do contexto classificada como estática ou dinâmica, **When** se avalia o system prompt e guardrails, **Then** estão marcados como estáticos (nunca truncados) e com orçamento fixo de ~2K tokens.
3. **Given** a documentação da anatomia, **When** se verifica a ordem de posicionamento, **Then** segue a reordenação "V" anti-lost-in-the-middle (system/guardrails no início, pergunta no fim, chunks de maior score nas extremidades).
4. **Given** o risco de context overflow, **When** a soma dos componentes ultrapassa 16K, **Then** a anatomia define a ordem de descarte: primeiro histórico mais antigo, depois chunks de menor score — system/guardrails e pergunta nunca são descartados.

---

### User Story 3 — Harness de teste automatizado de prompts (Priority: P2)

O desenvolvedor precisa de um mecanismo automatizado que, dado um prompt e um conjunto de pares pergunta→resposta esperada (baseado nos chunks de referência do Anexo B), envie cada pergunta ao LLM e avalie a qualidade da resposta por critérios graduados (não binários), conforme o Princípio VII da constituição.

**Why this priority**: O harness é a rede de segurança que permite evoluir prompts com confiança. Sem ele, alterações são validadas manualmente (lento, inconsistente). Depende da anatomia de contexto (P1) estar definida.

**Independent Test**: Pode ser validado executando o harness contra o conjunto de teste do Anexo B e verificando que produz um relatório com taxas de aderência por critério.

**Acceptance Scenarios**:

1. **Given** o harness configurado com o prompt-base e o conjunto de teste do Anexo B, **When** o harness é executado, **Then** cada resposta é avaliada nos critérios: (a) contém citação de fonte, (b) não contém termos proibidos, (c) não inventa tier/valor inexistente (ex.: "Platinum").
2. **Given** uma execução completa do harness, **When** se consulta o relatório de saída, **Then** os resultados são expressos como graus de qualidade (taxa de aderência por critério, não pass/fail binário por caso individual).
3. **Given** duas versões de um mesmo prompt (antes e depois de uma alteração), **When** ambas são executadas no harness com o mesmo conjunto de teste, **Then** é possível comparar as taxas de aderência para decidir se a alteração melhora ou degrada a qualidade.
4. **Given** o harness executado com dados do Anexo B que inclui o documento SLA-2024, **When** uma pergunta menciona o tier "Platinum" (inexistente), **Then** a resposta do assistente que incorretamente menciona "Platinum" é pontuada negativamente no critério de não-alucinação.

---

### User Story 4 — Split de enforcement: prompt (probabilístico) vs código (determinístico) (Priority: P2)

O arquiteto precisa definir, para cada guardrail do assistente, se ele é enforçado apenas no prompt (probabilístico — o modelo tende a seguir mas pode violar) ou se exige validação por código fora do modelo (determinístico — garantido antes de exibir a resposta ao atendente), conectando ao Princípio III da constituição.

**Why this priority**: Guardrails apenas probabilísticos criam falsa sensação de segurança. Definir o split é o que torna o sistema confiável para 45 atendentes em produção. Depende dos guardrails estarem documentados (P1).

**Independent Test**: Pode ser validado verificando que existe uma tabela de classificação de guardrails (probabilístico vs determinístico) e que guardrails classificados como determinísticos possuem descrição do mecanismo de validação por código.

**Acceptance Scenarios**:

1. **Given** a lista de guardrails do assistente (citar fonte, não inventar valores, escalar quando não souber, responder em português formal), **When** se consulta a classificação, **Then** cada guardrail está marcado como "enforcement probabilístico (prompt)" ou "enforcement determinístico (código)" ou ambos.
2. **Given** o guardrail "sempre citar fonte" classificado como determinístico, **When** o assistente gera uma resposta sem citação de fonte, **Then** um filtro de código bloqueia essa resposta antes de exibi-la ao atendente.
3. **Given** o guardrail "não inventar tier/valor inexistente" classificado como determinístico, **When** o assistente menciona um tier não presente na base (ex.: "Platinum"), **Then** um filtro de código detecta e bloqueia a resposta.
4. **Given** o guardrail "responder em português formal" classificado como probabilístico, **When** o assistente eventualmente usa linguagem informal, **Then** não há bloqueio de código — o guardrail é enforçado apenas pela instrução no prompt e monitorado pelo harness de teste.

---

### Edge Cases

- O que acontece quando o prompt-base é alterado e o harness não é executado antes da promoção a produção? → O fluxo de governança deve exigir execução do harness como gate de qualidade.
- Como o sistema se comporta quando a soma dos tokens ultrapassa 16K? → Descarte determinístico conforme ordem de prioridade (nunca trunca system/guardrails nem pergunta).
- O que acontece quando o filtro determinístico bloqueia uma resposta? → O sistema deve informar ao atendente que não encontrou resposta fundamentada e sugerir escalar ao supervisor.
- Como lidar com um prompt versionado que funciona no harness mas degrada em produção (drift do modelo)? → Monitoramento contínuo + execução periódica do harness + fixação de versão do modelo (ADR-0001).

## Requirements *(mandatory)*

### Functional Requirements

**Governança de prompts:**

- **FR-001**: O system prompt, guardrails e templates de resposta DEVEM residir em repositório versionado, em localização padronizada e com convenção de nomes que identifique versão e propósito.
- **FR-002**: Toda alteração em artefatos de prompt DEVE passar por processo de revisão com ao menos uma aprovação antes de ser promovida a produção.
- **FR-003**: O histórico de versões dos prompts DEVE permitir identificar autor, data, conteúdo anterior e possibilitar rollback.
- **FR-004**: Os papéis com permissão para alterar prompts DEVEM estar definidos (quem pode propor, quem aprova).

**Anatomia de contexto:**

- **FR-005**: A anatomia de contexto DEVE documentar cada parte que compõe o prompt enviado ao modelo, classificada como estática ou dinâmica.
- **FR-006**: Cada parte DEVE ter um orçamento estimado em tokens, e a soma total DEVE respeitar o teto rígido de 16K tokens (ADR-0002).
- **FR-007**: A anatomia DEVE definir a ordem de posicionamento das partes seguindo a reordenação "V" anti-lost-in-the-middle.
- **FR-008**: A anatomia DEVE especificar a regra de descarte quando o total excede o teto: primeiro histórico mais antigo, depois chunks de menor score; system/guardrails e pergunta nunca descartados.

**Harness de teste:**

- **FR-009**: O harness DEVE aceitar como entrada um prompt e um conjunto de pares pergunta→resposta esperada (conjunto de teste baseado no Anexo B).
- **FR-010**: O harness DEVE enviar cada pergunta ao LLM com o prompt e os chunks de referência correspondentes e coletar a resposta.
- **FR-011**: O harness DEVE avaliar cada resposta contra critérios definidos: (a) presença de citação de fonte, (b) ausência de termos proibidos, (c) ausência de informação inventada (ex.: tier "Platinum").
- **FR-012**: Os resultados DEVEM ser expressos como graus de qualidade (taxas de aderência por critério), não como pass/fail binário por caso individual (Princípio VII).
- **FR-013**: O harness DEVE permitir comparar resultados entre versões de prompts (relatório comparativo).

**Split de enforcement:**

- **FR-014**: Cada guardrail DEVE estar classificado quanto ao tipo de enforcement: probabilístico (prompt), determinístico (código) ou ambos.
- **FR-015**: Guardrails classificados como determinísticos DEVEM possuir um mecanismo de validação por código que bloqueia respostas não conformes antes de exibi-las ao atendente.
- **FR-016**: 100% das respostas sem citação de fonte DEVEM ser bloqueadas pelo filtro determinístico antes da exibição.
- **FR-017**: 100% das respostas que mencionam tier/valor inexistente na base (ex.: "Platinum") DEVEM ser bloqueadas pelo filtro determinístico.
- **FR-018**: Quando o filtro bloqueia uma resposta, o sistema DEVE informar ao atendente que não encontrou resposta fundamentada e sugerir escalar ao supervisor.

### Key Entities

- **Artefato de prompt**: Arquivo versionado contendo instruções ao modelo (system prompt, guardrails, templates). Possui versão, autor, data, status (rascunho/revisão/produção).
- **Anatomia de contexto**: Especificação das partes que compõem cada chamada ao modelo, com tipo (estático/dinâmico), orçamento em tokens, posição e regra de descarte.
- **Conjunto de teste**: Coleção de pares pergunta→resposta esperada derivados do Anexo B, usados para avaliação automatizada de qualidade.
- **Critério de avaliação**: Dimensão de qualidade medida pelo harness (citação, não-alucinação, aderência a termos). Cada critério produz uma taxa de aderência.
- **Guardrail**: Regra de comportamento do assistente, classificada por tipo de enforcement (probabilístico/determinístico) e associada a um mecanismo de validação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das respostas sem citação de fonte são bloqueadas pelo filtro determinístico antes de chegar ao atendente.
- **SC-002**: 100% das respostas que mencionam tier/valor inexistente na base (ex.: "Platinum") são bloqueadas pelo filtro determinístico.
- **SC-003**: O harness executa o conjunto de teste completo (baseado no Anexo B) e reporta taxa de aderência por critério em cada execução.
- **SC-004**: Toda alteração de prompt em produção possui registro de revisão rastreável (autor, aprovador, data, versão anterior).
- **SC-005**: A anatomia de contexto documentada, quando aplicada, mantém 100% das consultas dentro do teto de 16K tokens sem truncar system/guardrails ou a pergunta.
- **SC-006**: O harness permite comparar duas versões de prompt e identificar variação de qualidade (melhora/degradação) por critério.
- **SC-007**: A taxa de aderência ao guardrail "citar fonte" no harness é ≥ 95% com o prompt-base otimizado (enforcement probabilístico antes do filtro determinístico).

## Assumptions

- O Anexo B com chunks de referência e mapa de cobertura está disponível e pode ser usado como gabarito para o conjunto de teste do harness.
- A equipe utiliza um sistema de controle de versão (Git) e um processo de revisão por pull request ou equivalente.
- O modelo em produção é o GPT-4o via Azure OpenAI com versão fixada (ADR-0001), o que garante reprodutibilidade entre execuções do harness no curto prazo.
- O prompt-base atual ("Você é o assistente de atendimento da NovaTech...") será o ponto de partida para evolução dentro do framework de governança.
- Os guardrails do Product Specialist (citar fonte, não inventar, escalar, português formal) são os guardrails a classificar no split de enforcement.
- O orçamento por parte do contexto segue os valores do ADR-0002: system ~2K, chunks ~3–6K, histórico ≤2K, pergunta ~0,2K, teto 16K.
