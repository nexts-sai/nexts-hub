# ChatCut for Nexts

Install this package through Nexts Hub and enable its skills. Requires Node.js 20+ and npm on PATH.

The bundled MCP bridge uses npx -y mcp-remote@0.15.2 and opens browser OAuth on first connection. Sign in separately to ChatCut. No API key or Codex token is bundled. If an old direct HTTP chatcut entry exists, select this plugin's separately namespaced MCP contribution; the old entry is not automatically migrated. Disable the unused duplicate if desired. Authentication can outlast the first initialization timeout; reconnect once after completing login. Tokens remain in the bridge user-local cache, not in this plugin. Hosted imports may upload selected media to ChatCut; nothing is sent to nexts-account-service. ChatCut account/plan restrictions still apply.

See NOTICE.nexts.md and UPSTREAM.json for attribution and adaptation details.
