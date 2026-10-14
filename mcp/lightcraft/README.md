# LightCraft MCP

A Windows stdio MCP launch definition, enabled by default, connected to the local LightCraft desktop app.

## Setup

1. Install LightCraft. This definition assumes the CLI is at `C:\Program Files\LightCraft\lightcraft-cli.exe`; adjust `command` if installed elsewhere.
2. Start the desktop app with `lightcraft --control 7980`.
3. The MCP client runs `lightcraft-cli mcp --connect 127.0.0.1:7980`.

The default-enabled flag does not install or start LightCraft. This directory contains only the launch definition, not third-party binaries.

References:

- [Control protocol](https://github.com/storytold/lightcraft/blob/main/docs/control-protocol.md)
- [MCP server](https://github.com/storytold/lightcraft/blob/main/docs/mcp.md)
