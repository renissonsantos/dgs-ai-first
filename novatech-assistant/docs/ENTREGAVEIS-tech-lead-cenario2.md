# Entregáveis — Tech Lead, Cenário 2 (Estruturação do Trabalho)

Repositório de trabalho da Fase 2 (starter Anexo D). Decisões rastreiam as ADRs do Cenário 1
(`../../dgs-ai-first/docs/adr/`).

## 2.1 — Construção e teste do AGENTS.md
| Entregável | Caminho |
|-----------|---------|
| AGENTS.md final (v2) | [`AGENTS.md`](../AGENTS.md) |
| Snapshot v1 / v2 | [`docs/agents-md/AGENTS-v1.md`](agents-md/AGENTS-v1.md) · [`AGENTS-v2.md`](agents-md/AGENTS-v2.md) |
| Relatório do teste + iteração | [`docs/agents-md/teste-agente.md`](agents-md/teste-agente.md) |
| Output round 1 (sob v1) | [`docs/agents-md/round1/`](agents-md/round1/) |
| Output round 2 (sob v2) | `src/shared/*`, `src/services/*`, `src/functions/query/*`, `tests/integration/query.test.ts` |

## 2.2 — Arquitetura de MCP
| Entregável | Caminho |
|-----------|---------|
| Config dos servers (least privilege) | [`.mcp/mcp.json`](../.mcp/mcp.json) |
| Documento de arquitetura | [`docs/mcp/arquitetura-mcp.md`](mcp/arquitetura-mcp.md) |
| Health check (script) | [`scripts/mcp-health-check.mjs`](../scripts/mcp-health-check.mjs) |
| Saída de execução real (4/4 OK) | [`docs/mcp/health-check-output.md`](mcp/health-check-output.md) |

## 2.3 — Skill técnica `azure-functions-endpoint`
| Entregável | Caminho |
|-----------|---------|
| SKILL.md final (v2) | [`skills/domain/azure-functions-endpoint.md`](../skills/domain/azure-functions-endpoint.md) |
| Snapshot v1 | [`docs/skills/azure-functions-endpoint-v1.md`](skills/azure-functions-endpoint-v1.md) |
| Relatório do teste + iteração + maturidade | [`docs/skills/teste-azure-functions-endpoint.md`](skills/teste-azure-functions-endpoint.md) |
| Output round 1 (sob v1) | [`docs/skills/round1/`](skills/round1/) |
| Output round 2 (sob v2) | `src/services/feedback-store.ts`, `src/functions/feedback/*`, `tests/integration/feedback.test.ts` |

## Como reproduzir a validação
```bash
npm install
npx vitest run                  # 6 passed (query 4 + feedback 2)
npx tsc -p . --noEmit           # EXIT 0
node scripts/mcp-health-check.mjs   # 4/4 servers OK
```

## PR (revisão simulada)
[`docs/pull-requests/PR-0001.md`](pull-requests/PR-0001.md)
