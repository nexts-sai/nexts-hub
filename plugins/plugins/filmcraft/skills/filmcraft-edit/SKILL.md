---
name: filmcraft-edit
description: Assemble, inspect and export FilmCraft timelines; discover available commands and parameters before command_run or command_batch, and diagnose command errors.
---

# FilmCraft editing

Read [production contract](../../references/production.md). FilmCraft CLI 0.7.2 was used to verify this adapter. Discover commands again for a different version. The Hub already has a FilmCraft MCP entry; do not register a duplicate.

Before direct `command_run` or `command_batch`, read and follow [command discovery](../../references/commands.md). Start with `command_list(enabled_only: true)`; query the operation's exact ID, parameter schema and current availability before its first execution. Use inspection results for object IDs. Never guess command names or parameter keys. Refresh discovery and state after command errors; inspect whether a timed-out edit already happened before retrying.

Before the first FilmCraft command, determine the execution target. Default to the visible live editor for user-facing work: verify FilmCraft is open, verify the bridge with a read-only inspection, and open or create the target project through the bridge before editing. If the editor is closed or unreachable, ask the user to open it; do not silently fall back to headless mode. Use the headless CLI only for an explicitly requested silent/background/batch export or an explicitly isolated render, which does not require the desktop editor to be open. Never mix live bridge edits with headless CLI writes.

For an explicitly requested isolated/headless montage, run `node <plugin>/scripts/studio.mjs assemble <production.json>` and let the adapter create `output/` beside `production.json` in the current Nexts temporary workspace. Do not require a fixed production folder name. Pass an output directory only when the user explicitly requests one; never choose Desktop or Downloads by default. It validates all files first, imports the assets, places shots on V1 and narration on A1, imports SRT, saves a project and exports H.264 with burnt captions. The output directory must not already exist. Re-running into a new directory never re-submits generation. For the default visible workflow, perform the equivalent imports, timeline edits and export through the discovered live bridge commands so the project remains visible in FilmCraft.

For an existing user's project use FilmCraft MCP, inspect first, and save a copy before changes using a discovered command. Avoid mixing headless CLI writes and live-app writes to the same project. If the desktop bridge is down, the headless CLI can still create a separate project; do not kill or restart the user's editor.

Inspect the saved sequence, probe final video dimensions and duration, render first/middle/last and transition frames, and listen to exported audio. Automated probe checks do not prove visual quality or subtitle alignment. Keep QA status `needs-review` until those checks pass. Deliver the original editable project and assets, final MP4, SRT, and QA JSON. Do not export with offline-media allowance or claim success merely because an export command returned.
