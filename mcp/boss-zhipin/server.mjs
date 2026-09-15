#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { createChromeBridgeClient } from "./bridge-client.mjs";
import { createBossZhipinService } from "./boss-zhipin.mjs";

const tools = [
  { name: "open_recruiter", description: "Open a managed BOSS Zhipin recruiter tab. Stops when login or verification is required.", inputSchema: { type: "object", properties: { sessionName: { type: "string", minLength: 1, maxLength: 80 } }, additionalProperties: false } },
  { name: "check_status", description: "Check whether a managed recruiter tab is logged in and ready.", inputSchema: { type: "object", properties: { tabId: { type: "integer", minimum: 1 } }, required: ["tabId"], additionalProperties: false } },
  { name: "search_candidates", description: "Search visible candidate cards locally. Does not contact candidates and redacts explicit age and gender values.", inputSchema: { type: "object", properties: { tabId: { type: "integer", minimum: 1 }, keyword: { type: "string", minLength: 1, maxLength: 120 }, limit: { type: "integer", minimum: 1, maximum: 50, default: 20 } }, required: ["tabId", "keyword"], additionalProperties: false } },
  { name: "open_candidate", description: "Open a candidate detail view for review without sending a greeting or message.", inputSchema: { type: "object", properties: { tabId: { type: "integer", minimum: 1 }, index: { type: "integer", minimum: 0 } }, required: ["tabId", "index"], additionalProperties: false } },
];

export function createMcpHandler(service) {
  return async function handle(message) {
    if (!message || message.jsonrpc !== "2.0" || !message.method || message.method.startsWith("notifications/")) return undefined;
    if (message.method === "initialize") return response(message.id, { protocolVersion: "2025-03-26", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "nexts-boss-zhipin", version: "0.1.0" } });
    if (message.method === "ping") return response(message.id, {});
    if (message.method === "tools/list") return response(message.id, { tools });
    if (message.method !== "tools/call") return failure(message.id, -32601, "Method not found");

    const handlers = {
      open_recruiter: service.openRecruiter,
      check_status: service.checkStatus,
      search_candidates: service.searchCandidates,
      open_candidate: service.openCandidate,
    };
    const handler = handlers[message.params?.name];
    if (!handler) return failure(message.id, -32601, "Unknown tool");
    try {
      const output = await handler(message.params?.arguments ?? {});
      return response(message.id, { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output });
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
