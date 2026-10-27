# Auto-Editor for Nexts

Local rough-cut skill for removing silence or accelerating pauses in talking-head and screen recordings. Active speech stays at normal speed; originals are retained. Includes statistics preview, microphone-track selection, natural margins and protection for meaningful silent screen activity.

Install this plugin from Nexts Hub, then install the official Auto-Editor executable separately from https://github.com/WyattBlue/auto-editor/releases. The CLI is not bundled and current releases are not distributed through pip. No account or MCP connection is required. Commands are verified with release 31.7.2.

Ask “去掉这段口播的静音” or “停顿加速 4 倍，讲话原速”. This is a first-pass amplitude-based edit, not semantic removal of repeated takes or filler words. Inspect joins before publishing.

Source: https://github.com/WyattBlue/auto-editor at deb8737a9a8486111811abcdafe2a69904efc7f8. Nexts-authored workflow and icon, 2026-10-27, under Unlicense. LICENSE retains the upstream license text. Official runtime binaries have their own bundled dependency licenses.
