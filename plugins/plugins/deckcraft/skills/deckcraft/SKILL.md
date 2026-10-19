---
name: deckcraft
description: Inspect, edit and export DeckCraft presentations through its local desktop control channel; discover available commands and parameters before run_command or batch, and diagnose command errors.
---

# DeckCraft editing

## Connection (official control protocol)

DeckCraft's control channel is loopback-only (`127.0.0.1`) and **unauthenticated** — it has no token, key, or header, so never generate, pass, or echo a control token, and do not add one to the plugin `env`. The visible desktop app must be running with its control port enabled (`deckcraft --control 7990`); the bundled MCP server reaches that running app with `deckcraft-cli mcp --connect 7990` (stdio, connected mode), exactly as this plugin's `.mcp.json` declares. Note the `--connect` value is the bare control port number (`7990`), not a `host:port` address.

Do not add `--automation-read-root`/`--automation-write-root` to this connection: those roots force the default headless engine and are rejected when combined with `--connect`. For user-facing work the target is always the visible app, not a headless deck.

## Mandatory activation order

When this Skill is selected or the user mentions `@DeckCraft`, follow this order exactly:

1. Load this Skill before selecting any DeckCraft tool.
2. Confirm the control channel is reachable. If the host provides a DeckCraft readiness/startup step, let it run — it checks the control port and brings up the visible app with `--control 7990` when needed. Otherwise, if the connection is refused, ask the user to start DeckCraft with control enabled and wait; do not silently fall back to the default headless `deckcraft-cli mcp` session.
3. Only after the connection succeeds, call one read-only inspection: `inspect_document` for the deck, `inspect_slide` for a slide.
4. Continue with `list_commands`, then edits and export.

Never call a DeckCraft tool before the connection is confirmed, and never use an inspection as a startup probe to force the app open. A refused or dropped control channel must stop the workflow until it is reachable again.

## Required execution transport

Use the bundled `deckcraft` MCP server included by this plugin's `.mcp.json` (stdio, `mcp --connect 7990`); do not register a duplicate standalone MCP. The visible DeckCraft desktop application is the only editing target; `deckcraft-cli` is only the MCP transport and must not be used to open a separate headless deck (the default `deckcraft-cli mcp`) for user-facing work. Open, create, and save decks through MCP (`open_presentation`, `new_presentation`, `save_presentation`) so edits stay visible in the desktop app.

If MCP tools are missing or the connection drops, report the concrete connection error and wait for the host retry; do not use Shell/PowerShell to start, restart, or kill DeckCraft, and do not run `deckcraft-cli` edit/export subcommands through Shell/PowerShell/Node as a substitute.

## Command discovery

Call `list_commands` (narrow it with its filter) before the first `run_command`, and again whenever the deck state changes or a command fails. Read each command's exact `command` id, parameter schema, and enablement directly from its output — never guess command names, parameters, slide-point coordinates, or object IDs. Inspect live deck and slide structure with `inspect_document` and `inspect_slide` before editing.

Run a single command with `run_command` (`command`, `params`); use `batch` only for commands already discovered with known ids and prerequisites — it runs them in order and stops at the first error, so split it at steps that create IDs or require inspection. Dedicated tools are also available for common edits: `add_slide`, `go_to_slide`, `add_shape`, `add_text_box`, `set_text`, `insert_picture`, `insert_table`, `insert_chart`.

## After each change

After every mutation, inspect the result with `inspect_document` or `inspect_slide` before continuing, and verify visually with `render_slide` (slide image) or `screenshot` (visible window) when layout matters. After a timeout, inspect first because the edit may already have completed; never blindly retry.

Export with the `export` tool (`.pptx`, PDF, PNG/JPEG, outline, or animated GIF) and save with `save_presentation`, to the current Nexts temporary workspace unless the user explicitly requests another location. Keep the deck visible in the desktop app during interactive work.
