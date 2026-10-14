# PhotoCraft MCP

A Windows stdio MCP launch definition, enabled by default, bridging to the PhotoCraft desktop app at `127.0.0.1:7878`.

## Setup

1. Install PhotoCraft. This definition assumes the CLI is at `C:\Program Files\PhotoCraft\photocraft-cli.exe`; adjust `command` if installed elsewhere.
2. Start the desktop app with `--control 7878 --control-token-file <absolute-token-file-path>`. Use a private location outside this repository with a user-only Windows ACL. PhotoCraft creates the token file if it does not exist and reuses an existing file.
3. Set the MCP's **Control token file** configuration field to that same absolute path. The client passes it as `PHOTOCRAFT_CONTROL_TOKEN_FILE`; do not enter the token contents or commit a token file.
4. To open and save images through automation, grant the intended project directory on the desktop process using `--automation-read-root <project-directory>` and `--automation-write-root <project-directory>`. These grants belong on the desktop process, not the MCP bridge.

The default-enabled flag does not install or start PhotoCraft or supply its authentication file. Configure these prerequisites before connecting. This directory contains only the launch definition, not third-party binaries.

Protocol reference: https://github.com/storytold/photocraft/blob/main/docs/control-protocol.md
