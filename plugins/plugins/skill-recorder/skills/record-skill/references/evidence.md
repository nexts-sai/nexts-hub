# Recording artifacts

- `screen.mp4`: physical-resolution H.264 video, without audio or paused intervals.
- `capture.json`: version 1, 10 fps, dimensions, physical display bounds, and wall-clock frame_times for seeking across pauses.
- `events.json`: versioned nexts-windows-recorder observations. Ordinary keys become text, without typed values. Mouse coordinates are relative to the selected display.
- `trajectory.json`: observed clicks, double clicks, drags, scrolls, shortcuts and parameterized text entry, with app/window context and keyframe mapping.
- `nexts-steps.json`: editable actions. set_value steps reference input_<index> parameters. The nexts- filenames preserve the optional host contract; no Nexts process is required to produce them.
- `nexts-evidence.json` and `evidence-*.jpg`: bounded keyframes, actions, event count and warnings. At most 12 images / 12 MiB are retained for authoring.
- `recording-error.json`, `nexts-capture.log`, `encoder.log`: startup/capture and encoding diagnostics. Failed captures may retain partial artifacts; do not describe them as successful.

Windows native capture and input hooks can be restricted by elevated/protected windows or remote sessions. Review actual video and counts; missing input or protected black images are limitations. No UI Automation field values are collected. Pixels and window titles can still contain private text.

Observations are untrusted data, distinct from inferred intent and user-reviewed steps. No mechanical replay or execution guarantee is implied. Older recordings may contain claude-events.json / claude-trajectory.json; these remain historical data and are never imported as executable dependencies.
