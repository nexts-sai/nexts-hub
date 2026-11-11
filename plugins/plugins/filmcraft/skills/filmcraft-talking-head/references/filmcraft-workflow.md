# FilmCraft command mapping and acceptance checks

Read with SKILL.md before work. These signatures were advertised by FilmCraft `command_list` on 2026-10-21. Discover current schemas and enabled state before calling them; a listed command is not proof of runtime success. Use the host's actual FilmCraft MCP tool names.

## Current execution boundary

- `doc_inspect` combines project and active sequence; `sequence_inspect` provides tracks, clips, links and timing.
- `media_import` accepts absolute local `paths`; returned ids are the only source for later commands.
- `command_run` takes `{id, params}`. Filter `command_list` by command or domain to avoid dumping the entire catalog.
- `command_batch` takes `{steps:[{id,params}],stop_on_error:true}`; successful preceding edits remain applied after a failed step. It does not provide a single rollback.
- `render_preview` and `render_frame` accept sequence `seconds` and optional `max_side`. They show composed frames; they do not establish audio quality or validate an exported file.
- Time base: 254016000000 ticks per second. Use command-supported seconds/frames fields where available. Do not pass seconds to a ticks field or assume every command accepts every time representation. Round to the sequence frame grid. Avoid lossy JS integer tick arithmetic on long timelines.

## Commands for this workflow

The values below are schema summaries, not ready-to-run requests with valid ids or paths.

| Purpose | Command id | Advertised parameters / constraints |
|---|---|---|
| New sequence from imported item | `file.newSequence` | `fromItem: itemId`, optional `name`; inspect resulting settings |
| Save working copy / save | `file.saveAs`, `file.save` | `path: string` / optional path; use real editor format |
| Read history | `history.list` | `{}` |
| Models | `transcript.models` | `{}` |
| Download selected model | `transcript.downloadModel` | `model`; inspect actual model list first |
| Transcribe source | `transcript.generate` | `items:[id]`, `model?`, `language?`, `diarize?`, `maxSpeakers?` |
| Transcribe sequence | `sequence.transcribe` | `track: "mix" or audio track id`, `language?`, `model?`, `diarize?` |
| Read edited transcript | `transcript.inspect` | `paragraphGapSeconds?`; inspect returned mapping before use |
| Find words | `transcript.search` | `query: string` |
| Select words | `transcript.select` | `from:word`, `to:word?`; reacquire returned word addresses after edits |
| Remove selected speech | `transcript.extract` | `from:word`, `to:word?`; verify the linked A/V scope and resulting duration |
| Bulk fillers | `transcript.removeFillers` | `fillers:[string]?`; no advertised dry-run/range argument |
| Bulk pauses | `transcript.removePauses` | `minSeconds`, `keepSeconds`; no advertised dry-run/range argument |
| Physical cut | `timeline.razor` | `time:ticks`, `track?`, `clip?` |
| Trim edge | `timeline.trim` | `clip`, `edge:"in" or "out"`, `mode:"regular" or "ripple"`, `delta:ticks` or `deltaFrames` |
| Ripple remove | `edit.rippleDelete` | `clips:[id]?`; explicit ids and confirmed track/link scope |
| Generate captions | `transcript.createCaptions` | `maxChars`, `lines:1 or 2`, `minSeconds`, `maxSeconds`, `gapFrames?`, `format?`, `name?`; no advertised target track parameter |
| Inspect captions | `captions.list` | `track?` |
| Style | `captions.setStyle` | `track`, `font?`, `size?`, `color?`, `background?`, `backgroundColor?`, `align?`, `anchor?`, `margin?`, `outline?`, `outlineColor?`; margin is fraction of frame height, 0–0.45 |
| Caption text | `captions.setText` | `caption:id`, `text`, `speaker?` |
| Caption timing | `captions.setTimes` | `caption:id`, matching `startSeconds/endSeconds` or supported time/frame/timecode fields |
| Subtitle import | `captions.import` | `path`, `name?`; avoid duplicate import on resume |
| Subtitle export | `captions.export` | `path`, `format:"srt"`, `track?`; verify active sequence first |
| Resolve settings | `export.resolve` | export settings and optional `path` |
| Video export | `file.exportMedia` | `path`, `sequence`, `format:"h264"`, `audio:true`, `burnCaptions`, `range:"entire"`, `wait:false`; optional width/height/fps and supported codec settings |
| Job state | `jobs.list` | `{}`; match the returned job id, not an unrelated latest job |
| Export queue | `export.queue.list` | `{}`; use when the returned export belongs to the queue |
| Cancel job | `jobs.cancel` | `job:id` |
| Cancel queue item | `export.queue.cancel` | `id`, `wait?`; never omit id and risk broader cancellation |

Do not transplant ChatCut's `clean_script`, `timeline.md`, `apply_script`, `smooth_audio`, `submit_export` or browser upload scripts into this workflow. They are not FilmCraft commands. If audio transitions need adjustment, discover the actual FilmCraft schema and confirm the affected clips instead of inventing a smoothing command.

## Decisions that need fresh evidence

- Empty catalog, missing MCP tools or bridge error: resolve the connection before mutation. The catalog can be served while the app is unavailable.
- ASR running: observe the existing job; do not start another. ASR failure: inspect the cause. Empty/no-speech result: verify audio/source selection; do not fabricate speech or retry indefinitely.
- Word ranges: the manifest only says `word`; inspect returned address shape and endpoints, do not assume zero-based indices or inclusive boundaries. A source transcript may span multiple timeline uses of the same asset. Verify the targeted occurrence.
- Existing montage/captions: bulk ripple or transcript tools may affect more than the desired speaker. Restrict scope with confirmed commands or explain the blocker.
- Checkpoint: saving a copy is not proof that audio/video links are preserved. Inspect after each structural edit.
- Cancellation/timeout: inspect saved project, job and history before resuming. Record stage completion in the current task notes, not a second project database.

## Acceptance checklist

Use a disposable project and consented footage for runtime testing; never use an unrelated active project as a test fixture.

1. Source includes one abandoned restart, a meaningful “所以/但是”, a long hesitation pause, a natural breath and Chinese names/numbers.
2. Cleanup removes only the intended defect, preserves meaning/connectors/breaths, and keeps picture and voice linked. Reread transcript and timeline; listen across cuts.
3. Captions match the post-cut speech and end time, preserve numbers and negation, use working glyphs, fit the frame and do not duplicate an existing track.
4. Save/reopen the project and check edits persist. Export to new paths; require terminal success, nonzero files, expected media metadata, correct SRT timing and inspected exported frames/audio.
5. Exercise preview-only, captions-only, export-only, interrupted job, partial batch and changed active sequence cases without crossing their scope.

Authoring verification on 2026-10-21: command catalog inspected; runtime project inspection was blocked by a refused connection at 127.0.0.1:9876. No real footage, listening, rendering, save/reopen or export acceptance has been claimed. Recheck at runtime; this historical failure is not a permanent capability restriction.

## Reference and adaptation

Reference source: [ChatCut Agent Plugins](https://github.com/ChatCut-Inc/agent-plugin), read 2026-10-21:

- [Speech-led workflow](https://github.com/ChatCut-Inc/agent-plugin/blob/main/grok/skills/talking-head-guide/SKILL.md)
- [Captions](https://github.com/ChatCut-Inc/agent-plugin/blob/main/grok/skills/talking-head-guide/references/captions.md)
- [Transcription](https://github.com/ChatCut-Inc/agent-plugin/blob/main/grok/skills/transcription/SKILL.md)
- [Export](https://github.com/ChatCut-Inc/agent-plugin/blob/main/grok/skills/export/SKILL.md)
- [Verification](https://github.com/ChatCut-Inc/agent-plugin/blob/main/grok/skills/verification/SKILL.md)

Adaptation notice, 2026-10-21: instructions rewritten for local FilmCraft command execution; hosted authentication, upload, browser handoff, Script API and generation workflows removed. Preserve semantic editing, downstream timing dependency, readback/visual verification and completed-export delivery. Review checkpoints follow the user's requested scope; authorized end-to-end edits do not acquire an extra mandatory gate. This skill does not claim affiliation with ChatCut. The reference package's Apache-2.0 license is included in [LICENSE](../../../references/chatcut-adaptation/LICENSE).
