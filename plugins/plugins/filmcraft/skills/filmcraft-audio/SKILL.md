---
name: filmcraft-audio
description: Edit music beds, dialogue balance, fades, room tone, sound effects and narration synchronization in FilmCraft. Use existing audio first; generation is a separate capability-dependent branch.
---

# FilmCraft Audio and Music Editing

Adapted from ChatCut's `audio-and-music.md`, `music/SKILL.md`, `music/references/song.md` and voice sync references; see [provenance](../../references/chatcut-adaptation/README.md). Follow the [shared contract](../../references/workflow-contract.md).

## Dialogue and music beds

Inspect the current tracks, roles, gain, routing, overlaps and program-audio source. Reuse suitable tracks; keep separate speakers and intentional layers separate. Place voice above music where practical. Never consolidate overlapping sources in a way that changes the mix.

ChatCut's anchor/follower roles automatically duck music; FilmCraft does not inherit those fields. Discover native ducking/automation capability and units. If supported, designate actual speech and background sources, keep a natural music base level and avoid double attenuation from both heavy clip-gain reduction and deep ducking. If unavailable, use verified manual gain/fade controls for the requested mix, clearly describing the difference; never claim automatic ducking. Short SFX/stingers are not ducked by default.

Fit BGM to the final real visual/speech end, excluding the music itself. Default start is sequence start unless specified. Trim longer music and fade it out. For shorter music, do not extend past source duration: tile with roughly one-to-two-second crossfades on compatible alternating tracks, calculate full coverage first and trim the last repeat. Use supported fade units, not seconds in a frame field. Music must not extend the render or obscure speech. Prefer unobtrusive instrumental beds for speech unless another treatment is requested.

Use local seam fades/room tone only where needed, with confirmed scope. Never remove contextual speech or breaths as an audio-cleanup shortcut. Listen across speech/music transitions and loops; check clipping, intelligibility, accidental doubled camera audio, holes and output length.

## Sound effects and new music

Place supplied/library SFX at observed editorial moments and check loudness. Check existing assets before generation. New music/song/SFX generation needs an advertised host capability; Nexts image/video/TTS tools do not establish a music or SFX generator.

For new music with unspecified vocals, resolve vocal song versus instrumental before submission. Explicit BGM/no-vocals already resolves it. For songs preserve supplied lyrics; draft original lyrics only when requested and honor review scope. Keep lyrics separate from stylistic direction. Generate one requested asset, track its job and inspect the actual audio before placement. Generation cannot guarantee exact beats or lyric timestamps. Never treat a new music generator as remix, separation or restoration of an existing recording.

## Narration alignment

Use [voice](../filmcraft-voice/SKILL.md) for new speech. Existing visuals require a map of observed visual windows, content anchors, assigned narration and actual audio durations. Segment by content changes, not equal intervals. Check every segment fits before placement; do not silently truncate words, stretch visuals or change factual wording to fit. Mark mappings stale after visual retiming and rebuild affected rows. Preserve meaningful original audio unless replacement is requested. Verify visual meaning, narration, captions and time range still agree after every retiming pass.
