---
name: designcraft
description: Inspect, edit and export DesignCraft page layouts through its local desktop control channel; discover available commands and parameters before execute or batch, and diagnose command errors.
---

# DesignCraft editing

## Connection (official control protocol)

DesignCraft's control channel is loopback-only (`127.0.0.1`) and **unauthenticated** — it has no token, key, or header, so never generate, pass, or echo any credential, and do not add one to the plugin `env`. The visible desktop app must be running with its control port enabled (`designcraft --control 7979`); the bundled MCP server reaches that running app with `designcraft-cli mcp --connect 127.0.0.1:7979` (connected mode, stdio), exactly as this plugin's `.mcp.json` declares.

Do not add `--automation-read-root`/`--automation-write-root` to this connection: those roots run an in-process headless engine and are rejected when combined with `--connect`. For user-facing work the target is always the visible app, not the default headless `designcraft-cli mcp` session (which starts an empty Letter document).

## Mandatory activation order

When this Skill is selected or the user mentions `@DesignCraft`, follow this order exactly:

1. Load this Skill before selecting any DesignCraft tool.
2. Confirm the control channel is reachable. If the host provides a DesignCraft readiness/startup step, let it run — it checks `127.0.0.1:7979` and brings up the visible app with `--control 7979` when needed. Otherwise, if the connection is refused, ask the user to start DesignCraft with control enabled and wait; do not silently fall back to a headless `designcraft-cli mcp` session.
3. Only after the connection succeeds, call one read-only inspection: `inspect_document` for pages/spreads/stories/styles/swatches, or `ui_inspect` for tool and view state.
4. Continue with `list_commands`, then edits and export.

Never call a DesignCraft tool before the connection is confirmed, and never use an inspection as a startup probe to force the app open. A refused or dropped control channel must stop the workflow until it is reachable again.

## Required execution transport

Use the bundled `designcraft` MCP server included by this plugin's `.mcp.json` (stdio, `mcp --connect 127.0.0.1:7979`); do not register a duplicate standalone MCP. The visible DesignCraft desktop application is the only editing target; `designcraft-cli` is only the MCP transport and must not be used to open a separate headless document (plain `designcraft-cli mcp`) for user-facing work. Open, create, and save documents through MCP (`open_document`, `new_document`, `save_document`) so edits stay visible in the desktop app.

If MCP tools are missing or the connection drops, report the concrete connection error and wait for the host retry; do not use Shell/PowerShell to start, restart, or kill DesignCraft, and do not run `designcraft-cli` edit/export subcommands through Shell/PowerShell/Node as a substitute.

## Command discovery

Call `list_commands` (narrow it with `filter`, and use `enabledOnly` to see only currently runnable commands) before the first `execute`, and again whenever the document state changes or a command fails. Read each command's exact `command` id, parameter schema, and enablement directly from its output — never guess command names, parameters, or object IDs (page, spread, story, style, swatch, item). Inspect live document structure with `inspect_document` and read copy with `get_story` before editing; set copy with `set_story_text`.

Run a single command with `execute` (`command`, `params`); use `batch` (`commands` or `script`) only for commands already discovered with known ids and prerequisites, and split it at steps that create IDs or require inspection. Note that window tools (`screenshot`, `click`, `drag`, `menu_list`, `ui_inspect`, `ui_set`, `dialog_*`) only work in this connected mode, not headless.

## After each change

After every mutation, inspect the result with `inspect_document` (or `get_story`) before continuing, and verify visually with `render_page` or `screenshot` when layout matters. After a timeout, inspect first because the edit may already have completed; never blindly retry.

Export with `export_png` or a `save_document`/`app.export` command (read its parameter schema first); place artwork with `place_image`. Save or export to the current Nexts temporary workspace unless the user explicitly requests another location. Keep the document visible in the desktop app during interactive work.
