---
name: filmcraft-edit
description: Assemble, inspect and export FilmCraft timelines; discover available commands and parameters before command_run or command_batch, and diagnose command errors.
---

# FilmCraft editing

Before creating any production files, follow [workspace resolution](../../references/production.md#resolve-the-actual-nexts-workspace-before-writing). Resolve the active Nexts workspace first; never substitute C:/temp or the OS temporary directory. Use explicit absolute MCP save/export paths inside that verified workspace.

## Required execution transport

For normal editing, use the FilmCraft MCP tools registered by this plugin. Discover/load the actual tool names from the host tool catalog; namespace prefixes vary by host. Call the MCP inspection tool, then MCP `command_list`, then MCP `command_run` or `command_batch`, and inspect the result. Open or create the project and its active sequence through MCP so edits are visible in the desktop editor. Confirm the visible project and active sequence match the inspected target. After major editing stages, use the available MCP UI screenshot/preview tools to review the live result; use discovered UI click/drag tools when an operation needs interface interaction. Keep the final project and sequence open for review.

Do not execute `filmcraft-cli import`, `exec`, `batch`, or export commands through Shell/PowerShell/Node as a substitute, even with `--bridge`. The plugin configuration's `filmcraft-cli mcp --bridge ...` starts the MCP server; it is not an instruction for the agent to operate via terminal commands. Starting FilmCraft alone does not show a project edited by a separate headless process.

If MCP tools are missing or disconnected, report the connection problem and restore the plugin MCP connection before editing; do not silently fall back to CLI. A temporary or separate test project still uses visible MCP editing. CLI editing is allowed only when the user explicitly requests CLI/headless execution, not merely a new project or a test export. Shell remains available for media preparation and file verification.

Read [production contract](../../references/production.md). FilmCraft CLI 0.7.2 was used to verify this adapter. Discover commands again for a different version. This plugin bundles its FilmCraft MCP server; use that connection and do not register a duplicate.

Before direct `command_run` or `command_batch`, read and follow [command discovery](../../references/commands.md). Start with `command_list(enabled_only: true)`; query the operation's exact ID, parameter schema and current availability before its first execution. Use inspection results for object IDs. Never guess command names or parameter keys. Refresh discovery and state after command errors; inspect whether a timed-out edit already happened before retrying.

Before the first FilmCraft command, determine the execution target. Default to the visible live editor for user-facing work: verify FilmCraft is open, verify the bridge with a read-only inspection, and open or create the target project through the bridge before editing. If the editor is closed or unreachable, ask the user to open it; do not silently fall back to headless mode. Use the headless CLI only for an explicitly requested silent/background/batch export or explicitly requested CLI execution, which does not require the desktop editor to be open. Never mix live bridge edits with headless CLI writes.

For an explicitly requested headless/CLI montage, run `node <plugin>/scripts/studio.mjs assemble <production.json>` and let the adapter create `output/` beside `production.json` in the current Nexts temporary workspace. Do not require a fixed production folder name. Pass an output directory only when the user explicitly requests one; never choose Desktop or Downloads by default. It validates all files first, imports the assets, places shots on V1 and narration on A1, imports SRT, saves a project and exports H.264 with burnt captions. The output directory must not already exist. Re-running into a new directory never re-submits generation. For the default visible workflow, perform the equivalent imports, timeline edits and export through the discovered live bridge commands so the project remains visible in FilmCraft.

For an existing user's project use FilmCraft MCP, inspect first, and save a copy before changes using a discovered command. Avoid mixing headless CLI writes and live-app writes to the same project. If the desktop bridge is down, restore its connection before editing; do not kill or restart the user's editor or switch to a headless project.

Inspect the saved sequence, probe final video dimensions and duration, render first/middle/last and transition frames, and listen to exported audio. Automated probe checks do not prove visual quality or subtitle alignment. Keep QA status `needs-review` until those checks pass. Deliver the original editable project and assets, final MP4, SRT, and QA JSON. Do not export with offline-media allowance or claim success merely because an export command returned.
