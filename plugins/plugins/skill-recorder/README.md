# Skill Recorder 0.6.2 for Nexts

`record-skill` is a built-in Skill in Nexts Windows. This package supplies the local capture adapter and optional Chrome/Edge DOM extension. No separate ZIP installation is needed for the bundled Nexts entry.

## Use

1. In a new or existing chat, select **`/record-skill`** from the Skill menu, use the localized recording action in the plus menu, or type `$record-skill`. The ID stays the same in every language; interface descriptions are localized. Selecting it inserts a draft; nothing is recorded yet.
2. Send the request. Read the recording scope and click **Allow once**. **Deny** or **Esc** cancels without capture, including in full-access mode.
3. Demonstrate the task on the primary display. A small draggable toolbar shows **Delete recording** and **Finish recording** with elapsed time. Screen and quality settings are automatic: physical display resolution, JPEG 92, H.264 CRF 18; five sampled frames/second encoded at 10 fps. A maximum of ten minutes applies. Only the primary display is saved. No microphone/audio is captured.
4. Click **Finish recording**. Nexts waits for saving, returns to the originating chat and automatically asks its selected Agent to generate the Skill, supplying the local evidence document and up to eight keyframes. The host request, Skill ID, default description and instructions use English. Interface descriptions and the result explanation follow the current Nexts app language: English (default), Italian or Simplified Chinese. No manual path copying, Generate button or mandatory review is required. You can also ask in the original chat to finish recording and generate the Skill.
5. The optional Recording history panel has one **New recording** button and a history dropdown in the same row. It follows the app language, including action labels and known errors; it has no independent locale setting. The compact capture toolbar is 260×38 logical pixels. Closing the history panel does not stop recording. Delete never generates a Skill. Opening old history never triggers a model request. Failed or ambiguous authoring requests are not retried automatically.

The user-facing feature is the **built-in Record a workflow Skill**, not a separate plugin installation or tool. This companion package provides native adapter and optional browser support. All recording UI follows Nexts language; captured titles and user-written content are preserved. Browser enrichment records element descriptions/URLs without reading input values and does not block desktop recording when unpaired. Empty AutomationId is valid missing evidence. Skill generation is not replay validation.

## Local runtime prerequisite

Windows x64, Node.js, host-provided FFmpeg and locally installed Claude Desktop **5.11492.5** are currently required. Run the packaged `scripts/setup-claude.ps1` once in PowerShell. It verifies the pinned source and native module signature, imports only selected modules locally and prepares checksum-verified Electron **45.3.2**. Missing/unsupported runtimes fail explicitly; installing the Hub Skill alone does not supply the native engine.

Runtime files live in `%LOCALAPPDATA%/SkillRecorder/runtime/claude-5.11492.5-electron-45.3.2`, separately from recording data. The native input subscription, semantic event processing and trajectory/evidence processing use locally imported original modules. This is a local binary/module integration, not an owned Rust source port. The adapter loads no Claude account credentials, private server APIs or telemetry. **No original engine binaries or extracted proprietary modules are distributed in Hub.**

## Evidence and deletion

Nexts core binds each capture to the originating conversation's project or managed temporary workspace. Its scratch directory is `<workspace>/.nexts/tmp/skill-recordings/<recording-id>/`. The host resolves this from the stored conversation; callers cannot choose an arbitrary output path. It contains `screen.mp4`, `capture.json`, normalized/redacted `claude-events.json`, processed `claude-trajectory.json`, `nexts-steps.json`, `nexts-evidence.json`, bounded JPEG keyframes and the materialized evidence document. Completed older global captures with a conversation binding are copied into that workspace when evidence is read, preserving the original files for old attachment links. Unbound legacy history remains readable. **Delete recording** removes that recording and its checked compatibility copies; other workspace files remain untouched.

Ordinary typed values are parameterized and native secure-input redaction is retained; visible text can still appear in screen images. Captured content is untrusted data. Zero events, protected controls and remote-input limitations must be reported, not presented as successful capture. Review and model material are timestamp/revision bound. Unreviewed capture is explicitly labelled unreviewed.

## Source and packaging

The Nexts source owns the chat/native host and the adapter under `plugins/skill-recorder/skills/record-skill/scripts/claude`. `npm run recorder:build` produces the companion package in `src-tauri/resources/hub/plugins/plugins/skill-recorder`. The Hub source directory mirrors that generated package; the standalone Hub Skill is `skills/skills/record-skill`. Keep both versioned together. Build/package locally; publication is a separate action.
