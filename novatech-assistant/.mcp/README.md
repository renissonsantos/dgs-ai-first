# Configuração de MCP — escopos e permissões

O [`mcp.json`](mcp.json) fica em **JSON padrão** (sem chaves não-padrão, para não quebrar
clients com validação estrita de schema). A justificativa de cada server vive aqui.

Arquitetura completa: [`../docs/mcp/arquitetura-mcp.md`](../docs/mcp/arquitetura-mcp.md).
Validação: `node scripts/mcp-health-check.mjs` (saída em
[`../docs/mcp/health-check-output.md`](../docs/mcp/health-check-output.md)).

## Servers (todos locais e gratuitos)

| Server | Escopo | Permissão | Por que é o mínimo |
|--------|--------|-----------|--------------------|
| `filesystem-code` | `./src ./specs ./skills ./prompts ./docs/adr` | **rw** | exatamente o que o agente cria/edita; não vê `.env`, `.git`, `infra`, `node_modules` |
| `filesystem-docs` | `./docs/novatech ./data/retrieval-corpus` | **read-only** (SO) | fontes de negócio nunca são escritas; instância separada isola a permissão |
| `git` | repo local | **read** | histórico/diff/branches para revisão; escrita de arquivos é do `filesystem-code` |
| `memory` | grafo em memória | **rw** (sem FS) | decisões e linguagem ubíqua do projeto; sem acesso a disco |

Fora do config (least privilege): `everything` roda **ad-hoc** (só aprendizado das primitivas,
nunca commitado). `github` foi arquivado no upstream e exigiria token externo → repo tratado
localmente via `filesystem` + `git`.

## Enforcement do read-only nas fontes de negócio

O reference `server-filesystem` não tem flag read-only nativa. A garantia vem do **SO**, com
escopo mínimo. Aplicar (e reverter) o atributo:

**Windows (PowerShell)**
```powershell
# aplicar read-only
Get-ChildItem -Recurse -File docs\novatech, data\retrieval-corpus | % { $_.IsReadOnly = $true }
# reverter
Get-ChildItem -Recurse -File docs\novatech, data\retrieval-corpus | % { $_.IsReadOnly = $false }
```

**Linux / macOS**
```bash
# aplicar read-only (remove write para todos)
chmod -R a-w docs/novatech data/retrieval-corpus
# reverter (devolve write ao dono)
chmod -R u+w docs/novatech data/retrieval-corpus
```

Verificação: uma escrita do agente nessas pastas deve falhar (`EPERM`/`EACCES`) e a leitura
continuar funcionando.

## Adicionar/alterar um server
Mudança de infraestrutura → PR local com revisão do Tech Lead (checklist em
[`../docs/mcp/arquitetura-mcp.md`](../docs/mcp/arquitetura-mcp.md) § 2) e health check verde.
