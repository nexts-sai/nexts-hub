---
name: gridcraft
description: Use GridCraft through its local desktop bridge for visible project inspection, editing, and export.
---

# GridCraft

Use the local GridCraft MCP included with this plugin. Before the first mutation, verify that the desktop app is open and the local bridge responds to a read-only inspection. Starting the app alone is not enough; inspect the current project and sequence/document first.

Discover available commands with the MCP command-list operation, then query the exact command schema and availability before each new operation. Inspect the returned project, document, slide, layer, sheet, artboard, or object IDs before editing. Never guess command names, parameters, or object IDs, and never silently fall back to a headless process when the bridge is unavailable. Ask the user to open GridCraft if the live bridge cannot be reached.

Keep the project visible in the desktop app during interactive work. Save or export to the current Nexts temporary workspace unless the user explicitly requests another location.
