# GridCraft MCP

A Windows stdio MCP launch definition, enabled by default, connected to the local GridCraft desktop app.

## Setup

1. Install GridCraft. This definition assumes the CLI is at `C:\Program Files\GridCraft\gridcraft-cli.exe`; adjust `command` if installed elsewhere.
2. Start the desktop app with `gridcraft --control 7982`.
3. The MCP client runs `gridcraft-cli mcp --connect 7982`.

This catalog uses port 7982 instead of the upstream example's 7979 so the Craft apps can run together. If you change the port, update both the desktop launch command and the MCP arguments.

The default-enabled flag does not install or start GridCraft. This directory contains only the launch definition, not third-party binaries.

References:

- [Control protocol](https://github.com/storytold/gridcraft/blob/main/docs/control-protocol.md)
- [MCP server](https://github.com/storytold/gridcraft/blob/main/docs/mcp.md)
