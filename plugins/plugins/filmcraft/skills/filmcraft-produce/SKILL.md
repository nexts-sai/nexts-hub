---
name: filmcraft-produce
description: Coordinate a complete FilmCraft video production or resume an existing production, from brief and storyboard through generated assets, narration, captions and export.
---

# FilmCraft production

Use the user's language. This plugin orchestrates Nexts media generation and the installed FilmCraft editor; it does not include FilmCraft or vendor models.

Before the first FilmCraft command, choose the target: verify the desktop editor/bridge for an existing live project, or use the headless CLI for a new isolated temporary export. If a live project was requested and the editor is closed or unreachable, ask the user to open FilmCraft before editing.

1. Keep production content inside the current Nexts temporary workspace, outside this installed plugin. A task-specific subdirectory is optional; do not require or invent a fixed folder name. Put automatic production outputs beside `production.json` in `output/`, never Desktop or Downloads. Read [the production contract](../../references/production.md). Preserve existing projects and assets.
2. Use [storyboarding](../filmcraft-storyboard/SKILL.md) to turn the brief into a production JSON. Resolve material unknowns (subject, duration, destination); state reasonable defaults for optional style choices. Use the product-short mode initially; see [modes](../../references/modes.md) for expansion.
3. Run `node <plugin>/scripts/studio.mjs doctor` and inspect available host generation tools. Doctor's session flags describe only the optional standalone runner; missing environment variables do not block host tools. Generation defaults to the user's Nexts backend, not a separately chosen platform. Image/video use Auto capability routing; speech explicitly requests `elevenlabs-tts` and verifies the backend Voice selection.
4. Use [asset generation](../filmcraft-assets/SKILL.md), then [voice and captions](../filmcraft-voice/SKILL.md). Write each completed local path back into the production JSON. Preserve reference images across related shots.
5. Use [editing and export](../filmcraft-edit/SKILL.md). Before direct FilmCraft `command_run`/`command_batch`, follow [command discovery](../../references/commands.md): list available commands, read exact parameters, inspect object IDs, then execute. Do not guess commands from memory. Keep the editable `.fcproj`, final video, SRT and QA report in the workspace-local `output/` beside `production.json`, unless the user explicitly requests another location.

Resume from actual saved assets and job records. An ambiguous generation response is not a failed job: inspect/poll the existing task; never automatically submit again. The job journal is local production bookkeeping, not Nexts product/account state. Do not store tokens or provider keys in production files.

Do not claim cloud generation, account reuse, installation, caption accuracy or export verification without evidence. Report a missing host credential bridge as a dependency, not as missing model configuration. If working through Nexts Canvas, only prepare pending generation nodes; the user starts generation manually. Do not bypass that Canvas rule with these scripts.
