---
name: filmcraft-produce
description: Coordinate a complete FilmCraft video production or resume an existing production, from brief and storyboard through generated assets, narration, captions and export.
---

# FilmCraft production

## Mandatory activation order

When this Skill is selected or the user mentions `@FilmCraft`, follow this order exactly:

1. Load `filmcraft-produce` and its referenced FilmCraft editing/workspace guidance before selecting any FilmCraft tool.
2. Ask the host to perform the FilmCraft readiness step: check `127.0.0.1:9876`; if it is not listening, start the visible `filmcraft.exe --control 9876`, wait for the control port, and start one MCP bridge session.
3. Only after readiness succeeds, call one read-only MCP inspection such as `ui_inspect`, `project_inspect`, or `doc_inspect`.
4. Continue with generation, command discovery, editing and export.

Never call a FilmCraft MCP tool as the first step, and never use an inspection tool as a startup probe. The startup/check step is host-managed and may not appear as a model-visible tool call; a disconnected bridge must stop the workflow until readiness succeeds.

Before creating any production files, follow [workspace resolution](../../references/production.md#resolve-the-actual-nexts-workspace-before-writing). Resolve the active Nexts workspace first; never substitute C:/temp or the OS temporary directory. Use explicit absolute MCP save/export paths inside that verified workspace.

Use the user's language. This plugin orchestrates Nexts media generation and the installed FilmCraft editor; it does not include FilmCraft or vendor models.

Read and follow the required execution transport in [FilmCraft editing](../filmcraft-edit/SKILL.md). Use the plugin's registered MCP tools for normal editing; Shell CLI commands are not an equivalent default.

Before the first FilmCraft command, choose the target. For a user-facing production, default to the visible FilmCraft desktop editor and its bridge so the project and timeline are visible while editing. The Nexts host checks the installed FilmCraft desktop companion, starts it once when needed, waits for its control port, and creates one `filmcraft-cli` MCP bridge session. Verify that session with a read-only inspection before mutations, then open or create the project through MCP and inspect it. If the bridge is unavailable, wait for the host startup result and report the concrete dependency; do not run Shell/PowerShell process checks or launch commands, create another MCP session, or start a second FilmCraft window. Use the headless CLI only when the user explicitly requests a silent/background/batch export or CLI execution. Starting the MCP process alone is not enough: a live project must be opened or created through the bridge and then inspected.

1. Keep production content inside the current Nexts temporary workspace, outside this installed plugin. A task-specific subdirectory is optional; do not require or invent a fixed folder name. Put automatic production outputs beside `production.json` in `output/`, never Desktop or Downloads. Read [the production contract](../../references/production.md). Preserve existing projects and assets.
2. Use [storyboarding](../filmcraft-storyboard/SKILL.md) to turn the brief into a production JSON. Resolve material unknowns (subject, duration, destination); state reasonable defaults for optional style choices. Use the product-short mode initially; see [modes](../../references/modes.md) for expansion.
3. Verify the FilmCraft MCP connection with a read-only inspection and inspect available host generation tools. Use `node <plugin>/scripts/studio.mjs doctor` only for diagnosing the optional standalone runner; it does not verify the live editor or MCP connection. Doctor's session flags describe only the optional standalone runner; missing environment variables do not block host tools. Generation defaults to the user's Nexts backend, not a separately chosen platform. Image/video use Auto capability routing; speech explicitly requests `elevenlabs-tts` and verifies the backend Voice selection.
4. Use [asset generation](../filmcraft-assets/SKILL.md), then [voice and captions](../filmcraft-voice/SKILL.md). Write each completed local path back into the production JSON. Preserve reference images across related shots.
5. Use [editing and export](../filmcraft-edit/SKILL.md). Before direct FilmCraft `command_run`/`command_batch`, follow [command discovery](../../references/commands.md): list available commands, read exact parameters, inspect object IDs, then execute. Do not guess commands from memory. Keep the editable `.fcproj`, final video, SRT and QA report in the workspace-local `output/` beside `production.json`, unless the user explicitly requests another location.

Resume from actual saved assets and job records. An ambiguous generation response is not a failed job: inspect/poll the existing task; never automatically submit again. The job journal is local production bookkeeping, not Nexts product/account state. Do not store tokens or provider keys in production files.

Do not claim cloud generation, account reuse, installation, caption accuracy or export verification without evidence. Report a missing host credential bridge as a dependency, not as missing model configuration. If working through Nexts Canvas, only prepare pending generation nodes; the user starts generation manually. Do not bypass that Canvas rule with these scripts.
