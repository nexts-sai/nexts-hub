# Discover before executing FilmCraft commands

Apply this protocol before direct MCP `command_run` or `command_batch` calls. Examples and remembered command names are search hints, not an authoritative command catalog.

## Check the editor before the first command

First decide whether the task targets the user's open FilmCraft project or a new isolated headless project:

- For a live project, verify that FilmCraft is open and its MCP/bridge is reachable with a read-only inspection (`doc_inspect`, `project_inspect`, or `sequence_inspect`). If the bridge is unavailable, stop and tell the user to open FilmCraft; do not send live editing commands to an unknown target.
- For a new isolated export, FilmCraft does not need to be open. Use the bundled `studio.mjs`/FilmCraft CLI with its own new `.fcproj` output in the system temporary FilmCraft directory. Do not mix that headless project with the user's open project.
- Do not assume that an installed FilmCraft CLI means the desktop editor is open. Do not kill, restart, or silently launch the user's editor to recover a missing bridge.

1. At the start of an editing session, call `command_list` with `enabled_only: true` to see what can run in the current editor state. For a specific operation, narrow discovery with `filter`, such as `captions`, `timeline`, or `export`.
2. Before using a command for the first time in this session, read its exact `id`, `params`, and `enabled` from `command_list`. If a filtered enabled-only search returns nothing, repeat with `enabled_only: false` to distinguish a missing command from a disabled one. Broaden the filter if needed. Do not invent a command name or parameter.
3. Get project, sequence, track, clip, item, and caption IDs from `doc_inspect`, `project_inspect`, `sequence_inspect`, or a prior successful command result. Never substitute an asset ID for a timeline clip ID. Check the returned parameter documentation for accepted time units; use `seconds`, `frame`, or `timecode` only where documented.
4. If the command is disabled, inspect the current state and satisfy its prerequisites (for example opening/creating a sequence or selecting the intended clip), then query again. Do not attempt disabled commands or guess a sequence of mutations to make them work.
5. Call `command_run` using the discovered ID and documented JSON parameters. Reuse the schema for repeated operations in the same session, but refresh availability after project/sequence/selection changes when it depends on that state. For `command_batch`, discover every command first and ensure each step's prerequisites and object IDs are known; split the batch at steps that create IDs or require inspection.
6. Inspect the result and resulting document/sequence before reporting success. For unknown-command, invalid-parameter, missing-object, or disabled-command errors, stop guessing: refresh the relevant command list and state, then correct the call. For a transport timeout or lost response, inspect state/history first; the edit may already have executed. Never blindly repeat a possibly completed edit or export.

## CLI equivalent

For direct CLI edits, discover with `filmcraft-cli commands <filter> --json`, then `filmcraft-cli describe <id>` for the selected command. Include the same `--project <path>` or `--bridge <address>` context used for execution when checking availability. An empty headless project and the live app have different enabled commands. Inspect the target project for object IDs before `exec`.

The packaged `studio.mjs assemble` is a tested deterministic adapter with explicit command IDs. It does not require the agent to rediscover every internal command on each run. If the installed FilmCraft version or a command contract changes, use discovery to repair the adapter and verify a new isolated export before reusing it. Do not work around its errors by improvising command names.
