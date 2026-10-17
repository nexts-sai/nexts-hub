---
name: filmcraft-assets
description: Generate and track image and video assets for FilmCraft using Nexts configured media routing, or adopt user-provided local assets.
---

# Assets

Read [provider adapters](../../references/providers.md). Prefer Nexts host `generate_image` and `generate_video` tools, which use the current session and configured media models. Do not substitute Codex image generation or another platform when the user requested Nexts backend routing.

For each shot: create the key image, inspect it, then pass its returned local path as `reference_images` when generating the shot video. Only use fields exposed by the tool. Record the final local paths in `image` and `video`. If using the standalone authenticated adapter, use `model: auto` so Image and Video routes remain owned by the backend. Do not hard-code model names from a screenshot or copy backend provider keys.

`studio.mjs generate <production-dir> <job-id> <request.json>` submits once and records a durable receipt. For asynchronous video, use `studio.mjs poll <production-dir> <job-id>` until complete; each invocation performs one read-only poll. The result file is saved locally after completion. Unknown/submitting states require reconciliation, not a new job ID retry. Read-only polling may be repeated after network failures.

Check actual dimensions/duration with FilmCraft `probe`. A model may not honor duration/aspect instructions. Short clips require an explicit edit decision, regeneration, or changing the plan; never silently fill a missing shot with black frames. A still-image animation is an optional editing fallback, not AI video generation.
