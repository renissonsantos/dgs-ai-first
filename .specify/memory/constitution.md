# dgs-ai-first — Constitution

Princípios de engenharia AI-First que valem para **todos os cenários** deste repositório. Toda
spec, plano e ADR deve estar em conformidade. Em conflito, esta constituição prevalece. O
contexto e as restrições específicas de cada cenário vêm dos arquivos em `context/` e/ou da spec
— não desta constituição. Definições de conceitos: `context/glossario-ia.md`.

## Core Principles

### I. Fundamentação com citação (grounding)
Quando uma solução de IA responde com base em uma base documental, a resposta DEVE ser
fundamentada nessa base e citar a fonte. Resposta sem fonte verificável é tratada como falha,
não como resultado parcial.

### II. Não alucinar é requisito, não aspiração
A solução NUNCA inventa dados que não existam na base. Quando não há resposta, ela diz
explicitamente que não encontrou — nunca preenche lacunas com conhecimento geral não fundamentado.

### III. Guardrails críticos têm enforcement determinístico
Guardrails essenciais NÃO dependem apenas da obediência probabilística do prompt. São validados
por código fora do modelo (Harness), que pode rejeitar uma saída antes de entregá-la.

### IV. RAG/contexto é, antes de tudo, um problema de dados
A qualidade depende de curadoria, versionamento e estratégia de chunking/retrieval — não só do
modelo. Conflitos e obsolescência de dados são tratados no pipeline com mecanismos concretos,
não com "atenção" do modelo.

### V. Orçamento de contexto é gerenciado, não maximizado
A janela de contexto é recurso limitado. Decisões consideram orçamento de atenção, context rot,
lost in the middle e overflow. Mais contexto não é melhor; o contexto certo, na ordem certa, é.

### VI. Decisões são rastreáveis (ADR-first)
Decisões arquiteturais são registradas como ADRs (`docs/adr/`) antes de virarem spec. Cada ADR é
fundamentado em trade-offs explícitos e nos números reais do cenário, e passou por devil's advocate.

### VII. Testabilidade de saídas de IA
Saídas de IA são não-determinísticas e avaliadas por graus de qualidade, não pass/fail binário.
Todo requisito relevante define como será verificado.

## Workflow & Quality Gates

- Contexto do cenário → ADR aceito → `/speckit.specify` → plan → tasks → implement.
- Toda spec referencia o(s) ADR(s) que a originaram e os princípios aplicáveis.
- Specs sem critérios de sucesso mensuráveis não passam do gate de revisão.

## Governance

Esta constituição supera outras práticas. Emendas exigem registro (novo ADR ou nota de versão) e
justificativa. Revisões de spec/plano verificam conformidade com os princípios acima.

**Version**: 1.0.0 | **Ratified**: 2026-06-01 | **Last Amended**: 2026-06-01
