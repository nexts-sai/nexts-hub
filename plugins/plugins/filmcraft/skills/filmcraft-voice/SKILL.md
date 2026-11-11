---
name: filmcraft-voice
description: Create ElevenLabs narration through the Nexts backend and prepare timed subtitles for FilmCraft productions.
---

# Narration and subtitles

Before direct FilmCraft transcript or caption commands, follow [command discovery](../../references/commands.md). Query `command_list` for the exact command, parameters and availability; inspect the current project for object IDs before calling `command_run` or `command_batch`.

Read [provider adapters](../../references/providers.md). Call the Nexts host `generate_speech` tool with `text`, `model: elevenlabs-tts` and `language`. The host uses the current account session and saves audio locally; the backend chooses its configured ElevenLabs model and language voice. It currently ignores arbitrary voice IDs in this route. Do not ask for an ElevenLabs key or silently replace the provider. If the host tool is absent, update the Nexts host; a skill cannot create a missing tool.

Generate short narration segments per shot and retain MP3 output. First call `load_workspace_dependencies` with `{}`, then measure the actual file with its returned FFprobe executable, or use a discovered native media-metadata command after import. `probe` is not an assumed FilmCraft MCP engine command; do not invoke CLI editing or invent a probe tool. Put the resulting path in the shot's `voice`. Allocate enough timeline frames for the whole voice file. Do not prescribe an unverified words/characters-per-second constant, even in a plan: draft within the visual window, then measure generated audio and revise the script if needed. The standalone `studio.mjs generate` adapter is only for an explicitly authenticated external runner; normal in-app use needs no token environment variables.

The existing Nexts ElevenLabs speech endpoint returns audio, not alignment. `transcribe_audio` can verify words but currently returns plain text, not timing. Do not fabricate word timestamps or label estimated captions as aligned. Obtain timestamped segments with an available ASR/forced-alignment tool, FilmCraft transcription, or manual listening. FilmCraft transcript commands require installed transcription models; discover their live schemas first. Without verified timing, preserve the audio and report the caption-alignment blocker; do not import estimated synchronized captions.

Write `captions` as global integer frame intervals `{startFrame,endFrame,text}`. Split at natural phrase boundaries, use readable one/two-line captions, and check multilingual glyphs at the target resolution. Every interval must fit the final sequence and not overlap. Set `captionsReviewed: true` only after audio/timing review. Assembly generates UTF-8 SRT and imports an editable subtitle track; export burns subtitles into the video.

For Chinese captions on Windows, assembly selects Microsoft YaHei because FilmCraft's default font can miss individual Han glyphs. Override with a locally installed font family using production `captionFont` when needed. Review the generated preview at each caption midpoint and a frame extracted from the final MP4, not only the first/middle/last frame of the sequence.

## Existing visual targets

For narration against existing visuals, follow [audio and narration synchronization](../filmcraft-audio/SKILL.md) before generating: map actual visual windows and content anchors, generate per meaningful segment, measure real audio duration and verify fit before placement. Rebuild affected mappings after visual retiming. Subtitle-only requests use [captions](../filmcraft-captions/SKILL.md); they do not authorize new speech. The configured Nexts speech route does not establish voice cloning, speaker-identity preservation or lip-sync capability.
