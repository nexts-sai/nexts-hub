# FilmCraft Studio for Nexts

Five Skills cover production coordination, storyboarding, generated assets, ElevenLabs narration/subtitles, and FilmCraft editing/export. Image and video use your existing Nexts backend Auto routing; no vendor model names or keys are bundled. Additional platforms can implement the provider contract without changing the production format.

## Requirements and use

- Nexts with host tools `generate_image`, `generate_video`, and `generate_speech`. The latter is added in the accompanying Nexts `nexts-runtime/src/agent/runtime/media_gen.rs` change; rebuild/update the host before using narration.
- A signed-in Nexts account, enabled Image/Video routes and ElevenLabs configuration in the backend. Host tools use the existing session; the plugin never receives its tokens.
- Installed FilmCraft CLI (verified against 0.7.2) and Node 18+. The existing Hub FilmCraft MCP can be used for interactive editing; the bundled scripts also work headlessly.

Install the FilmCraft plugin from the Nexts plugin catalog or its local ZIP. Ask: “用 FilmCraft 做一条 15 秒产品短片，复用后台图片和视频路由，ElevenLabs 中文配音，带字幕。” The agent keeps the production content in Nexts 的临时空间, with an optional task-specific folder, generates assets via host tools, records their paths, checks subtitle timings, and assembles a local `.fcproj` and MP4 in the workspace-local `output/` folder beside `production.json`, never Desktop by default.

See [production format and commands](references/production.md), [provider routing](references/providers.md), and [video modes](references/modes.md). Initial automated assembly is a sequential cuts-only montage; captions are editable in FilmCraft and burned into MP4. Narration must fit each shot. TTS does not supply word alignment; captions require a timing review or timestamped transcription before export. No music, transition automation or automatic publishing is included.

## Validation

From the hub root:

```text
node --test scripts/test-filmcraft.mjs
node scripts/package-plugins.mjs --plugin filmcraft
```

The local FilmCraft smoke test uses synthetic video/audio fixtures to verify import, timeline placement, captions, export, duration, dimensions and audio presence. It does not prove that the live account's cloud generators succeeded. Integration fixtures and generated projects stay outside the plugin package. Standalone backend adapter tests use mocked transport; live generation requires the running updated Nexts host and account.
