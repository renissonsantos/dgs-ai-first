# Contexto do Cenário 1 — Assistente de IA com RAG da NovaTech

> Contexto **específico do Cenário 1**. Cenários futuros terão seus próprios arquivos de
> contexto (`context/cenario-N-*.md`) e/ou contexto descrito na spec.

Fonte de verdade do domínio para ADRs e specs. Toda decisão arquitetural deve se ancorar nos
números e restrições abaixo. Não inventar dados; se faltar, marcar `[NECESSITA ESCLARECIMENTO]`.

## O problema

NovaTech: empresa de logística de médio porte, 1.200 funcionários. Documentação interna espalhada
em três fontes, atualizada por áreas diferentes sem processo unificado de revisão. A equipe de
atendimento (45 pessoas) gasta ~12 min por chamado buscando informação, gerando atrasos e respostas
inconsistentes. A DB1 foi contratada para construir um assistente de IA que responda perguntas em
linguagem natural, fundamentado na documentação oficial, **com citação de fonte**, integrado ao
ambiente Microsoft (Teams + SharePoint).

## Números do projeto (usar nos ADRs)

| Dado | Valor |
|------|-------|
| Chamados/dia | 320 |
| % de chamados com consulta a documentação | ~60% (≈192/dia) |
| Tempo de busca atual → meta | 12 min → < 2 min por chamado |
| Atendentes | 45 |
| Documentos SharePoint | ~800 (PDF, DOCX), atualização mensal — Operações, Compliance |
| Páginas Confluence | ~400 (HTML/Wiki), atualização semanal — TI, Comercial |
| Planilhas pasta de rede | ~50 (XLSX), atualização mensal — Comercial |
| Total de fontes | ~1.250 |
| Tamanho estimado da base | ~12M tokens |
| Documentos escaneados (precisam OCR) | ~15% da base |
| Documentos contraditórios identificados | ao menos 3 procedimentos |
| Janela de contexto (GPT-4o) | 128K tokens |
| System prompt + instruções | ~2K tokens |
| Orçamento de projeto | 3 meses (discovery + dev + go-live) |
| Licenças existentes | Microsoft 365 E3; disposição para provisionar Azure AI Services |

## Restrições e fatos relevantes

- Documentação atualizada mensalmente por 3 áreas (Operações, Compliance, Comercial), sem revisão unificada.
- Alguns documentos se contradizem entre versões; hoje a equipe resolve "perguntando para quem sabe".
- PDFs com tabelas complexas (frete, 15+ colunas), fluxogramas como imagens, e docs escaneados (OCR).
- Confluence tem links internos entre páginas e macros customizadas. Planilhas com fórmulas interdependentes.
- Integração-alvo: Teams (bot, com múltiplas perguntas na mesma sessão) + SharePoint.

## Inputs simulados fornecidos ao Tech Lead

### Análise técnica do desenvolvedor (simulada)
> Base estimada em ~12M tokens. PDFs com tabelas complexas são o maior desafio para extração.
> Documentos escaneados (~15% da base) precisarão de OCR. Documentos contraditórios foram
> identificados em ao menos 3 procedimentos. Recomendação de chunking por seção com overlap de 10%.

### Requisitos do Product Specialist (simulados)
> Respostas devem citar fonte. Documentos contraditórios devem mostrar ambas as versões com
> indicação de data. Atualização máxima de 24h após publicação de novo documento. O assistente
> nunca deve inventar informações.

## Guardrails de comportamento do assistente

1. Sempre citar a fonte do documento.
2. Nunca inventar prazos ou valores que não estejam na documentação.
3. Quando não encontrar resposta, dizer explicitamente e sugerir escalar ao supervisor.
4. Responder em português formal mas acessível.

## Documentos-chave da NovaTech (em "Arquivos Gerais")

| Doc | Conteúdo | Armadilha |
|-----|----------|-----------|
| POL-001 | Política de devolução (7 dias úteis) | **Exceção**: carga perigosa (classes 1–6 ANTT) NÃO pode ser devolvida |
| PROC-042 | Cálculo de frete especial (>500kg), multiplicadores por região | Conflita com a v2 |
| PROC-042-v2 | Mesma numeração, multiplicadores diferentes | **Sem indicação de qual é vigente** |
| SLA-2024 | SLA por tier: Gold, Silver, Standard | Tier "Platinum" NÃO existe (teste de alucinação) |
| FAQ-Atendimento | 47 perguntas informais, sem validação formal | Práticas não-oficiais |

Os Anexos A (documentação completa) e B (chunks de referência + mapa de cobertura) estão na pasta
"Arquivos Gerais" e servem de gabarito para testes de retrieval e avaliação de respostas.

## Metas mensuráveis (candidatas a Success Criteria das specs)

- Reduzir tempo médio de busca de 12 → < 2 min/chamado.
- % de respostas com citação de fonte verificável.
- % de respostas factualmente corretas vs gabarito (Anexo A/B).
- Latência de atualização ≤ 24h após publicação de novo documento.
