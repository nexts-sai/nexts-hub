const defaultEndpoint = "http://127.0.0.1:18765/rpc";

export function createChromeBridgeClient(options = {}) {
  const endpoint = options.endpoint ?? defaultEndpoint;
  const fetcher = options.fetcher ?? globalThis.fetch;
  const token = options.token ?? process.env.NEXTS_CREDENTIAL_BRIDGETOKEN ?? process.env.BROWSER_AGENT_BRIDGE_TOKEN;

  assertLocalBridgeUrl(endpoint);
  if (typeof fetcher !== "function") throw new Error("A fetch implementation is required");

  let requestId = 0;
  return async function rpc(method, params = {}) {
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

function assertLocalBridgeUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
    throw new Error("Chrome bridge endpoint must be local HTTP");
  }
}
