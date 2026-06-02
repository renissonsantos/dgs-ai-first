# Quickstart: Prompt & Context Engineering

**Date**: 2026-06-01 | **Plan**: [plan.md](plan.md)

## Pré-requisitos

- Python 3.11+
- Conta Azure com Azure OpenAI provisionado (deployment GPT-4o com versão fixada)
- Azure AI Search (Basic tier para PoC)
- Repositório Git clonado na branch `001-prompt-context-engineering`

## Setup do ambiente

```bash
# Criar virtualenv
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\Activate.ps1  # Windows PowerShell

# Instalar dependências
pip install -r requirements.txt
```

## Variáveis de ambiente

```bash
export AZURE_OPENAI_ENDPOINT="https://<resource>.openai.azure.com/"
export AZURE_OPENAI_API_KEY="<key>"
export AZURE_OPENAI_DEPLOYMENT="gpt-4o-2024-05-13"
export AZURE_SEARCH_ENDPOINT="https://<resource>.search.windows.net"
export AZURE_SEARCH_KEY="<key>"
export AZURE_SEARCH_INDEX="novatech-docs"
```

## Estrutura de prompts

```
prompts/
├── system/base-v001.prompt.md      # Prompt-base do assistente
├── guardrails/citacao-obrigatoria.md
├── guardrails/nao-inventar.md
├── guardrails/escalar-supervisor.md
├── guardrails/portugues-formal.md
└── README.md                       # Convenções e processo de revisão
```

Para alterar um prompt:
1. Criar nova versão: `base-v002.prompt.md`
2. Executar o harness localmente (ver abaixo)
3. Abrir PR com a nova versão
4. Tech Lead revisa e aprova
5. Promover a produção (atualizar status no README)

## Executar o harness de teste

```bash
# Executar com o prompt atual contra o conjunto de teste
python -m src.harness.runner --prompt base-v001 --test-cases tests/fixtures/test_cases.json

# Comparar duas versões
python -m src.harness.comparator --prompt-a base-v001 --prompt-b base-v002 --test-cases tests/fixtures/test_cases.json
```

O relatório mostra taxas de aderência por critério:
- `citation`: % de respostas com citação de fonte
- `no_hallucination`: % de respostas sem tier/valor inventado
- `no_forbidden_terms`: % de respostas sem termos proibidos

## Executar testes unitários

```bash
pytest tests/unit/ -v
pytest tests/integration/ -v  # requer variáveis Azure configuradas
```

## Fluxo típico de desenvolvimento

1. Editar prompt em `prompts/` (nova versão)
2. Rodar harness → verificar que aderência não degradou
3. Rodar pytest → garantir que filtros determinísticos funcionam
4. Abrir PR → revisão do Tech Lead
5. Merge → prompt promovido a produção

## Anatomia de uma consulta (referência rápida)

```
[System prompt + guardrails]  ~2K tok  | INÍCIO (primazia)
[Chunks V-ordered]            ~3-6K tok | MEIO (V: maior score nas bordas)
[Histórico sessão]            ≤2K tok  | MEIO
[Pergunta]                    ~0.2K tok | FIM (recência)
────────────────────────────────────────
TETO RÍGIDO: 16K tokens
Reserva resposta: ~1K tokens
```

Se overflow: descartar histórico antigo → chunks de menor score. System/guardrails e pergunta **nunca** descartados.

## Resultados iniciais do harness (base-v001)

> **Nota**: A execução end-to-end do harness requer credenciais Azure configuradas. Os testes
> unitários e de integração (49 testes) rodam sem dependências externas e validam toda a lógica
> de enforcement, orçamento e avaliação.

**Status dos testes locais** (sem chamada ao LLM):

| Módulo | Testes | Resultado |
|--------|--------|-----------|
| token_budget | 10 | ✅ PASS |
| reorderer | 6 | ✅ PASS |
| context_builder | 6 | ✅ PASS |
| citation_filter | 7 | ✅ PASS |
| hallucination_filter | 7 | ✅ PASS |
| harness (evaluator + reporter + comparator) | 13 | ✅ PASS |
| **Total** | **49** | **✅ ALL PASS** |

**Taxas de aderência end-to-end**: Pendente configuração de credenciais Azure. Para executar:

```bash
python -m src.harness.runner --prompt base-v001 --test-cases tests/fixtures/test_cases.json --chunks tests/fixtures/sample_chunks.json
```
