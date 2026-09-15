# Upstream inspiration

This NEXTS-maintained MCP server was informed by the public workflow and page-structure notes in:

- Project: `Snseam/boss-zhipin-mcp`
- Repository: <https://github.com/Snseam/boss-zhipin-mcp>
- Reviewed commit: `06a1a7d804aa80131a066bddc1879ac4bc72f841`
- License: MIT

The upstream Python package is not redistributed by this server. The NEXTS implementation uses the local Chrome Control bridge and implements all 17 tools registered by the reviewed upstream `server.py`. It stops for login and security verification, does not add anti-detection behavior, and requires explicit confirmation before candidate-contact tools can run.
