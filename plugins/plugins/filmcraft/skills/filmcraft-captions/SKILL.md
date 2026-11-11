---
name: filmcraft-captions
description: Add, correct, translate, import, style or export editable subtitles in FilmCraft. Use for captions-only requests and after the final cut in speech workflows; preserve the footage and speech unless editing is explicitly requested.
---

# FilmCraft Captions

Adapted from ChatCut's original caption guide, not from its marketing page. The fixed source, original snapshot, license and section mapping are in [source adaptation](../../references/chatcut-adaptation/README.md). The instructions below replace ChatCut-specific APIs with FilmCraft capability discovery.

Read [FilmCraft editing](../filmcraft-edit/SKILL.md) and its command/workspace references before tools. The host owns the visible editor and bridge. Use `load_workspace_dependencies` before auxiliary Python/media commands; missing dependencies do not authorize installation. Use the [speech command reference](../filmcraft-talking-head/references/filmcraft-workflow.md) as discovery hints, not executable schemas.

## Establish the source and scope

1. Inspect the intended project, sequence and existing caption tracks. Import a supplied source only if absent. Caption-only work preserves media cuts, speech, duration and existing unrelated tracks. Removing filler text is not removing spoken filler; route an explicit speech-cleanup request to [talking-head editing](../filmcraft-talking-head/SKILL.md) first.
2. Distinguish source transcription, subtitle creation, display correction, style-only, translation and subtitle-file export. Ask only for a missing target language, target track or other choice that prevents correct work. Preserve current styling unless a change is requested. Do not require generation accounts or narration.
3. For an existing track or supplied SRT, inspect its ordered entries and source/sequence association. Styling or wording corrections can preserve existing times without new ASR; do not claim that preserved timing has been verified. If a supplied SRT is invalid or for a different cut, report the mismatch before importing it.
4. New speech-synchronized captions require actual timestamped ASR or a verified source-to-final-sequence mapping. Check transcript/model readiness and the relevant job. No-audio/no-speech is a usable source without dialogue captions, not a reason to retry indefinitely. Pending is not failure; follow job status and check-back guidance. Report an explicit failure or unavailable model.
5. Plain-text `transcribe_audio`, evenly spaced text, RMS, silence boundaries and mouth screenshots do not establish word timing. Never manufacture `transcript.set` times. Without verified timing, preserve footage and existing timing, complete independent requested work and explain the missing alignment capability.

## Create or correct editable captions

1. Save a recoverable working project before mutations. Read `captions.list` and the current sequence. Use ids returned now; refresh after any operation that splits, merges, recreates or resegments captions. Do not reuse stale ids.
2. Discover current commands for the operation. For no existing target track, use `transcript.createCaptions` only after final-cut alignment is ready, or `captions.import` for the user's validated timed subtitle file. Do not create another track on retry. Existing caption work uses supported `captions.setText`, `captions.setTimes` and `captions.setStyle` operations with their discovered scope.
3. Keep caption display corrections separate from source transcription. Do not alter the source transcript to change wording, line breaks, segmentation or caption boundaries. Correct an ASR-misheard source word only when the recording supports that correction and the command preserves valid alignment.
4. Prefer meaningful phrase boundaries. Font size and box geometry are not segmentation controls. If FilmCraft exposes resegmentation or merge/split commands, inspect the resulting entries and reacquire ids. Do not assume ChatCut's Card, revision or pacing APIs exist here.
5. Keep captions editable in the project. An ordinary subtitle request does not imply MP4 export, a new voice, music or a speech recut. Export only when requested as a deliverable or part of an authorized end-to-end task.

## Style and optional emphasis

- Preserve the original guide's preset-first approach when FilmCraft exposes real suitable presets: discover and use the closest one, then change only requested properties. Never invent preset names or pass ChatCut CSS/`captionStyle`/`activeStyle` fields to FilmCraft. When no preset capability is exposed, use documented style fields and an available font instead.
- Distinguish track-wide, one-caption and exact-span requests. A request to enlarge one word must not enlarge the entire track. Discover the appropriate scope; if FilmCraft cannot represent it, explain that specific limitation and preserve the existing style. Do not assert unsupported capability merely from memory.
- Emphasis is opt-in. Read the complete caption sequence, choose content that adds distinct meaning, and emphasize the smallest truthful contiguous phrase. Preserve negation, conditions, uncertainty, units, necessary referents and both sides of a contrast. Avoid highlighting every repeated keyword. Resolve repeated occurrences from actual ids/times.
- Emphasis must not silently change text, timing, segmentation, line breaks or layout. Inspect readback and actual composed pixels. Do not interrupt an end-to-end task with an optional styling question; an optional follow-up belongs after the requested delivery.

## Translation and bilingual captions

Translate only when requested. Confirm the target language if missing, retain source meaning, names, numbers, negation and units, and use supported separate tracks or bilingual layout. Reuse already existing target-language captions when appropriate. Preserve verified timings; review text coverage again after segmentation changes. Discover translation/import/style capabilities rather than issuing ChatCut `edit_captions translate` or `set_sources`. If no native translation command exists, prepare a translated subtitle file from verified entries only when requested scope and import support permit it; do not invent alignment or overwrite the original language. This is caption translation, not dubbing or lip synchronization.

## Verify, export and resume

Read back entry text, positive durations, ordering, overlaps, language coverage and final sequence bounds. Inspect composed frames at the beginning, longest lines, representative style changes and ending for glyphs, wrapping, clipping and subject obstruction. A successful render response without viewing its pixels is not visual verification. Check audio alignment when playback is available; otherwise explicitly mark it unverified.

For requested SRT export, inspect the active sequence and track before `captions.export`; read the resulting file to confirm the correct language, wording and timing. For requested captioned MP4, use the [save/export stage](../filmcraft-talking-head/SKILL.md#3-save-export-and-deliver): absolute workspace paths with existing parents, explicit sequence and caption behavior, completed job, nonempty artifact and media checks. Do not apply the caption-creation stage again when loading that export reference.

After partial failure or interruption, inspect captions, sequence and jobs before continuing. Preserve completed work and manual edits. If another writer changes the project, pause mutations. Report completed, blocked and unverified parts separately; do not label queued exports or unverified alignment as finished.
