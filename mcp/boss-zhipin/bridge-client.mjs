import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const defaultEndpoint = "http://127.0.0.1:18765/rpc";
const bridgeTokenKey = "BROWSER_AGENT_BRIDGE_TOKEN";

export function createChromeBridgeClient(options = {}) {
  const endpoint = options.endpoint ?? defaultEndpoint;
  const fetcher = options.fetcher ?? globalThis.fetch;

  assertLocalBridgeUrl(endpoint);
  if (typeof fetcher !== "function") throw new Error("A fetch implementation is required");

  let requestId = 0;
  return async function rpc(method, params = {}) {
    const token = resolveChromeBridgeToken(options);
    const response = await fetcher(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: `boss-zhipin-${++requestId}`, method, params }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Chrome bridge HTTP ${response.status}`);
    if (payload.error) throw new Error(payload.error.message ?? "Chrome bridge request failed");
    return payload.result ?? payload;
  };
}

export function resolveChromeBridgeToken(options = {}) {
  const configured = options.token ?? process.env.NEXTS_CREDENTIAL_BRIDGETOKEN ?? process.env[bridgeTokenKey];
  if (typeof configured === "string" && configured.trim()) return configured.trim();

  const envPath = options.bridgeEnvPath ?? join(homedir(), ".browser-agent-bridge.env");
  try {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*BROWSER_AGENT_BRIDGE_TOKEN\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      const token = match[1].replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2").trim();
      if (token) return token;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return undefined;
}

function assertLocalBridgeUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
    throw new Error("Chrome bridge endpoint must be local HTTP");
  }
}
