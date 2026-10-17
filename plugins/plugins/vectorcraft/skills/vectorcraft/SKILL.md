---
name: vectorcraft
description: Use VectorCraft through its local desktop bridge for visible project inspection, editing, and export.
---

# VectorCraft

Use the bundled `vectorcraft` MCP server included by this plugin's `.mcp.json`; do not register a duplicate standalone MCP. Call its tools by operation name: `doc_inspect`/`project_inspect` for read-only state, `command_list` for discovery, and `command_run` or `command_batch` for edits and export. Before the first mutation, confirm that VectorCraft is open and call a read-only inspection. Starting the app alone is not enough: inspect the current project and artboard/document first.

Call `command_list` with `enabled_only: true` before the first `command_run`, and again whenever the project state changes or a command fails. Read the exact command `id`, parameter schema, enabled state, and prerequisites; inspect live project, artboard, path, layer, and object IDs before editing. Use `command_batch` only for commands already discovered with known IDs and prerequisites. Never guess command names, parameters, coordinate units, or object IDs. If an enabled-only search is empty, retry discovery with `enabled_only: false` to distinguish disabled from missing. If the bridge is unavailable, ask the user to open VectorCraft and do not silently fall back to a headless process.

After every mutation, inspect the result and document state before continuing. After a timeout, inspect first because the edit may already have completed; never blindly retry. Keep the project visible in the desktop app during interactive work.

Keep the project visible in the desktop app during interactive work. Save or export to the current Nexts temporary workspace unless the user explicitly requests another location.
