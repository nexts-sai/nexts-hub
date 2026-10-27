---
name: auto-editor
description: Use Auto-Editor locally to remove silence or shorten pauses in existing talking-head videos, lessons, podcasts and screen recordings. Use for an automatic first-pass rough cut or a cut-statistics preview, not semantic retake removal or full creative editing.
---

# Auto-Editor rough cuts in Nexts

Work on local files with the official Auto-Editor CLI. No MCP server, login, upload, or cloud transcription is required. This is an amplitude-based first pass: silence is not necessarily unwanted content, and low volume is not proof of absent speech.

## Runtime and source

Run `auto-editor --version` and inspect `auto-editor --help`. The commands in [CLI recipes](references/cli.md) were checked with official release 31.7.2. If missing, follow that reference's official binary setup. Do not install the abandoned pip CLI or silently replace a working version. Use an absolute executable path when it is not on PATH. In PowerShell invoke a quoted executable with `&`.

Resolve the input from the user's attachment/path; inspect it with `auto-editor info "input.mp4"`. Check duration, audio tracks and output location. Choose the microphone track when music/system audio would obscure pauses; audio stream indexes are zero-based. Do not use audio-based cutting on an audio-less recording.

## Pick the requested edit

- **Remove silence:** keep active speech at normal speed and cut inactive sections. Start with a 4% amplitude threshold and 0.2-second margins. These are starting settings, not a universal speech detector.
- **Shorten pauses:** keep speech at normal speed and accelerate inactive sections, initially 4x. This shortens each detected pause proportionally; it does not set every pause to an exact duration. Margins stay at normal speed.
- **Analysis only:** use the same intended parameters with `--preview`; report statistics and stop without rendering.

For a broad request to rough-cut speech, use silence removal. For “shorten pauses” use pause acceleration. When the request already gives threshold, margins, or pace, honor it. Do not add captions, transcription, music, voice generation, or unrelated effects.

Screen recordings may contain important silent typing, demos, reading or loading. Inspect representative intervals and protect known essential ranges with `--keep`, or use an audio-or-motion expression after checking its behavior. Motion is only a cue: blinking cursors and loading spinners can mislead it. If silent actions must be preserved and their locations are unknown, clarify before a destructive editorial choice; write every result to a separate file regardless.

## Preview, render, verify

1. Choose a new output such as `input-roughcut.mp4` or `input-pauses-4x.mp4`, outside the plugin directory. Never overwrite the input, an existing edit or a batch sibling; choose a unique name.
2. Run the intended recipe with `--preview`. If all or nearly all content would disappear, stop and inspect the selected stream, noise floor and threshold. Lower the threshold for quiet speech. Raise margins for clipped consonants or breathless joins. Avoid changing multiple parameters at once.
3. Unless the user requested analysis only, render using the identical editing parameters, `--no-open`, and an explicit output path. Render one file at a time for batch jobs and retain each original. The timeline is shortened consistently across audio/video; never independently cut audio and leave video unchanged.
4. Check exit status, output existence, streams and duration with `auto-editor info`. Preview/listen around several cuts, especially quiet words and screen activity. Report when playback inspection is unavailable; CLI success and statistics alone are not visual/audio verification.
5. Deliver the output path, input/output durations, mode, threshold, margins, pause speed and any unverified cuts. Compute savings from measured durations, not an estimate presented as fact.

Use [CLI recipes](references/cli.md) for exact commands, track selection, protected ranges and editable exports. External timeline formats are for their named editors; do not claim a Premiere XML is a native Nexts, FilmCraft or ChatCut project. Keep source media available for editable exports.
