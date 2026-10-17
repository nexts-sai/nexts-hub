---
name: filmcraft-voice
description: Create ElevenLabs narration through the Nexts backend and prepare timed subtitles for FilmCraft productions.
---

# Narration and subtitles

Before direct FilmCraft transcript or caption commands, follow [command discovery](../../references/commands.md). Query `command_list` for the exact command, parameters and availability; inspect the current project for object IDs before calling `command_run` or `command_batch`.

Read [provider adapters](../../references/providers.md). Call the Nexts host `generate_speech` tool with `text`, `model: elevenlabs-tts` and `language`. The host uses the current account session and saves audio locally; the backend chooses its configured ElevenLabs model and language voice. It currently ignores arbitrary voice IDs in this route. Do not ask for an ElevenLabs key or silently replace the provider. If the host tool is absent, update the Nexts host; a skill cannot create a missing tool.

Generate short narration segments per shot, retain MP3 output, then measure it with FilmCraft `probe`. Put the resulting path in the shot's `voice`. Allocate enough timeline frames for the whole voice file. The standalone `studio.mjs generate` adapter is only for an explicitly authenticated external runner; normal in-app use needs no token environment variables.

The existing Nexts ElevenLabs speech endpoint returns audio, not alignment. `transcribe_audio` can verify words but currently returns plain text, not timing. Do not fabricate word timestamps or label estimated captions as aligned. Obtain timestamped segments with an available ASR/forced-alignment tool, FilmCraft transcription, or manual listening. FilmCraft transcript commands require installed transcription models; discover their live schemas first. Otherwise create explicitly marked draft timings and leave `captionsReviewed: false` until checked.

Write `captions` as global integer frame intervals `{startFrame,endFrame,text}`. Split at natural phrase boundaries, use readable one/two-line captions, and check multilingual glyphs at the target resolution. Every interval must fit the final sequence and not overlap. Set `captionsReviewed: true` only after audio/timing review. Assembly generates UTF-8 SRT and imports an editable subtitle track; export burns subtitles into the video.

For Chinese captions on Windows, assembly selects Microsoft YaHei because FilmCraft's default font can miss individual Han glyphs. Override with a locally installed font family using production `captionFont` when needed. Review the generated preview at each caption midpoint and a frame extracted from the final MP4, not only the first/middle/last frame of the sequence.
