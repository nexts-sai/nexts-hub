# DesignCraft MCP

A Windows stdio MCP launch definition, enabled by default, connected to the local DesignCraft desktop app.

## Setup

1. Install DesignCraft. This definition assumes the CLI is at `C:\Program Files\DesignCraft\designcraft-cli.exe`; adjust `command` if installed elsewhere.
2. Start the desktop app with `designcraft --control 7983`.
3. The MCP client runs `designcraft-cli mcp --connect 7983`.

This catalog uses port 7983 instead of the upstream example's 7979 so the Craft apps can run together. If you change the port, update both the desktop launch command and the MCP arguments.

The default-enabled flag does not install or start DesignCraft. This directory contains only the launch definition, not third-party binaries.

References:

- [Control protocol](https://github.com/storytold/designcraft/blob/main/docs/control-protocol.md)
- [MCP server](https://github.com/storytold/designcraft/blob/main/docs/mcp.md)
