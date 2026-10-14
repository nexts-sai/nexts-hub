# VectorCraft MCP

A Windows stdio MCP launch definition, enabled by default, connected to the local VectorCraft desktop app.

## Setup

1. Install VectorCraft. This definition assumes the CLI is at `C:\Program Files\VectorCraft\vectorcraft-cli.exe`; adjust `command` if installed elsewhere.
2. Start the desktop app with `vectorcraft --control 7979`.
3. The MCP client runs `vectorcraft-cli mcp --connect 127.0.0.1:7979`.

For file access, configure the desktop process with `--automation-read-root <project-directory>` and `--automation-write-root <output-directory>`. These grants belong on the desktop process when using `--connect`.

The default-enabled flag does not install or start VectorCraft. This directory contains only the launch definition, not third-party binaries.

References:

- [Control protocol](https://github.com/storytold/vectorcraft/blob/main/docs/control-protocol.md)
- [MCP server](https://github.com/storytold/vectorcraft/blob/main/docs/mcp.md)
