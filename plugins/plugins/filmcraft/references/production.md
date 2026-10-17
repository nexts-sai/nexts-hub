# Local production contract v1

Keep all FilmCraft production content inside the current Nexts temporary workspace, never the installed plugin folder. The workspace subdirectory name is task-defined and optional; the production may also live directly at the temporary-workspace root. Automatic outputs go beside `production.json` in `output/`, so the Files panel shows the complete production together; never use Desktop or Downloads by default. Keep the editable project, MP4, SRT, previews and QA report there unless the user explicitly asks for another destination. `production.json` contains `schemaVersion: 1`, `name`, `width`, `height`, integer `fps`, `shots`, `captions`, and `captionsReviewed`. Initial adapter supports 1–60 integer fps and even output dimensions. Fractional time bases require a future contract extension.

Shots are sequential: `{id,frames,image,video,voice,imagePrompt,videoPrompt,narration}`. Asset paths may be absolute or relative to production.json. `video` is preferred; `image` is a deliberate still fallback. Source clips start at zero and must cover the shot; source video audio is disabled. Optional `voice` starts at the shot boundary and must fit. This initial assembly mode is a cuts-only montage, without transitions or music; advanced edits remain available through FilmCraft MCP.

Captions use absolute frame intervals, sorted, nonoverlapping and within the sequence. Their timing must be reviewed before export. Use blank paths while planning, but validation requires real, readable files. Do not set reviewed true automatically.

Commands (run from any directory, use absolute plugin path):

```text
node <plugin>/scripts/studio.mjs doctor
node <plugin>/scripts/studio.mjs generate <production-dir> <job-id> <request.json>
node <plugin>/scripts/studio.mjs poll <production-dir> <job-id>
node <plugin>/scripts/studio.mjs validate <production.json>
node <plugin>/scripts/studio.mjs assemble <production.json> [new-output-dir]
```

Override CLI path via `FILMCRAFT_CLI`; Windows default is `C:/Program Files/FilmCraft/filmcraft-cli.exe`, other systems use `filmcraft-cli` on PATH. If `new-output-dir` is omitted, the adapter uses an `output/` folder beside the supplied `production.json`. Export can take minutes. Output includes `project.fcproj`, `captions.srt`, `final.mp4`, sequence/probe reports and representative PNG frames. Generated job files live under a workspace-local `jobs/` folder, media under `assets/`. Keep this content private and out of source control. A crashed local assembly may be inspected or rerun to a new output directory; do not delete user projects to retry.
