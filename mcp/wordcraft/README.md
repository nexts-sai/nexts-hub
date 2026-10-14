# WordCraft MCP

A Windows stdio MCP launch definition, enabled by default, connected to the local WordCraft desktop app.

## Setup

1. Install WordCraft. This definition assumes the CLI is at `C:\Program Files\WordCraft\wordcraft-cli.exe`; adjust `command` if installed elsewhere.
2. Start the desktop app with `wordcraft --control 7981`.
3. The MCP client runs `wordcraft-cli mcp --connect 127.0.0.1:7981`.

The bridge automatically reads the desktop app's key file at `%APPDATA%\WordCraft\control-key.local-7981`. Run both processes as the same Windows user. `WORDCRAFT_CONTROL_KEY` can override this discovery; do not commit or log its value.

The default-enabled flag does not install or start WordCraft. This directory contains only the launch definition, not third-party binaries.

References:

- [Control protocol](https://github.com/storytold/wordcraft/blob/main/docs/control-protocol.md)
- [MCP server](https://github.com/storytold/wordcraft/blob/main/docs/mcp.md)
