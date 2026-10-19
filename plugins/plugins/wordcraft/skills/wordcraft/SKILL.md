---
name: wordcraft
description: Inspect, edit and export WordCraft documents through its local desktop control channel; discover available commands and parameters before execute or batch, and diagnose command errors.
---

# WordCraft editing

## Connection (official control protocol)

WordCraft's control channel is loopback-only (`127.0.0.1`) and **authenticated**, but the key is handled for you: the desktop app generates a fresh random control key each time it starts, writes it to its key file, and removes it when the window closes. The bundled MCP bridge reads that key automatically — from the `WORDCRAFT_CONTROL_KEY` environment variable, or from the key file the app wrote for its port. So never hardcode a key, never put one in the plugin `env`, never set or echo `WORDCRAFT_CONTROL_KEY` yourself, and never reuse a key across sessions: each is per-start and ephemeral.

The visible desktop app must be running with its control port enabled (`wordcraft --control 7981`); the bridge reaches that running app with `wordcraft-cli mcp --connect 127.0.0.1:7981` (stdio), exactly as this plugin's `.mcp.json` declares.

Do not add `--automation-read-root`/`--automation-write-root` to this connection: those roots force a headless session and are rejected when combined with `--connect`. For user-facing work the target is always the visible app, not the default headless `wordcraft-cli mcp` session.

## Mandatory activation order

When this Skill is selected or the user mentions `@WordCraft`, follow this order exactly:

1. Load this Skill before selecting any WordCraft tool.
2. Confirm the control channel is reachable. If the host provides a WordCraft readiness/startup step, let it run — it checks `127.0.0.1:7981` and brings up the visible app with `--control 7981` when needed. Otherwise, if the connection is refused, ask the user to start WordCraft with control enabled and wait; do not silently fall back to a headless `wordcraft-cli mcp` session.
3. Only after the connection succeeds, call one read-only inspection: `inspect_document` for structure, `get_text` to read the current text, or `ui_inspect` for UI state.
4. Continue with `list_commands`, then edits and save.

Never call a WordCraft tool before the connection is confirmed, and never use an inspection as a startup probe to force the app open. A refused or dropped control channel must stop the workflow until it is reachable again.

## Required execution transport

Use the bundled `wordcraft` MCP server included by this plugin's `.mcp.json` (stdio, `mcp --connect 127.0.0.1:7981`); do not register a duplicate standalone MCP. The visible WordCraft desktop application is the only editing target; `wordcraft-cli` is only the MCP transport and must not be used to open a separate headless document (plain `wordcraft-cli mcp`) for user-facing work. Open, create, and save documents through MCP (`open_document`, `new_document`, `save_document`) so edits stay visible in the desktop app.

If MCP tools are missing or the connection drops, report the concrete connection error and wait for the host retry; do not use Shell/PowerShell to start, restart, or kill WordCraft, and do not run `wordcraft-cli` edit/save subcommands through Shell/PowerShell/Node as a substitute.

## Command discovery

Call `list_commands` (narrow it with `query`) before the first `execute`, and again whenever the document state changes or a command fails. Read each command's exact `command` id, parameter schema, and enablement directly from its output — never guess command names, parameters, position syntax (`story`/`path`/`off`), or object IDs. Inspect live document structure with `inspect_document` and read content with `get_text` before editing.

Run a single command with `execute` (`command`, `params`); use `batch` only for commands already discovered with known ids and prerequisites, and split it at steps that create IDs or require inspection. A failed command leaves the document unchanged, so inspect and correct rather than blindly repeating it.

## After each change

After every mutation, inspect the result with `inspect_document` or `get_text` before continuing, and verify visually with `render_page` (page PNG) or `screenshot` (visible window) when layout matters. After a timeout, inspect first because the edit may already have completed; never blindly retry.

Save with `save_document`, to the current Nexts temporary workspace unless the user explicitly requests another location. Keep the document visible in the desktop app during interactive work.
