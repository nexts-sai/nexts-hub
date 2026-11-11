---
name: filmcraft
description: Main entry point for the FilmCraft plugin. Use when the user selects or mentions FilmCraft, asks to edit or create a video with it, or continues a FilmCraft task. Infer the requested workflow and load the matching specialist skills without asking the user for skill names.
---

# FilmCraft

Translate the user's request into the appropriate FilmCraft workflow. Users name the app and describe the result; they do not need to know internal skill names. Respond in their language. Read only the specialist instructions needed for the current task, using the relative paths below.

For a concrete request, first load its specialist instructions, before writing a plan or asking intake questions. A general plan does not need a project path. For example, “redo narration for an already edited product demonstration, synchronized to each step; plan only” loads `filmcraft-voice` and `filmcraft-audio`, then plans from observed visual windows and measured generated audio duration. It does not ask for the project before giving the requested general plan. Word counts are drafting estimates, not synchronization evidence, and overlong speech must not be cut mid-sentence to fit.

## Select the workflow before selecting tools

1. Determine the requested action from the current message and relevant conversation context: plan, edit existing footage, create new content, add captions, narrate, export, or resume. An app mention alone does not authorize editing or generation.
2. Use supplied paths, attachments, existing project information and prior intent to identify the material. Do not classify a clip as talking-head solely from its filename. When inspecting media is necessary, first follow [FilmCraft editing](../filmcraft-edit/SKILL.md) for host-managed readiness, workspace resolution and read-only inspection; then choose the editorial specialist from actual evidence.
3. Apply the narrowest matching route below. Action-specific requests take precedence over the content category: an interview with an export-only request needs export, not a new interview edit. Explicit scope and an explicitly selected specialist take precedence over automatic classification.
4. Load the selected specialist with Nexts `load_skill` using its exact folder name (for example, `filmcraft-captions`) before answering or acting. This also applies to planning: reading instructions is not opening the editor or reading user footage. Prefer this host loader over guessing installed filesystem paths. If the loader is unavailable, use the indexed skill location. Do not claim a specialist was loaded without a successful read.
5. Continue directly when the requested scope is clear. For a general plan without media, describe conditional prerequisites instead of blocking the plan on source paths, speaker counts or preferences. Ask only when a missing fact prevents the current requested work. Never ask the user which skill to use. Do not invent default durations, crops, additional effects or mandatory approval checkpoints absent from the user's request and the selected specialist.

| User intent or observed material | Load | Scope |
|---|---|---|
| Import local originals or relink missing media only | [Asset import](../filmcraft-import/SKILL.md) | Preserve existing asset references; no automatic editing. |
| Transcribe or repair source transcript only | [Transcription](../filmcraft-transcription/SKILL.md) | Establish actual timing and readiness; no automatic captions or speech cuts. |
| Reorder speech by topic, question, chronology, conclusion-first structure or a target script | [Story editing](../filmcraft-story-edit/SKILL.md) | Move complete semantic units; do not assume short duration or new narration. |
| Align same-session cameras/recorders or switch to the speaker | [Multicam](../filmcraft-multicam/SKILL.md) | Preserve a synced master; sync-only excludes the speaker-follow cut. |
| Add cutaways, illustrate speech, cover jump cuts or place PiP | [B-roll](../filmcraft-broll/SKILL.md) | Protect source information, A-roll subjects and captions. |
| Mix dialogue/music, fit a music bed, fade/duck audio, place SFX or maintain narration sync | [Audio](../filmcraft-audio/SKILL.md) | Use existing audio and real routing capabilities; generation is separate. |
| Add titles, lower thirds, quotes, diagrams, statistics or chapter graphics | [Motion graphics](../filmcraft-motion/SKILL.md) | Use native editable graphics; inspect the actual composed frame. |
| Add a transition, mask, zoom/reframe, filter, LUT or color grade | [Effects and color](../filmcraft-effects/SKILL.md) | Catalog/native capability first; preserve the requested clip/range scope. |
| Inspect whether an edit/export is actually correct | [Verification](../filmcraft-verify/SKILL.md) | Readback plus relevant pixels/audio; no unsolicited recut. |
| Long speech-led footage into highlights, topic excerpts, a shorter complete version or multiple independently editable shorts | [Long video to shorts](../filmcraft-shorts/SKILL.md) | Select complete meaningful passages before tools; preserve the original sequence. This route takes precedence over generic interview or montage for speech-content extraction. Add captions through the caption specialist only when requested. |
| Existing presenter, tutorial, lecture, direct-to-camera speech; remove pauses, fillers, failed starts or retakes | [Talking-head editing](../filmcraft-talking-head/SKILL.md) | Speech cleanup first; captions and export only as requested. Do not generate a new voice or new footage. |
| Add, fix, translate, style or synchronize subtitles; import or export an SRT; subtitle-only or bilingual requests | [Captions](../filmcraft-captions/SKILL.md) | Preserve cuts and speech; skip cleanup and new narration. This action-specific route also applies to interviews and long videos without extracting shorts. |
| Export, save, change delivery settings, or check an existing render | [Export and delivery](../filmcraft-export/SKILL.md) | Inspect the intended sequence and export status; preserve editing and captions. Do not run production/generation. |
| Multi-speaker interview, conversation or podcast requiring editorial changes | [Interview](../filmcraft-interview/SKILL.md) | Preserve speaker intent and continuity. If captions are requested, use the caption specialist after dialogue timing is final. Use shorts instead when the requested outcome is extracted short versions. |
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

For the full classification and source mapping, read [editing techniques](../../references/editing-techniques.md). Action-specific rows take priority; broad genres compose only the requested techniques.

For mixed requests, select one primary editorial route and load supporting stages only when needed. Finish speech timing before subtitles or timed overlays. A direct request such as “clean this presenter clip, add captions and export” is one end-to-end task; do not require the user to invoke three skills or approve the same scope repeatedly.

Read the [shared execution contract](../../references/workflow-contract.md) for stage continuation, dependency discovery, timing and recovery. Do not end an authorized workflow at a pending job or after the first completed stage.

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
- “FilmCraft: turn this lecture into three short clips with subtitles” → shorts, then captions on each final sequence; no fabricated timestamps.
- “FilmCraft: translate this long video's subtitles into English” → captions; no short-version extraction or new voice.
- “FilmCraft: extract the strongest answers from this podcast” → shorts; not music-led montage.
- “FilmCraft: reorder this interview by topic, switch between the two cameras and add subtitles” → multicam alignment, story content plan, derived angle edit, captions, verification.
- “FilmCraft: add this music and a title, keep every speech cut” → audio and motion; no speech cleanup.
- “FilmCraft: export the current timeline” → editing/export only.
- “FilmCraft: make a product ad from these clips” → product-short or promo with existing media; no implied generation.
- “FilmCraft: create a video from this concept, including new visuals and narration” → production coordinator and its requested stages.
- “FilmCraft: first tell me how you would edit it” → planning; no mutations.

These examples illustrate intent, not literal trigger strings. Interpret equivalent requests in any language. If only the app is selected and no task is given, ask what the user wants to make or change.
