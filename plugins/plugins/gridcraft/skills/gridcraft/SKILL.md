---
name: gridcraft
description: Inspect, edit and export GridCraft spreadsheets through its local desktop control channel; discover available commands and parameters before execute_command, and diagnose command errors.
---

# GridCraft editing

## Connection (official control protocol)

GridCraft's control channel is loopback-only (`127.0.0.1`) and **unauthenticated** — it has no token, key, or credential file, so never generate, pass, or echo any token, and do not add one to the plugin `env`. The visible desktop app must be running with its control port enabled (`gridcraft --control 7979`); the bundled MCP server reaches that running app with `gridcraft-cli mcp --connect 7979` (stdio), exactly as this plugin's `.mcp.json` declares. Note that GridCraft's `--connect` takes the control port number (`7979`), not a host:port pair.

For user-facing work the target is always the visible app, not the default headless `gridcraft-cli mcp` session.

## Mandatory activation order

When this Skill is selected or the user mentions `@GridCraft`, follow this order exactly:

1. Load this Skill before selecting any GridCraft tool.
2. Confirm the control channel is reachable. If the host provides a GridCraft readiness/startup step, let it run — it checks the control port and brings up the visible app with `--control 7979` when needed. Otherwise, if the connection is refused, ask the user to start GridCraft with control enabled and wait; do not silently fall back to a headless `gridcraft-cli mcp` session.
3. Only after the connection succeeds, call one read-only inspection: `inspect_workbook` for structure, or `read_range`/`get_cell` to read current values.
4. Continue with `list_commands` and the editing tools.

Never call a GridCraft tool before the connection is confirmed, and never use an inspection as a startup probe to force the app open. A refused or dropped control channel must stop the workflow until it is reachable again.

## Required execution transport

Use the bundled `gridcraft` MCP server included by this plugin's `.mcp.json` (stdio, `mcp --connect 7979`); do not register a duplicate standalone MCP. The visible GridCraft desktop application is the only editing target; `gridcraft-cli` is only the MCP transport and must not be used to open a separate headless workbook (plain `gridcraft-cli mcp`) for user-facing work. Open, create, and save workbooks through MCP (`open_workbook`, `new_workbook`, `save_workbook`) so edits stay visible in the desktop app.

If MCP tools are missing or the connection drops, report the concrete connection error and wait for the host retry; do not use Shell/PowerShell to start, restart, or kill GridCraft, and do not run `gridcraft-cli` edit/save subcommands through Shell/PowerShell/Node as a substitute.

## Command discovery

Prefer the dedicated high-level tools where they fit — `set_cell`, `get_cell`, `read_range`, `write_range`, `evaluate_formula`, `select`, `format_range`, `insert_chart`, `create_table`, `sort_range`, `filter`, `undo`/`redo`, `list_functions`. For anything else, call `list_commands` (narrow it with `search`) before the first `execute_command`, and again whenever the workbook state changes or a command fails. Read each command's exact `command` id and parameter schema directly from its output — never guess command names, parameters, range syntax (e.g. `Sheet1!A1:B10`), or cell references. Inspect live workbook, sheet, range, and cell state with `inspect_workbook`, `read_range`, and `get_cell` before editing.

Run an engine command with `execute_command` (`command`, optional `params`). A failed command leaves the workbook unchanged, so inspect and correct rather than blindly repeating it.

## After each change

After every mutation, inspect the result with `inspect_workbook`, `read_range`, or `get_cell` before continuing, and verify visually with `screenshot` (visible window; remote connection only) when layout matters. After a timeout, inspect first because the edit may already have completed; never blindly retry.

Save with `save_workbook`, to the current Nexts temporary workspace unless the user explicitly requests another location. Keep the workbook visible in the desktop app during interactive work.
