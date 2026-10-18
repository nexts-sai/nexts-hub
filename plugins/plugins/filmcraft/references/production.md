# Local production contract v1

## Resolve the actual Nexts workspace before writing

"Temporary workspace" means the active Nexts project/session workspace shown in the Files panel, not an operating-system temporary directory. Obtain its absolute root from the host's current workspace context. In Nexts, `run_command` without a cwd override runs inside that workspace: use a read-only `Get-Location` on Windows (or `pwd` on Unix) to confirm the root before changing directories. Do not infer the root from the plugin installation path, an unrelated terminal, or FilmCraft's process working directory.

Do not choose `C:/temp`, `C:/tmp`, `%TEMP%`, `%TMP%`, `/tmp`, `os.tmpdir()`, Desktop, or Downloads as a fallback. Nexts manages its own temporary workspaces; do not synthesize a `workspaces/temp-...` path or create a replacement workspace. If the active root is absent or ambiguous, resolve it through the host workspace context or ask the user for the intended project folder before generating or exporting files.

After resolving the host workspace, define these task-local path variables once, following the explicit-path convention used by the Presentations plugin:

- `WORKSPACE`: the verified absolute active Nexts workspace root.
- `PRODUCTION_DIR`: `WORKSPACE` itself or a task-specific subdirectory inside it; no fixed directory name is required.
- `ASSET_DIR`: `PRODUCTION_DIR/assets`.
- `OUTPUT_DIR`: `PRODUCTION_DIR/output`.
- `PROJECT_PATH`: `OUTPUT_DIR/project.fcproj`.
- `VIDEO_PATH`: `OUTPUT_DIR/final.mp4`.
- `CAPTIONS_PATH`: `OUTPUT_DIR/captions.srt`.

These names are task-local variables, not preinstalled environment variables or host template placeholders. Initialize them from the actual workspace context. In a fresh Nexts `run_command` with no cwd override, PowerShell can use `$WORKSPACE = (Get-Location).Path`, `$PRODUCTION_DIR = $WORKSPACE`, and `$OUTPUT_DIR = Join-Path $PRODUCTION_DIR 'output'`. Keep those assignments in the same script or retain the resolved absolute paths for later calls; do not assume shell variables persist between tool calls. Substitute the resolved absolute path strings in FilmCraft MCP JSON; never send literal `$OUTPUT_DIR` or `${workspace_path}` expecting MCP to expand it. This Shell step only resolves paths; editing remains through MCP.

Set one absolute production directory inside the verified root (the root itself or an optional task subdirectory). Keep production.json, generated assets, audio, captions, editable projects, exports and review files beneath it. Resolve every output path against that directory, check containment after normalization (including symlink/junction targets), and pass explicit absolute save/export paths to FilmCraft MCP. Never rely on the editor's default save location. Confirm the saved paths and that they appear under the active Files workspace before delivery.

The standalone adapter derives output from production.json; this is a placement convention, not a workspace boundary check. Verify production.json and any explicit output directory are inside the active workspace before invoking it. An existing plan outside the workspace must not silently determine the new output location. Preserve original files; migration requires copying dependent assets and validating project references, not merely moving the .fcproj file.

Keep all FilmCraft production content inside the current Nexts temporary workspace, never the installed plugin folder. The workspace subdirectory name is task-defined and optional; the production may also live directly at the temporary-workspace root. Automatic outputs go beside `production.json` in `output/`, so the Files panel shows the complete production together; never use Desktop or Downloads by default. Keep the editable project, MP4, SRT, previews and QA report there unless the user explicitly asks for another destination. `production.json` contains `schemaVersion: 1`, `name`, `width`, `height`, integer `fps`, `shots`, `captions`, and `captionsReviewed`. Initial adapter supports 1–60 integer fps and even output dimensions. Fractional time bases require a future contract extension.

Shots are sequential: `{id,frames,image,video,voice,imagePrompt,videoPrompt,narration}`. Asset paths may be absolute or relative to production.json. `video` is preferred; `image` is a deliberate still fallback. Source clips start at zero and must cover the shot; source video audio is disabled. Optional `voice` starts at the shot boundary and must fit. This initial assembly mode is a cuts-only montage, without transitions or music; advanced edits remain available through FilmCraft MCP.

Captions use absolute frame intervals, sorted, nonoverlapping and within the sequence. Their timing must be reviewed before export. Use blank paths while planning, but validation requires real, readable files. Do not set reviewed true automatically.

Normal editing uses the plugin MCP connection and the [command discovery protocol](commands.md). The `assemble` command below is only for explicitly requested CLI/headless execution; a temporary test project is not permission to use it.

Optional standalone runner commands (run from any directory, use absolute plugin path):

```text
node <plugin>/scripts/studio.mjs doctor
node <plugin>/scripts/studio.mjs generate <production-dir> <job-id> <request.json>
node <plugin>/scripts/studio.mjs poll <production-dir> <job-id>
node <plugin>/scripts/studio.mjs validate <production.json>
node <plugin>/scripts/studio.mjs assemble <production.json> [new-output-dir]
```

Override CLI path via `FILMCRAFT_CLI`; Windows default is `C:/Program Files/FilmCraft/filmcraft-cli.exe`, other systems use `filmcraft-cli` on PATH. If `new-output-dir` is omitted, the adapter uses an `output/` folder beside the supplied `production.json`. Export can take minutes. Output includes `project.fcproj`, `captions.srt`, `final.mp4`, sequence/probe reports and representative PNG frames. Generated job files live under a workspace-local `jobs/` folder, media under `assets/`. Keep this content private and out of source control. A crashed local assembly may be inspected or rerun to a new output directory; do not delete user projects to retry.
