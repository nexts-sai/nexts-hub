---
name: filmcraft-edit
description: Assemble, inspect and export FilmCraft timelines; discover available commands and parameters before command_run or command_batch, and diagnose command errors.
---

# FilmCraft editing

## Mandatory activation order

When this Skill is selected or the user mentions `@FilmCraft`, follow this order exactly:

1. Load this Skill and its referenced command/workspace guidance before selecting any FilmCraft tool.
2. Ask the host to perform the FilmCraft readiness step: check `127.0.0.1:9876`; if it is not listening, start the visible `filmcraft.exe --control 9876`, wait for the control port, and start one MCP bridge session.
3. Only after readiness succeeds, call one read-only MCP inspection such as `ui_inspect`, `project_inspect`, or `doc_inspect`.
4. Continue with `command_list`, then edits and export.

Never call a FilmCraft MCP tool as the first step, and never use `project_inspect` or `ui_inspect` as a startup probe. The startup/check step is host-managed and may not appear as a model-visible tool call; a disconnected bridge must stop the workflow until readiness succeeds.

Before creating any production files, follow [workspace resolution](../../references/production.md#resolve-the-actual-nexts-workspace-before-writing). Resolve the active Nexts workspace first; never substitute C:/temp or the OS temporary directory. Use explicit absolute MCP save/export paths inside that verified workspace.

## Required execution transport

For normal editing, use the FilmCraft MCP tools registered by this plugin. Discover/load the actual tool names from the host tool catalog; namespace prefixes vary by host. The visible FilmCraft desktop application is the only editing target; `filmcraft-cli` is only the MCP bridge transport and must not be used to create or edit a separate headless project. Call the MCP inspection tool, then MCP `command_list`, then MCP `command_run` or `command_batch`, and inspect the result. Open or create the project and its active sequence through MCP so edits are visible in the desktop editor. Confirm the visible project and active sequence match the inspected target. After major editing stages, use the available MCP UI screenshot/preview tools to review the live result; use discovered UI click/drag tools when an operation needs interface interaction. Keep the final project and sequence open for review.

Do not execute `filmcraft-cli import`, `exec`, `batch`, or export commands through Shell/PowerShell/Node as a substitute, even with `--bridge`. The plugin configuration's `filmcraft-cli mcp --bridge ...` starts the MCP server; it is not an instruction for the agent to operate via terminal commands. Starting FilmCraft alone does not show a project edited by a separate headless process.

If MCP tools are missing or disconnected, report the connection problem and restore the plugin MCP connection before editing; do not silently fall back to CLI. A temporary or separate test project still uses visible MCP editing. CLI editing is allowed only when the user explicitly requests CLI/headless execution, not merely a new project or a test export. Shell remains available for media preparation and file verification. Do not use Shell or PowerShell to inspect, launch, restart, or kill FilmCraft when the plugin MCP bridge is connecting; the host owns that lifecycle and will retry the read-only bridge check.

Read [production contract](../../references/production.md). FilmCraft CLI 0.7.2 was used to verify this adapter. Discover commands again for a different version. This plugin bundles its FilmCraft MCP server; use that connection and do not register a duplicate.

Before direct `command_run` or `command_batch`, read and follow [command discovery](../../references/commands.md). Start with `command_list(enabled_only: true)`; query the operation's exact ID, parameter schema and current availability before its first execution. Use inspection results for object IDs. Never guess command names or parameter keys. Refresh discovery and state after command errors; inspect whether a timed-out edit already happened before retrying.

Before the first FilmCraft command, determine the execution target. Default to the visible live editor for user-facing work. The Nexts host checks the installed FilmCraft desktop companion, starts it once when needed, waits for its control port, and creates one `filmcraft-cli` MCP bridge session. Verify that session with a read-only inspection and open or create the target project through the bridge before editing. If the bridge is unavailable, wait for the host startup result and report the concrete dependency; do not run Shell/PowerShell process checks or launch commands, create another MCP session, or start a second FilmCraft window. Use the headless CLI only for an explicitly requested silent/background/batch export or explicitly requested CLI execution. Never mix live bridge edits with headless CLI writes.

For an explicitly requested headless/CLI montage, run `node <plugin>/scripts/studio.mjs assemble <production.json>` and let the adapter create `output/` beside `production.json` in the current Nexts temporary workspace. Do not require a fixed production folder name. Pass an output directory only when the user explicitly requests one; never choose Desktop or Downloads by default. It validates all files first, imports the assets, places shots on V1 and narration on A1, imports SRT, saves a project and exports H.264 with burnt captions. The output directory must not already exist. Re-running into a new directory never re-submits generation. For the default visible workflow, perform the equivalent imports, timeline edits and export through the discovered live bridge commands so the project remains visible in FilmCraft.

For an existing user's project use FilmCraft MCP, inspect first, and save a copy before changes using a discovered command. Avoid mixing headless CLI writes and live-app writes to the same project. If the desktop bridge is down, restore its connection before editing; do not kill or restart the user's editor or switch to a headless project.

Inspect the saved sequence, probe final video dimensions and duration, render first/middle/last and transition frames, and listen to exported audio. Automated probe checks do not prove visual quality or subtitle alignment. Keep QA status `needs-review` until those checks pass. Deliver the original editable project and assets, final MP4, SRT, and QA JSON. Do not export with offline-media allowance or claim success merely because an export command returned.
