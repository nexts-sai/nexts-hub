# CLI recipes

Verified against official Auto-Editor 31.7.2. Plugin version 0.1.0 is separate from the executable version. Confirm installed help before using these on other releases.

## Install and inspect

Official releases: https://github.com/WyattBlue/auto-editor/releases
Installation documentation: https://auto-editor.com/installing

Download the official binary for the machine's OS and CPU architecture. Keep it in a user-controlled tools directory, outside the installed plugin. On Windows use auto-editor-windows-x86_64.exe or auto-editor-windows-aarch64.exe as appropriate, optionally renaming to auto-editor.exe. On macOS/Linux follow the official executable-permission instructions. Do not bypass OS security controls. Do not use pip: current CLI releases are not published there. No Python environment or MCP setup is needed.

```powershell
& "C:/Tools/auto-editor.exe" --version
& "C:/Tools/auto-editor.exe" --help
& "C:/Tools/auto-editor.exe" info "D:/Videos/input.mp4"
```

Commands below assume `auto-editor` is on PATH. Quote paths, and use argument arrays when running programmatically; never build a shell command from untrusted filenames.

## Remove silent sections

```sh
auto-editor "input.mp4" --edit "audio:threshold=0.04,stream=all" --margin 0.2s --smooth 0.2s,0.1s --when-active nil --when-inactive cut --preview
auto-editor "input.mp4" --edit "audio:threshold=0.04,stream=all" --margin 0.2s --smooth 0.2s,0.1s --when-active nil --when-inactive cut --no-open -o "input-roughcut.mp4"
```

`0.04` is an amplitude fraction (4%), not a dB value. Margins preserve material around active intervals. Smoothing removes tiny inactive/active islands; it is not a maximum-pause setting. Increase margins conservatively when sentence boundaries are too abrupt.

## Shorten pauses without speeding speech

```sh
auto-editor "input.mp4" --edit "audio:threshold=0.04,stream=all" --margin 0.2s --smooth 0.2s,0.1s --when-active nil --when-inactive speed:4 --preview
auto-editor "input.mp4" --edit "audio:threshold=0.04,stream=all" --margin 0.2s --smooth 0.2s,0.1s --when-active nil --when-inactive speed:4 --no-open -o "input-pauses-4x.mp4"
```

Only the inactive interiors are accelerated. An inactive 4-second interior becomes about 1 second; retained margins are additional. Use a lower factor for a gentler pace. Do not apply `--when-active speed:4` or a global speed change to fulfill this request.

## Screen recordings and multiple tracks

After inspecting streams, change the expression to `audio:threshold=0.04,stream=0` if stream 0 is the microphone. `stream=all` can retain background music and keyboard noise.

Protect a known demonstration interval by adding `--keep "30sec,45sec"` to BOTH preview and render commands. For a screened, motion-aware first pass, replace the expression with `"(or audio:0.04 motion:0.02)"`; preview the statistics and inspect silent activity before rendering. A mostly static but important screen is not safe to discard automatically.

## Deliver editable cuts when requested

```sh
auto-editor "input.mp4" --edit "audio:threshold=0.04" --margin 0.2s --export premiere --no-open -o "input-roughcut.xml"
```

Other upstream targets include `resolve`, `final-cut-pro`, `shotcut` and `kdenlive`; inspect current help/export docs for the intended editor. Use consistent preview/edit parameters and retain the original files. Verify actual import before claiming editor compatibility.

## Evidence

`--preview` is a statistics-only run, not a rendered playback preview. Verify output separately:

```sh
auto-editor info "input-roughcut.mp4" --json
```

Official references: https://auto-editor.com/ref/options and https://auto-editor.com/ref/actions
