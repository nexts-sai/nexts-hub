# FilmCraft Studio for Nexts

The [FilmCraft entry skill](skills/filmcraft/SKILL.md) routes natural requests to specialist workflows for existing-footage editing, captions, export, or new production. Users select FilmCraft and describe their task; they do not need specialist skill names. Image and video use your existing Nexts backend Auto routing; no vendor model names or keys are bundled. Additional platforms can implement the provider contract without changing the production format.

## Requirements and use

- Nexts with host tools `generate_image`, `generate_video`, and `generate_speech`. The latter is added in the accompanying Nexts `nexts-runtime/src/agent/runtime/media_gen.rs` change; rebuild/update the host before using narration.
- A signed-in Nexts account, enabled Image/Video routes and ElevenLabs configuration in the backend. Host tools use the existing session; the plugin never receives its tokens.
- Installed FilmCraft CLI (verified against 0.7.2) and Node 18+. The plugin includes and registers the FilmCraft MCP for interactive editing; the bundled scripts can be used headlessly only when explicitly requested.

Install the FilmCraft plugin from the Nexts plugin catalog or its local ZIP. Installation registers its bundled FilmCraft MCP automatically. Ask: “Create a 15-second product short with FilmCraft, using the Nexts image and video routes, ElevenLabs narration, and subtitles.” The agent keeps production content in the current Nexts temporary workspace, with an optional task-specific folder, generates assets through host tools, records their paths, checks subtitle timings, opens or creates the project through the visible FilmCraft bridge, and keeps the timeline visible while editing. Headless assembly is reserved for an explicit headless/CLI request; outputs remain in the workspace-local `output/` folder beside `production.json`, never Desktop by default.

See [production format and commands](references/production.md), [provider routing](references/providers.md), and [video modes](references/modes.md). Initial automated assembly is a sequential cuts-only montage; captions are editable in FilmCraft and burned into MP4. Narration must fit each shot. TTS does not supply word alignment; captions require a timing review or timestamped transcription before export. No music, transition automation or automatic publishing is included.

## Existing talking-head footage

The [talking-head skill](skills/filmcraft-talking-head/SKILL.md) supports speech cleanup, captions on the finished cut, and local MP4/SRT/editable-project delivery. It also handles captions-only, export-only and preview-only requests. Existing-footage editing uses the bundled FilmCraft MCP and does not require generation services or ElevenLabs. Nexts manages the visible editor startup; outputs stay in the active Nexts workspace.

For local testing, package the plugin with `node scripts/package-plugins.mjs --plugin filmcraft` from the hub root and import `dist/extend/plugins/filmcraft/0.1.8/filmcraft-0.1.8.zip` through Nexts' local plugin ZIP installation. Enable FilmCraft in the test project and ask: "Clean up this talking-head video, preserve meaningful pauses and connective words, add accurate captions, and export MP4, SRT, and the editable project." Use a disposable project and explicit source footage. Inspect the resulting timeline, captions, exported files and QA report; command discovery alone does not verify media quality.

The workflow reference records the ChatCut sources and includes their license. Runtime speech-editing acceptance remains pending; the existing synthetic adapter tests do not establish Chinese ASR or live ripple-edit correctness.

## Validation commands

From the hub root:

```text
node --test scripts/test-filmcraft.mjs
node scripts/package-plugins.mjs --plugin filmcraft
```

The local FilmCraft smoke test uses synthetic video/audio fixtures to verify import, timeline placement, captions, export, duration, dimensions and audio presence. It does not prove that the live account's cloud generators succeeded. Integration fixtures and generated projects stay outside the plugin package. Standalone backend adapter tests use mocked transport; live generation requires the running updated Nexts host and account.

## Automatic workflow selection

Select or mention FilmCraft and describe the task naturally. The main `filmcraft` skill routes requests before tools or generation: speech cleanup to talking-head editing, subtitles-only to its caption stage, export-only to editing/export, multi-speaker edits to interview, and new generated productions to the production coordinator. Explicit stages and preview-only requests take priority over content type.

To test routing without modifying media, ask: "FilmCraft: I have a presenter recording with repeated takes and long pauses. Tell me how you would clean it and add subtitles; do not edit yet." Check that the agent reads `skills/filmcraft/SKILL.md` and the talking-head specialist. Also test "only export the current timeline" and "only add subtitles to this interview"; neither should start generation or recut speech. This is instruction-based routing, not a deterministic host dispatch API; verify the selected skill in a real Nexts chat.
