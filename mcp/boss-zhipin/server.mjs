#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { createChromeBridgeClient } from "./bridge-client.mjs";
import { createBossZhipinService } from "./boss-zhipin.mjs";
import { tools } from "./tools.mjs";

export function createMcpHandler(service) {
  return async function handle(message) {
    if (!message || message.jsonrpc !== "2.0" || !message.method || message.method.startsWith("notifications/")) return undefined;
    if (message.method === "initialize") return response(message.id, { protocolVersion: "2025-03-26", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "nexts-boss-zhipin", version: "0.2.1" } });
    if (message.method === "ping") return response(message.id, {});
    if (message.method === "tools/list") return response(message.id, { tools: tools.map(({ handler: _handler, ...tool }) => tool) });
    if (message.method !== "tools/call") return failure(message.id, -32601, "Method not found");

    const definition = tools.find((tool) => tool.name === message.params?.name);
    const handler = definition ? service[definition.handler] : undefined;
    if (typeof handler !== "function") return failure(message.id, -32601, "Unknown tool");
    try {
      const output = await handler(message.params?.arguments ?? {});
      const result = { content: [{ type: "text", text: typeof output === "string" ? output : JSON.stringify(output) }] };
      if (output && typeof output === "object" && !Array.isArray(output)) result.structuredContent = output;
      return response(message.id, result);
    } catch (error) {
      return response(message.id, { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }] });
    }
  };
}

function response(id, result) { return { jsonrpc: "2.0", id, result }; }
function failure(id, code, message) { return { jsonrpc: "2.0", id, error: { code, message } }; }

export function runStdio() {
  const handle = createMcpHandler(createBossZhipinService({ rpc: createChromeBridgeClient() }));
  let buffered = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffered += chunk;
    let newline;
    while ((newline = buffered.indexOf("\n")) >= 0) {
      const line = buffered.slice(0, newline).trim();
      buffered = buffered.slice(newline + 1);
      if (!line) continue;
      Promise.resolve().then(() => handle(JSON.parse(line))).then((value) => {
        if (value) process.stdout.write(`${JSON.stringify(value)}\n`);
      }).catch((error) => process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`));
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) runStdio();
