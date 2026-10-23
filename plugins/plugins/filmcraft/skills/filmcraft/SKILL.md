---
name: filmcraft
description: Main entry point for the FilmCraft plugin. Use when the user selects or mentions FilmCraft, asks to edit or create a video with it, or continues a FilmCraft task. Infer the requested workflow and load the matching specialist skills without asking the user for skill names.
---

# FilmCraft

Translate the user's request into the appropriate FilmCraft workflow. Users name the app and describe the result; they do not need to know internal skill names. Respond in their language. Read only the specialist instructions needed for the current task, using the relative paths below.

## Select the workflow before selecting tools

1. Determine the requested action from the current message and relevant conversation context: plan, edit existing footage, create new content, add captions, narrate, export, or resume. An app mention alone does not authorize editing or generation.
2. Use supplied paths, attachments, existing project information and prior intent to identify the material. Do not classify a clip as talking-head solely from its filename. When inspecting media is necessary, first follow [FilmCraft editing](../filmcraft-edit/SKILL.md) for host-managed readiness, workspace resolution and read-only inspection; then choose the editorial specialist from actual evidence.
3. Apply the narrowest matching route below. Action-specific requests take precedence over the content category: an interview with an export-only request needs export, not a new interview edit. Explicit scope and an explicitly selected specialist take precedence over automatic classification.
4. Load the selected skill before performing its actions. Continue directly when the requested scope is clear. Ask a concise question only when a missing source, target, or materially different interpretation prevents correct work. Never ask the user which skill to use.

| User intent or observed material | Load | Scope |
|---|---|---|
| Existing presenter, tutorial, lecture, direct-to-camera speech; remove pauses, fillers, failed starts or retakes | [Talking-head editing](../filmcraft-talking-head/SKILL.md) | Speech cleanup first; captions and export only as requested. Do not generate a new voice or new footage. |
| Add, fix, style or synchronize subtitles on existing recorded speech; import an existing SRT | [Talking-head editing](../filmcraft-talking-head/SKILL.md), captions stage | Preserve cuts and speech; skip cleanup and new narration. Its caption-only branch also applies to recorded dialogue with multiple speakers. |
| Export, save, change delivery settings, or check an existing render | [Editing and export](../filmcraft-edit/SKILL.md) | Inspect the intended sequence and export status; preserve editing and captions. Do not run production/generation. |
| Multi-speaker interview, conversation or podcast requiring editorial changes | [Interview](../filmcraft-interview/SKILL.md) | Preserve speaker intent and continuity. If captions are requested, use the talking-head caption stage after dialogue timing is final. |
| Product demonstration or short product video | [Product short](../filmcraft-product-short/SKILL.md) | Use existing assets where supplied. Add production coordination only when creating missing content is requested. |
| Promotional edit, campaign, trailer or benefit-led advertisement | [Promo](../filmcraft-promo/SKILL.md) | Apply the requested promotional structure without inventing product claims. |
| Visual explanation with chapters, diagrams or process demonstrations | [Explainer](../filmcraft-explainer/SKILL.md) | Use this when visual explanation drives the structure. A request merely to clean a speaker explaining something uses talking-head editing. |
| Music-led montage, highlight reel or rhythmic assembly of clips | [Montage](../filmcraft-montage/SKILL.md) | Use the supplied clips/music and requested pace; do not route it to speech cleanup. |
| New video from a concept requiring coordinated storyboard, generated assets and narration | [Production](../filmcraft-produce/SKILL.md) | Coordinate only the requested production stages; absence of a source path alone is not permission to generate. |
| Storyboard, shot list or production plan only | [Storyboard](../filmcraft-storyboard/SKILL.md) | Plan only; do not start generation, editor mutations or export. |
| Generate or replace specific visual assets | [Assets](../filmcraft-assets/SKILL.md) | Limit generation to the requested assets and existing authorization. |
| Generate new narration or replace a voice | [Voice](../filmcraft-voice/SKILL.md) | New speech generation, not transcription of existing speech or subtitle-only work. |
| General timeline edit, trim, effect, project inspection or command diagnosis | [Editing](../filmcraft-edit/SKILL.md) | Discover current commands and act on the requested scope. |
| Continue a previous task | The specialist for its unfinished stage | Inspect actual saved project, assets and jobs. Use production coordination only for an existing multi-stage production; do not restart completed edits or submissions. |

For mixed requests, select one primary editorial route and load supporting stages only when needed. Finish speech timing before subtitles or timed overlays. A direct request such as “clean this presenter clip, add captions and export” is one end-to-end task; do not require the user to invoke three skills or approve the same scope repeatedly.

## Shared execution rules

- Before shell-based media inspection or Python/Node helpers, call Nexts `load_workspace_dependencies` with `{}`. Use its actual executable paths and distinguish managed, system and missing tools. Do not assume bundled Python includes FFmpeg/FFprobe, scan the disk for installations or install missing dependencies automatically. If this discovery tool is unavailable on an older host, use a bounded command lookup and report the source. This is auxiliary QA only; FilmCraft MCP remains the editing and export engine.
- Plan-only and skill-routing questions require no editor startup. Before any actual FilmCraft tool use, load and follow [FilmCraft editing](../filmcraft-edit/SKILL.md), including its referenced workspace and command guidance. The host owns readiness and the single visible MCP bridge; never create a second bridge or substitute headless CLI work for interactive editing.
- Keep working files in the verified active Nexts workspace and preserve source media and existing projects. Use the current tool catalog for command schemas and live inspection for ids; examples in skills are not executable commands by themselves.
- Existing footage does not require Nexts image/video generation or ElevenLabs setup. Do not turn subtitle correction into voice generation, or an export request into a new production.
- Respect preview-only requests, explicit review checkpoints and generation authorization. In Canvas, configure pending nodes only; the user starts model requests manually.
- Verify the resulting timeline and requested artifacts. Distinguish completed work from blocked, queued or unverified work. For ambiguous mutation/export responses, inspect before retrying.

## Routing examples

- “FilmCraft: clean up this recording and add subtitles” → talking-head cleanup, then captions; preserve meaning and natural breaths.
- “FilmCraft: only add subtitles to this interview” → captions-only; no interview recut and no generated narration.
- “FilmCraft: export the current timeline” → editing/export only.
- “FilmCraft: make a product ad from these clips” → product-short or promo with existing media; no implied generation.
- “FilmCraft: create a video from this concept, including new visuals and narration” → production coordinator and its requested stages.
- “FilmCraft: first tell me how you would edit it” → planning; no mutations.

These examples illustrate intent, not literal trigger strings. Interpret equivalent requests in any language. If only the app is selected and no task is given, ask what the user wants to make or change.
