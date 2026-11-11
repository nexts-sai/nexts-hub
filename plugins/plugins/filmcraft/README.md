# FilmCraft for Nexts — 0.2.3

One FilmCraft plugin with an English [main entry skill](skills/filmcraft/SKILL.md). Select or mention FilmCraft and describe the result; the agent chooses and combines editorial techniques without requiring internal skill names.

## Editing techniques

The [technique catalog](references/technique-catalog.md) classifies speech cleanup, highlights/short versions, narrative restructuring, target-script assembly, multicam, B-roll/PiP, music/dialogue mixing, narration sync, captions, motion graphics, transitions and color/LUT work. Import, transcription, verification and export are shared stages. Existing product-short, promo, explainer, interview, montage and generated-production templates remain available.

The new technique instructions adapt actual [pinned ChatCut originals](references/chatcut-adaptation/README.md), not website descriptions. Original snapshots, hashes, license and a section-to-workflow mapping are included. ChatCut has no standalone long-video-to-shorts skill at that commit; its highlight/version branches are extracted from the original A-roll reference. Adapted texts and the multicam arithmetic helper retain Apache-2.0. Other plugin components retain their existing licenses. Pre-existing Nexts genre templates are not claimed ChatCut originals.

## Requirements and boundaries

Existing-footage editing needs Nexts, the installed FilmCraft desktop companion, its host-managed visible MCP bridge and available command capabilities. Node 18+ is needed for the bridge/helper. The command reference was originally inspected against CLI 0.7.2; discover current schemas at runtime. Never run a second bridge or silently replace visible editing with headless CLI.

Image/video/TTS generation separately requires the configured Nexts host generation tools and account/provider access. None is required merely to edit supplied footage or existing captions. The plugin adds instructions, not missing engine/provider services: avatar creation, voice cloning, lip-sync and dubbing services are outside this editing release. Native graphics/effects/multicam operations remain conditional on actual command support.

Use `load_workspace_dependencies` before helper/media inspection; it distinguishes managed, system and missing dependencies. Python does not imply an FFmpeg executable. Working projects and outputs stay in the verified active Nexts workspace unless explicitly directed elsewhere. Source media and original sequences remain intact. No guessed speech timestamps, unsupported command parameters or automatic completion at job submission.

## One consolidated test installation

From the hub root:

```text
node --test scripts/test-filmcraft.mjs scripts/test-filmcraft-multicam.mjs
node scripts/package-plugins.mjs --plugin filmcraft
```

Import `dist/extend/plugins/filmcraft/0.2.3/filmcraft-0.2.3.zip` through Nexts local plugin ZIP installation and enable FilmCraft. Follow the [unified acceptance checklist](references/unified-acceptance.md) in a disposable project. Examples after selecting FilmCraft:

- Clean this presenter, add accurate subtitles and export.
- Only translate these subtitles; preserve the cut and original voice.
- Make three complete topic shorts from this lecture.
- Reorder this interview by topic, align both cameras and cut to the speaker.
- Add these cutaways, a music bed and chapter titles; keep the speech unchanged.
- Export the current timeline and check the actual output file.

Routing is instruction-based; verify actual skill selection in a Nexts chat. Synthetic adapter/helper tests, metadata/link checks and packaging do not establish live edit quality, ASR accuracy or completed exports. Capture structural, visual/audio, save/reopen and artifact evidence in the consolidated runtime pass.

See [production contract](references/production.md) and [provider routing](references/providers.md) for the existing generated-production workflow. Headless scripts remain reserved for an explicit CLI/headless request.
