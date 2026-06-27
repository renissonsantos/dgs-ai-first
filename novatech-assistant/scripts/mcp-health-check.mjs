#!/usr/bin/env node
// MCP health check — Tech Lead Ex. 2.2.
// Reads .mcp/mcp.json, brings up each configured local server over stdio, runs the MCP
// handshake (initialize -> notifications/initialized -> tools/list) and reports status.
// For filesystem servers it also checks that the configured scope dirs exist on disk.
//
// Usage:  node scripts/mcp-health-check.mjs
// Exit code: 0 if all servers PASS, 1 otherwise.
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = join(ROOT, ".mcp", "mcp.json");
const PER_SERVER_TIMEOUT_MS = 60_000;
const PROTOCOL_VERSION = "2024-11-05";

function loadServers() {
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  return Object.entries(cfg.mcpServers ?? {});
}

// Scope dirs are the args that look like relative paths (start with ".").
function scopeDirs(args) {
  return args.filter((a) => a.startsWith("."));
}

function checkScopes(args) {
  const dirs = scopeDirs(args);
  const missing = dirs.filter((d) => !existsSync(resolve(ROOT, d)));
  return { dirs, missing };
}

/** Probe one server: spawn, handshake, list tools. Resolves a status object. */
function probe(name, def) {
  return new Promise((resolveProbe) => {
    const started = Date.now();
    const child = spawn(def.command, def.args, {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32", // npx/uvx are .cmd shims on Windows
    });

    let buffer = "";
    let tools = null;
    let initialized = false;
    let stderr = "";
    let settled = false;

    const finish = (status, detail) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { child.kill(); } catch { /* already gone */ }
      resolveProbe({
        name,
        command: `${def.command} ${def.args.join(" ")}`,
        status,
        detail,
        latencyMs: Date.now() - started,
        toolCount: tools ? tools.length : 0,
        sampleTools: tools ? tools.slice(0, 4).map((t) => t.name) : [],
      });
    };

    const timer = setTimeout(
      () => finish("FAIL", `timeout após ${PER_SERVER_TIMEOUT_MS / 1000}s`),
      PER_SERVER_TIMEOUT_MS,
    );

    const send = (msg) => child.stdin.write(JSON.stringify(msg) + "\n");

    child.on("error", (err) => finish("FAIL", `spawn falhou: ${err.message}`));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.stdout.on("data", (data) => {
      buffer += data.toString();
      let nl;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; } // ignore non-JSON log lines
        if (msg.id === 1 && !initialized) {
          initialized = true;
          send({ jsonrpc: "2.0", method: "notifications/initialized" });
          send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
        } else if (msg.id === 2) {
          tools = msg.result?.tools ?? [];
          finish("PASS", "handshake + tools/list ok");
        }
      }
    });

    // Kick off the handshake.
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "novatech-healthcheck", version: "1.0.0" },
      },
    });

    child.on("exit", (code) => {
      if (!settled) finish("FAIL", `processo saiu (code ${code}). stderr: ${stderr.slice(0, 200)}`);
    });
  });
}

async function main() {
  const servers = loadServers();
  console.log(`MCP health check — ${servers.length} servers em ${CONFIG_PATH}\n`);

  const results = [];
  for (const [name, def] of servers) {
    // Static scope check (filesystem servers).
    const isFs = def.args.some((a) => String(a).includes("server-filesystem"));
    if (isFs) {
      const { dirs, missing } = checkScopes(def.args);
      const tag = missing.length ? `FALTANDO ${missing.join(", ")}` : "ok";
      console.log(`  [scope] ${name}: ${dirs.join(", ")} -> ${tag}`);
    }
    process.stdout.write(`  [probe] ${name} ... `);
    const r = await probe(name, def);
    console.log(`${r.status} (${r.latencyMs}ms, ${r.toolCount} tools)`);
    results.push(r);
  }

  console.log("\n=== Resumo ===");
  for (const r of results) {
    console.log(
      `${r.status === "PASS" ? "✓" : "✗"} ${r.name.padEnd(16)} ${String(r.toolCount).padStart(2)} tools  ` +
      `${r.latencyMs}ms  [${r.sampleTools.join(", ")}]  ${r.status === "PASS" ? "" : "— " + r.detail}`,
    );
  }

  const failed = results.filter((r) => r.status !== "PASS");
  console.log(`\n${results.length - failed.length}/${results.length} servers OK`);
  process.exit(failed.length ? 1 : 0);
}

main();
