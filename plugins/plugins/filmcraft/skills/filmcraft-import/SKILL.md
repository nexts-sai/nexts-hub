---
name: filmcraft-import
description: Import explicit local media or relink missing sources in FilmCraft while preserving asset identity and existing timeline references.
---

# FilmCraft Asset Import

Adapted from ChatCut `asset-import/SKILL.md`; see [provenance](../../references/chatcut-adaptation/README.md). Follow the [shared contract](../../references/workflow-contract.md).

- Confirm readable source paths from the user's attachments or workspace. An attachment card is not a filesystem path. Inspect the library before importing material that may already exist.
- Use the actual FilmCraft local import tool with absolute paths. Batch only within its advertised limits, inspect every returned result and record path-to-asset ids. An asset in the library is not proof of timeline placement or transcript readiness.
- On partial failure or timeout, inspect the library and import state first; retry only missing/failed files. Never invent ids or duplicate successful imports to recover one failure.
- For relinking, identify the existing missing asset and corresponding original file. Discover a supported relink operation that preserves existing timeline references, source offsets and transcript identity. Verify media type/duration and downstream references. Do not replace a failed relink with a new unrelated asset.
- Import original sources, not an FFmpeg-flattened replacement for the requested edit. ChatCut's loopback upload server, cloud import sessions and browser tokens are not needed for local FilmCraft and must not be started or copied.
- Return imported asset ids, readiness and specific failed paths. Continue [transcription](../filmcraft-transcription/SKILL.md) only when the task needs speech analysis; importing alone does not authorize editing or export.
