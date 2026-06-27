# Saída de execução — MCP Health Check (Tech Lead Ex. 2.2)

Script: [`scripts/mcp-health-check.mjs`](../../scripts/mcp-health-check.mjs) · gerado com agente
de código · executado de verdade contra os servers locais do `.mcp/mcp.json`.

## Execução

```text
$ node scripts/mcp-health-check.mjs
MCP health check — 4 servers em C:\Pessoal\IA First\novatech-assistant\.mcp\mcp.json

  [scope] filesystem-code: ./src, ./specs, ./skills, ./prompts, ./docs/adr -> ok
  [probe] filesystem-code ... PASS (6647ms, 14 tools)
  [scope] filesystem-docs: ./docs/novatech, ./data/retrieval-corpus -> ok
  [probe] filesystem-docs ... PASS (6217ms, 14 tools)
  [probe] git ... PASS (6301ms, 12 tools)
  [probe] memory ... PASS (6137ms, 9 tools)

=== Resumo ===
✓ filesystem-code  14 tools  6647ms  [read_file, read_text_file, read_media_file, read_multiple_files]
✓ filesystem-docs  14 tools  6217ms  [read_file, read_text_file, read_media_file, read_multiple_files]
✓ git              12 tools  6301ms  [git_status, git_diff_unstaged, git_diff_staged, git_diff]
✓ memory            9 tools  6137ms  [create_entities, create_relations, add_observations, delete_entities]

4/4 servers OK
EXIT=0
```

O que o script comprova, por server:
- **Sobe o processo** (`npx`/`uvx`) e completa o handshake MCP (`initialize` →
  `notifications/initialized` → `tools/list`).
- **Lista as tools expostas** (contagem + amostra). Ex.: `git` expõe `git_status`, `git_diff*`;
  `memory` expõe `create_entities`, `create_relations`.
- **Valida o escopo no disco** para os filesystem (as pastas configuradas existem). Se uma
  pasta sumisse, o `[scope]` reportaria `FALTANDO ...`.

> Primeira execução leva ~12–20s/server (download dos pacotes via npx/uvx). Execuções
> seguintes caem para ~6s/server (cache). A saída acima é a 2ª execução (cache quente).

## Verificação do least privilege: fontes de negócio são read-only

As pastas de leitura (`docs/novatech`, `data/retrieval-corpus`) têm o atributo read-only
imposto no SO. Demonstração real:

```text
$ # aplica read-only: Get-ChildItem -Recurse -File docs\novatech,data\retrieval-corpus | % { $_.IsReadOnly = $true }
IsReadOnly: True

$ node -e "fs.appendFileSync('docs/novatech/SLA-2024-tabela-sla-clientes.md','x')"
ESCRITA BLOQUEADA: EPERM        # agente NÃO consegue escrever na fonte de negócio

$ node -e "fs.readFileSync('docs/novatech/SLA-2024-tabela-sla-clientes.md')"
LEITURA OK, bytes= 2762         # leitura continua funcionando
```

Resultado: o `filesystem-docs` é read-only **de fato** (escrita → `EPERM`), não apenas por
convenção. O reference server `server-filesystem` não tem flag RO nativa; a garantia vem do
SO, com escopo mínimo (instância separada, só as duas pastas de fonte).
