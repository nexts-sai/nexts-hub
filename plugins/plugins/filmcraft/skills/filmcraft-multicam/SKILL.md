---
name: filmcraft-multicam
description: Synchronize same-session cameras and separate recorders in FilmCraft, preserve a synced master, and build a speaker-follow edit unless the request is sync-only.
---

# FilmCraft Multicam and Speaker-follow Editing

Adapted from ChatCut `multicam-sync/SKILL.md` and `references/multicam.md`, including its deterministic transcript-offset helper. See [provenance](../../references/chatcut-adaptation/README.md). Follow the [shared contract](../../references/workflow-contract.md).

## Discover and synchronize

- Read all relevant timestamped source transcripts and metadata. Shared phrases at the same event suggest simultaneous sources; non-overlapping adjacent spans may be one camera restarting. Corroborate with actual footage and metadata: repeated scripted phrases alone cannot prove simultaneity. Video sources are angles; audio-only sources are recorders. Report uncertain groupings without guessing.
- Choose a continuous, richly transcribed reference, usually a dedicated recorder. Preserve any existing edit. Discover ordinary independent sequence/track creation and build a separate synced master; do not invent a multicam object or duplicate command.
- If a real native sync operation exists, inspect its method, confidence and resulting placements; reject skipped or poorly supported matches. Otherwise run [transcript-offset.mjs](scripts/transcript-offset.mjs) with the discovered Node executable and verified timestamped utterances. Run `--help` for input schema. Input start/end values are milliseconds in each source's own clock; never create them from plain text. Use actual fps, not a guessed default.
- The helper calculates referenceTime = sourceTime + offsetSeconds. It rejects insufficient pairs, inconsistency and early/late drift. Only confident results are placement candidates, still requiring audiovisual checks. Shift all sources by one common origin; round placement to frames once and floor source tails. Do not time-stretch automatically.
- Check early/middle/late alignment and span continuity. An unexpected gap/overlap between spans believed continuous needs investigation; do not trim to conceal a bad offset. Confirm whether the camera actually stopped recording. A cut reference cannot align one long alternate-angle segment across all its cuts: map/split by retained passage.

## Identify sources and choose program audio

Inspect matching moments from every angle, including isolated speech and introductions. Use evidenced names or neutral speaker labels. Track labels summarize framing, not a promise every interval shows that person. Mic ownership needs measured same-track solo-speaker level contrast across multiple moments; transcript counts and inter-recorder gain differences are not evidence. Keep uncertain labels explicit.

Use the user's program-audio choice; otherwise compare intelligibility, noise, clipping and reverb. Prefer good dedicated recorders or one coherent camera source. Avoid stacking camera microphones. Record per-source offset, method, match count/spread/drift, identity evidence and program-audio assignment.

## Build the edit from the master

Sync-only ends with the verified master. Otherwise make a separate speaker-follow sequence, preserving the master. Build a conversation document and angle plan from shared wall-clock ranges before placing cuts. For content shortening or restructuring, combine [talking-head](../filmcraft-talking-head/SKILL.md), [story editing](../filmcraft-story-edit/SKILL.md) or [shorts](../filmcraft-shorts/SKILL.md); keep identical retained ranges on picture and program audio.

Let meaning motivate angles: speaker for originating information, listener only for a real reaction at that same moment, wider views for relationships, new topics or shared laughter. Do not chase sub-two-second interjections. Roughly 4–10 seconds is a useful conversational shot range, not a timer; hold longer while performance develops. Use truthful 1.5–3-second reactions and 2–5-second orienting wides when suitable. Inspect the exact chosen interval, not just its angle label. Same-angle camera restarts are joins, not editorial cuts.

Use ordinary editable picture segments and continuous program audio. Mute redundant camera audio. Never borrow a reaction from a different moment or invent/freeze picture for an uncovered audio tail. Surface missing picture before final delivery.

## Prove sync last

After all edits and UI interactions, reread positions, durations and source offsets. On the master, timelineTime - sourceTime equals that source's master offset. Within each retained passage, cutTime - (sourceTime + masterOffset) must agree for picture and all program audio within one frame. Different reordered passages may have different displacements. Print actual checked values and sample beginning/middle/end audiovisual sync. Fixing position alone does not restore a disturbed duration/source offset. Report cut count, shot-length distribution and unresolved evidence; metadata alone cannot prove lip sync.
