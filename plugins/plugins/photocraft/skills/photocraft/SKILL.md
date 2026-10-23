---
name: photocraft
description: Inspect, edit and export PhotoCraft documents through its authenticated local desktop bridge; discover available commands and parameters before command_run or command_batch, and diagnose command errors.
---

# PhotoCraft editing

## Mandatory activation order

When this Skill is selected or the user mentions `@PhotoCraft`, follow this order exactly:

1. Load this Skill before selecting any PhotoCraft tool.
2. Ask the host to perform the PhotoCraft readiness step: check `127.0.0.1:7878`; if it is not listening, start the visible `photocraft.exe --control 7878` with the plugin's shared control token, wait for the control port, and start one authenticated MCP bridge session.
3. Only after readiness succeeds, call one read-only MCP inspection such as `doc_inspect` or `project_inspect`.
4. Continue with `command_list`, then edits and export.

Never call a PhotoCraft MCP tool as the first step, and never use `doc_inspect` or `project_inspect` as a startup probe. The startup/check step is host-managed and may not appear as a model-visible tool call; a disconnected bridge must stop the workflow until readiness succeeds.

PhotoCraft's bridge is authenticated: the host supplies one shared control token (via `PHOTOCRAFT_CONTROL_TOKEN`) to both the desktop companion and the MCP server, so the bridge only connects after the companion is running with that same token. Do not pass `--control-token`/`--control-token-file` yourself and do not generate a token; the host wires it. Never echo the token into a prompt.

## Required execution transport

Use the bundled `photocraft` MCP server included by this plugin's `.mcp.json`; do not register a duplicate standalone MCP. The visible PhotoCraft desktop application is the only editing target; `photocraft-cli` is only the MCP bridge transport and must not be used to edit a separate headless document. Call the MCP inspection tool, then MCP `command_list`, then MCP `command_run` or `command_batch`, and inspect the result. Open or create the document through MCP so edits are visible in the desktop app.

If MCP tools are missing or disconnected, report the concrete connection error and wait for the host retry; do not use Shell/PowerShell to start, restart, or kill PhotoCraft, and do not silently fall back to a headless process. The host owns the companion lifecycle and will retry the read-only bridge check. Do not run `photocraft-cli run`, `batch`, or export commands through Shell/PowerShell/Node as a substitute, even with `--bridge`.

## Command discovery

Call `command_list` with `enabled_only: true` before the first `command_run`, and again whenever the project state changes or a command fails. Read the exact command `id`, parameter schema, enabled state, and prerequisites; inspect live project, image, layer, selection, and object IDs before editing. Use `command_batch` only for commands already discovered with known IDs and prerequisites. Never guess command names, parameters, layer IDs, or object IDs. If an enabled-only search is empty, retry discovery with `enabled_only: false` to distinguish disabled from missing.

## After each change

After every mutation, inspect the result and document state before continuing. After a timeout, inspect first because the edit may already have completed; never blindly retry. Keep the project visible in the desktop app during interactive work. Save or export to the current Nexts temporary workspace unless the user explicitly requests another location.
