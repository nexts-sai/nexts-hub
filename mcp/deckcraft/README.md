# DeckCraft MCP

A Windows stdio MCP launch definition, enabled by default, connected to the local DeckCraft desktop app.

## Setup

1. Install DeckCraft. This definition assumes the CLI is at `C:\Program Files\DeckCraft\deckcraft-cli.exe`; adjust `command` if installed elsewhere.
2. Start the desktop app with `deckcraft --control 7990`.
3. The MCP client runs `deckcraft-cli mcp --connect 7990`.

The default-enabled flag does not install or start DeckCraft. This directory contains only the launch definition, not third-party binaries.

References:

- [Control protocol](https://github.com/storytold/deckcraft/blob/main/docs/control-protocol.md)
- [MCP server](https://github.com/storytold/deckcraft/blob/main/docs/mcp.md)
