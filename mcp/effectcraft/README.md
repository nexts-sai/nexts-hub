# EffectCraft MCP

A Windows stdio MCP launch definition, enabled by default, connected to the local EffectCraft desktop app.

## Setup

1. Install EffectCraft. This definition assumes the CLI is at `C:\Program Files\EffectCraft\effectcraft-cli.exe`; adjust `command` if installed elsewhere.
2. Start the desktop app with `effectcraft --control 9877`.
3. The MCP client runs `effectcraft-cli mcp --bridge 9877`.

The default-enabled flag does not install or start EffectCraft. This directory contains only the launch definition, not third-party binaries.

References:

- [Control protocol](https://github.com/storytold/effectcraft/blob/main/docs/control-protocol.md)
- [MCP server](https://github.com/storytold/effectcraft/blob/main/docs/mcp.md)
