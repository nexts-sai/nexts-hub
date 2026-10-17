---
name: filmcraft-storyboard
description: Write timed scripts and shot plans for FilmCraft videos, including product shorts, explainers and narrative clips.
---

# Storyboard

Read [production JSON](../../references/production.md) and the relevant [mode](../../references/modes.md). Copy [the example](../../templates/product-short.json) into the user's production directory and replace its content.

Define audience, message, aspect ratio, target duration, visual continuity, narration language and delivery format. For each shot provide a stable ID, image prompt, motion prompt, narration and integer timeline frames. Keep the image prompt about appearance and the video prompt about action/camera movement. Carry subject identity, palette and lighting between shots.

Durations are initially estimates. Measure the generated narration, then revise frames and caption timings before assembly. Do not speed up speech or cut the last syllable just to fit the initial estimate. Use brief opening context, one clear point per shot and an ending suited to the user's request. Avoid adding marketing claims not supplied by the user.

An empty asset path means generation is pending, not a valid placeholder for export. Run `node <plugin>/scripts/studio.mjs validate <production.json>` after filling paths and captions.
