---
name: lightcraft
description: Organize, develop and export photos in LightCraft through its local desktop control channel; discover available commands and parameters before command_run or command_batch, and diagnose command errors.
---

# LightCraft editing

## Connection (official control protocol)

LightCraft's control channel is loopback-only (`127.0.0.1`) and **unauthenticated** — it has no token, key, or header, so never generate, pass, or echo a control token, and do not add one to the plugin `env`. The visible desktop app must be running with its control port enabled (`lightcraft --control 7980`); the bundled MCP server reaches that running app with `lightcraft-cli mcp --connect 127.0.0.1:7980` (stdio), exactly as this plugin's `.mcp.json` declares.

For user-facing work the target is always the visible app. Do not fall back to the default headless `lightcraft-cli mcp` session, which opens its own library instead of the one the user sees.

## Mandatory activation order

When this Skill is selected or the user mentions `@LightCraft`, follow this order exactly:

1. Load this Skill before selecting any LightCraft tool.
2. Confirm the control channel is reachable. If the host provides a LightCraft readiness/startup step, let it run — it checks `127.0.0.1:7980` and brings up the visible app with `--control 7980` when needed. Otherwise, if the connection is refused, ask the user to start LightCraft with control enabled and wait; do not silently fall back to a headless `lightcraft-cli mcp` session.
3. Only after the connection succeeds, call one read-only inspection: `doc_inspect` for state, or `list_controls` / `get_develop` to read the active photo's adjustments.
4. Continue with `command_list`, then edits and export.

Never call a LightCraft tool before the connection is confirmed, and never use an inspection as a startup probe to force the app open. A refused or dropped control channel must stop the workflow until it is reachable again.

## Required execution transport

Use the bundled `lightcraft` MCP server included by this plugin's `.mcp.json` (stdio, `mcp --connect 127.0.0.1:7980`); do not register a duplicate standalone MCP. The visible LightCraft desktop application is the only editing target; `lightcraft-cli` is only the MCP transport and must not be used to open a separate headless library (plain `lightcraft-cli mcp`) for user-facing work.

If MCP tools are missing or the connection drops, report the concrete connection error and wait for the host retry; do not use Shell/PowerShell to start, restart, or kill LightCraft, and do not run `lightcraft-cli run`/`snapshot` subcommands through Shell/PowerShell/Node as a substitute.

## Command discovery

Call `command_list` (`filter?`, `enabled_only?`) before the first `command_run`, and again whenever the library/photo state changes or a command fails. Read each command's exact `id`, parameter schema, enablement, and prerequisites directly from its output — never guess command names, parameters, control names, or photo/object IDs. If an enabled-only search is empty, retry with `enabled_only: false` to distinguish disabled from missing. Inspect live state with `doc_inspect`, and read the active photo's editable controls with `list_controls` / `get_develop` before adjusting.

Run a single command with `command_run` (`id`, `params?`); use `command_batch` (`steps`, `stop_on_error?`) only for commands already discovered with known ids and prerequisites, and split it at steps that change selection or require inspection. Prefer the typed helpers where they fit — `set_develop`, `apply_preset`, `crop`, `select_photos`, `query_photos`, `import` — reading their parameter schema first.

## After each change

After every mutation, inspect the result with `doc_inspect` (or `get_develop` for adjustments) before continuing, and verify visually with `render_preview` / `render_photo`, or `ui_screenshot` / `screenshot` for the window, when the look matters. After a timeout, inspect first because the edit may already have completed; never blindly retry.

Export with `export` (or `render_photo`); save or export to the current Nexts temporary workspace unless the user explicitly requests another location. Keep the library and active photo visible in the desktop app during interactive work.
