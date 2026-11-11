---
name: filmcraft-shorts
description: Turn long speech-led footage into independently understandable highlights, short versions or multiple editable shorts in FilmCraft. Use for lectures, interviews, podcasts and presenter clips; captions-only, simple cleanup and music-led montages use their own workflows.
---

# FilmCraft Long Video to Shorts

Adapted from the original ChatCut `talking-head-guide` reference **Other A-roll Editing Scenarios**, specifically highlight extraction, restructure, hook/short version, target-script alignment and building versions. The public repository does not contain a standalone `long-video-to-shorts/SKILL.md` at the pinned commit. See [original snapshots and adaptation mapping](../../references/chatcut-adaptation/README.md); this is an extraction and FilmCraft adaptation of those original branches.

Read [FilmCraft editing](../filmcraft-edit/SKILL.md), including command discovery and workspace rules, before tool use. The host manages the visible editor and single bridge. Read the [talking-head timing and speech-editing rules](../filmcraft-talking-head/SKILL.md) before any speech cut; load only its timing/cleanup/export stages needed here. Do not restart its full workflow for every short.

## Choose content before choosing tools

1. Identify the source and requested outcome: highlights, a shorter complete version, topic-specific excerpts, a target script, or several separately editable/exportable shorts. A short product ad or music-led montage is not this speech workflow.
2. Use the user's criterion: opinion, conclusion, story, emotion, conflict, tutorial step, data or topic. For an open request for the best moments, prioritize information density and expressive strength. Infer choices already supplied; ask only for a material missing constraint. Do not invent a mandatory clip count, platform or duration from the word "shorts".
3. Inspect the full relevant transcript, source and current edit, not only keyword matches or the opening. Every selected short must make sense alone. Keep the subject, question, setup and conclusion needed to understand it. A punchy line is not enough when its context changes the meaning.
4. For a short version, preserve the problem, main point, necessary reasons and conclusion. Remove optional examples, repetitions or setup before damaging the main line. If the requested duration conflicts with complete meaning, explain the tradeoff instead of cutting a sentence to hit a number.
5. Prefer a hook already spoken in the source: a claim, result, conflict, question or counterintuitive/emotional moment. Generated narration and hooks are a separate scope decision, not an automatic fallback. Major restructuring needs an agreed direction if the user has not specified one.
6. For a supplied target script, choose complete natural takes matching its meaning and order, without dragging in unrelated segment heads/tails. Reorder complete sentences, answers or ideas; never splice unfinished retakes into a synthetic sentence. After moving content, check connective words and referents still make sense.

## Establish trustworthy boundaries

Require actual timestamped transcription/forced alignment for the exact source and a verified mapping to the current sequence. Record provenance even when timestamps already exist. Plain-text transcription, RMS, silence detection and estimated word durations are not word alignment. If alignment is missing, a content-only shortlist may still be useful; label it as untimed, preserve the source, and do not cut or claim synchronized subtitles.

Create a compact local edit manifest with each proposed short's title, topic, actual opening/closing words, source identity, verified ranges, target sequence id once created, requested duration/aspect ratio and completion stage. Explain selections to the user with spoken content, not internal word/clip ids. Keep the manifest as task notes, not a second host database.

## Build independent versions using FilmCraft

1. Save a new recoverable working project at an absolute workspace path with an existing parent. Preserve the source sequence and original media. Inspect current project/sequence state before each mutation group to detect concurrent writers.
2. ChatCut uses `read_script`/`timeline.md`/`apply_script` and duplicates timelines for independent versions. FilmCraft must use its own discovered sequence-copy/create and transcript-aware editing capabilities. Never send those ChatCut commands, invent a `sequence.duplicate` signature, or substitute FFmpeg cuts/handwritten project JSON when the editor operation is unavailable.
3. For each independently editable short, discover a supported way to copy the intended sequence or create a sequence from the original imported source. Verify the new sequence id, source, linked audio/video, settings and transcript mapping before removing anything. If the source sequence is already trimmed, omitted source content must come from the verified original source, not invented text or extrapolated times. Stop that version if independent sequence creation or reliable transcript mapping is unavailable.
4. Work from the transcript-content selection. Prefer supported transcript-aware edits; use current returned word addresses and re-read after each structural change. Physical edits require explicit verified boundaries, source mapping and linked A/V behavior under the talking-head rules; they are not a fallback for missing transcript capability. Do not mutate the original sequence while constructing a requested independent version.
5. Retain complete meaningful units, remove unrelated material and clean obvious defects in retained passages conservatively. Reacquire ids after edits. Check sentence continuity, questions/answers, connectors, breathing room and audio transitions. Do not blindly replay a partially completed batch.
6. Verify every version end to end: all requested sentences present, correct order, no unintended duplicates or extra source content. Intentional overlap between different shorts is allowed when each needs the context; accidental duplication inside one short is not.

## Finish and deliver only requested stages

- Finalize speech timing first. When subtitles are requested, use [FilmCraft Captions](../filmcraft-captions/SKILL.md) separately on each final sequence. Never reuse absolute times from the long source as if they were short-sequence times, and do not carry stale pre-cut captions into delivery.
- Change aspect ratio only when requested or established by the destination. Discover framing controls, preserve the subject and check captions in actual composed frames; "short" alone is not permission to crop to 9:16. Do not promise automatic subject tracking without an available verified capability.
- An edit/preview request can end with editable sequences. For requested files, follow the talking-head save/export stage separately for each short: unique absolute paths, correct explicit and active sequence, requested captions, recorded job id, terminal success and artifact checks. Each output needs its own status; one completed render does not prove the other shorts completed.
- Before resuming, read the manifest and actual project, transcripts, captions and jobs. Reuse verified completed versions and exports; continue the first incomplete stage. When export status is ambiguous, inspect before resubmitting. Stop mutations on an unexpected project switch or concurrent writer.
- Deliver each completed short with title, actual duration, artifact/project link and verification status. Identify missing versions or blocked capabilities. State audio/visual checks not performed; source-frame inspection does not prove the composed timeline or exported file is correct.
