---
name: vectorcraft
description: Inspect, edit and export VectorCraft vector artwork through its local desktop control channel; discover available commands and parameters before command_run or command_batch, and diagnose command errors.
---

# VectorCraft editing

## Connection (official control protocol)

VectorCraft's control channel is loopback-only and **unauthenticated** — it has no token or header, so never generate, pass, or echo a control token, and do not add one to the plugin `env`. The visible desktop app must be running with its control port enabled (`vectorcraft --control 7979`); the bundled MCP server reaches that running app with `vectorcraft-cli mcp --connect 127.0.0.1:7979` (remote mode), exactly as this plugin's `.mcp.json` declares.

Do not add `--automation-read-root`/`--automation-write-root` to this connection: those roots force an in-process headless engine and are rejected when combined with `--connect`. For user-facing work the target is always the visible app, not a headless document.

## Mandatory activation order

When this Skill is selected or the user mentions `@VectorCraft`, follow this order exactly:

1. Load this Skill before selecting any VectorCraft tool.
2. Confirm the control channel is reachable. If the host provides a VectorCraft readiness/startup step, let it run — it checks `127.0.0.1:7979` and brings up the visible app with `--control 7979` when needed. Otherwise, if the connection is refused, ask the user to start VectorCraft with control enabled and wait; do not silently fall back to `mcp --headless`.
3. Only after the connection succeeds, call one read-only MCP inspection: `doc_inspect` for the document, `ui_inspect` for UI state.
4. Continue with `command_list`, then edits and export.

Never call a VectorCraft MCP tool before the connection is confirmed, and never use `doc_inspect` as a startup probe. A refused or dropped control channel must stop the workflow until it is reachable again.

## Required execution transport

Use the bundled `vectorcraft` MCP server included by this plugin's `.mcp.json` (stdio, `mcp --connect 127.0.0.1:7979`); do not register a duplicate standalone MCP. The visible VectorCraft desktop application is the only editing target; `vectorcraft-cli` is only the MCP transport and must not be used to open a separate `mcp --headless` document for user-facing work. Open or create documents through MCP so edits stay visible in the desktop app.

If MCP tools are missing or the connection drops, report the concrete connection error and wait for the host retry; do not use Shell/PowerShell to start, restart, or kill VectorCraft, and do not run `vectorcraft-cli` edit/export subcommands through Shell/PowerShell/Node as a substitute.

## Command discovery

Call `command_list` before the first `command_run`, and again whenever the document state changes or a command fails. Read each command's exact `id`, parameter schema, enablement, and prerequisites directly from its output — never guess command names, parameters, coordinate units, or object IDs. If `command_list` exposes a filter or enabled-only option, use it to narrow discovery, but confirm a command's real enablement from its entry rather than assuming. Inspect live document, artboard, layer, path, and object IDs with `doc_inspect` before editing.

Use `command_batch` (`steps: [{id, params?}]`, optional `stop_on_error`/`atomic`/`label`) only for commands already discovered with known IDs and prerequisites; split the batch at steps that create IDs or require inspection.

## After each change

After every mutation, inspect the result with `doc_inspect` before continuing, and verify visually with `render_preview` (headless artboard PNG) or `ui_screenshot` (visible window PNG) when the change is visual. After a timeout, inspect first because the edit may already have completed; never blindly retry.

Export with the `export` tool (read its `path`/`format`/`scale`/`artboard`/`range` schema before calling); save or export to the current Nexts temporary workspace unless the user explicitly requests another location. Keep the project visible in the desktop app during interactive work.
