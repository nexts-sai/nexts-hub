---
name: widget-forms
description: Collect ChatCut editing choices using the question and media capabilities available in Nexts.
---

Nexts host: read the bundled `chatcut-plugin-basics` skill first. Tool examples below describe ChatCut operations; use discovered schemas. Internal ChatCut widgets/tags are not Nexts controls; use `widget-forms` for supported choices.


# ChatCut choices in Nexts

Use a supported Nexts question/form tool if present, otherwise ask a short ordinary chat question and wait for the answer. Preserve stable option IDs from tool results and map translated visible labels back to those IDs. Never assume ChatCut MCP forms, raw custom tags, or Codex widgets render in Nexts.

For voice or visual choices, show the returned media using a supported preview, or supply a descriptive link. Do not claim playback or visual verification without inspecting the media. Keep pending selections as questions; do not submit a generation request merely to show alternatives.

For uploads use the bundled asset-import skill and return the actual imported assetId, never a local path as an asset ID. Voice cloning and avatar consent must use ChatCut's supported editor flow; never render internal clone-voice or avatar tags as functional Nexts controls.
