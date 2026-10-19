---
name: effectcraft
description: Inspect, edit and render EffectCraft compositions through its local desktop control channel; discover available commands and parameters before command_run or command_batch, and diagnose command errors.
---

# EffectCraft editing

## Connection (official control protocol)

EffectCraft's control channel is loopback-only (`127.0.0.1`) and **unauthenticated** — it has no token or key, so never add a token to the plugin `env`, and never generate or echo one. The visible desktop app must be running with its control port enabled (`effectcraft --control 9877`); the bundled MCP bridge reaches that running app with `effectcraft-cli mcp --bridge 127.0.0.1:9877` (stdio), exactly as this plugin's `.mcp.json` declares.

Do not add `--automation-read-root`/`--automation-write-root` to this connection: those roots confine the bridge and refuse the UI and script tools (`ui_click`, `ui_key`, `ui_type`, `ui_drag`, `ui_set`, `script_ui`, `run_script`) needed for user-facing work. The target is always the visible app, not a confined or default headless `effectcraft-cli mcp` session.

## Mandatory activation order

When this Skill is selected or the user mentions `@EffectCraft`, follow this order exactly:

1. Load this Skill before selecting any EffectCraft tool.
2. Confirm the control channel is reachable. If the host provides an EffectCraft readiness/startup step, let it run — it checks `127.0.0.1:9877` and brings up the visible app with `--control 9877` when needed. Otherwise, if the connection is refused, ask the user to start EffectCraft with control enabled and wait; do not silently fall back to a headless `effectcraft-cli mcp` session.
3. Only after the connection succeeds, call one read-only inspection: `doc_inspect` for the composition and project state.
4. Continue with `command_list`, then edits and render.

Never call an EffectCraft tool before the connection is confirmed, and never use `doc_inspect` as a startup probe to force the app open. A refused or dropped control channel must stop the workflow until it is reachable again.

## Required execution transport

Use the bundled `effectcraft` MCP server included by this plugin's `.mcp.json` (stdio, `mcp --bridge 127.0.0.1:9877`); do not register a duplicate standalone MCP. The visible EffectCraft desktop application is the only editing target; `effectcraft-cli` is only the MCP transport and must not be used to open a separate headless session (plain `effectcraft-cli mcp`) for user-facing work. Create, edit, and render through MCP so results stay visible in the desktop app.

If MCP tools are missing or the connection drops, report the concrete connection error and wait for the host retry; do not use Shell/PowerShell to start, restart, or kill EffectCraft, and do not run `effectcraft-cli` edit/render subcommands through Shell/PowerShell/Node as a substitute.

## Command discovery

Call `command_list` (narrow it with `filter`, and set `enabled_only: true`) before the first `command_run`, and again whenever the composition state changes or a command fails. Read each command's exact `id`, parameter schema, and enablement from its output — request the JSON Schema with `schemas: true` when you need it — and never guess command names, parameters, time/frame units, or object IDs. Inspect live composition, layer, keyframe, effect, and object IDs with `doc_inspect` before editing. If an enabled-only search is empty, retry with `enabled_only: false` to distinguish disabled from missing.

Run a single command with `command_run` (`id`, `params`); use `command_batch` (`steps: [{id, params?}]`, optional `stop_on_error`) only for commands already discovered with known IDs and prerequisites, and split it at steps that create IDs or require inspection.

## After each change

After every mutation, inspect the result with `doc_inspect` before continuing, and verify visually with `render_preview` (`comp`, `time`, `max_side`, `transparent`) when the change is visual. After a timeout, inspect first because the edit may already have completed; never blindly retry.

Render or export to the current Nexts temporary workspace unless the user explicitly requests another location. Keep the composition visible in the desktop app during interactive work.
