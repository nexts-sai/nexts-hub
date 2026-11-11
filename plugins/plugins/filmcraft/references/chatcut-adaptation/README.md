# ChatCut Source Adaptation: FilmCraft Editing Techniques

Modified for Nexts FilmCraft on 2026-10-23. This is a source-based adaptation, not an official ChatCut or FilmCraft skill release.

## Fixed upstream source

Repository: [ChatCut-Inc/agent-plugin](https://github.com/ChatCut-Inc/agent-plugin/tree/0de8a5cc44b0072793a4aa07a02141a3542c874a). Commit: `0de8a5cc44b0072793a4aa07a02141a3542c874a`.

- Captions: [original grok caption reference](https://github.com/ChatCut-Inc/agent-plugin/blob/0de8a5cc44b0072793a4aa07a02141a3542c874a/grok/skills/talking-head-guide/references/captions.md); exact local snapshot: [captions.original.txt](captions.original.txt).
- Shorts: [original other A-roll scenarios](https://github.com/ChatCut-Inc/agent-plugin/blob/0de8a5cc44b0072793a4aa07a02141a3542c874a/grok/skills/talking-head-guide/references/other-a-roll-editing-scenarios.md); exact local snapshot: [other-a-roll-editing-scenarios.original.txt](other-a-roll-editing-scenarios.original.txt).
- Parent workflow: [talking-head-guide](https://github.com/ChatCut-Inc/agent-plugin/blob/0de8a5cc44b0072793a4aa07a02141a3542c874a/grok/skills/talking-head-guide/SKILL.md). Supporting [transcription](https://github.com/ChatCut-Inc/agent-plugin/blob/0de8a5cc44b0072793a4aa07a02141a3542c874a/grok/skills/transcription/SKILL.md), [export](https://github.com/ChatCut-Inc/agent-plugin/blob/0de8a5cc44b0072793a4aa07a02141a3542c874a/grok/skills/export/SKILL.md) and [verification](https://github.com/ChatCut-Inc/agent-plugin/blob/0de8a5cc44b0072793a4aa07a02141a3542c874a/grok/skills/verification/SKILL.md) were read for readiness and delivery behavior.

The public tree at this commit has no standalone `long-video-to-shorts/SKILL.md`. FilmCraft Shorts adapts the original highlight, hook/short-version and multiple-version branches above. FilmCraft Captions extracts the original caption reference into an independently routable skill. The Kimi caption guide is not the derivative source used here.

Original snapshots are provenance records, not executable FilmCraft instructions. Do not load them as operational skills or execute their ChatCut API names. Their hashes and source paths are recorded in [sources.json](sources.json). The source package's [Apache-2.0 license](LICENSE) is retained; these adapted skill texts retain that license. The rest of the plugin retains its existing licensing.

## Section-by-section mapping

| Original instruction | FilmCraft adaptation | Difference and reason |
|---|---|---|
| Caption Cards, fresh ids/revision, display corrections separate from ASR repair | Inspect ordered caption entries; use current ids and discovered text/time/style commands | FilmCraft has a different document model; no fabricated Card API or revision fields |
| Presets before custom style; geometry is not segmentation | Discover real presets if exposed; otherwise documented style fields; separate resegmentation from font/layout | Original preset names and CSS slots are not FilmCraft contracts |
| Exact-word styles and opt-in meaningful emphasis | Preserve scope and truthful contiguous phrase selection; verify span capability before use | Do not copy upstream's unconditional support guarantee to another editor |
| Translation target, existing language sources, coverage after pacing changes | Requested translated/bilingual caption tracks with preserved verified timings and renewed coverage checks | Translation/import capability is discovered; no dubbing or lip-sync implication |
| Highlight standard and standalone meaning | Choose opinion/story/topic/data etc.; preserve necessary question, setup and conclusion | Same editorial criteria; Nexts handles local files instead of hosted uploads |
| Hook/short version preserves main line; duration cannot destroy logic | Source-spoken hook, complete semantic units and explicit duration tradeoffs | Generated narration remains a separate scope decision |
| Target script and complete natural takes | Keep requested meaning/order without off-script segment tails or stitched unfinished retakes | Reliable source/sequence mapping is required |
| Script-based edits, duplicate timelines, restore omitted library content | Discover independent FilmCraft sequence creation/copy and transcript-aware edits; recover content from verified source | No confirmed ChatCut Script equivalent; unsupported operations block the affected version, not justify guessed cuts |
| Re-read every version for omissions, duplicates and order | Per-short manifest, sequence/caption readback and composed-frame/audio checks | Local notes add resumability; no second host database |
| Export only requested deliverables, track returned render ids | Explicit target sequence, absolute workspace output, per-job terminal checks | Native FilmCraft jobs/files replace hosted render/browser handoff |

## Nexts-specific constraints retained

The host manages the visible FilmCraft bridge. Main-skill routing handles ordinary app mentions. Reliable timing is required for speech cuts and synchronized captions; plain-text transcription and signal energy are not alignment. Dependency discovery is read-only. Source media and original sequences remain intact. Authorized end-to-end work proceeds without repeated checkpoints unless the user requests them. Unexpected concurrent edits pause mutations.

## Validation boundary

On 2026-10-23 the FilmCraft bridge at `127.0.0.1:9876` refused connections, so current live commands and actual media edits were not verified. Existing command-reference signatures are discovery hints. Skill validation, source hashes, link checks and packaging do not prove live routing, caption rendering, transcript-edit semantics, independent sequence creation or completed exports. Verify those with disposable source footage after host readiness.

## Unified 0.2.0 technique mapping

All source paths below are under `grok/skills/` at the fixed commit above. Exact original Git blobs are stored under `originals/` and indexed with SHA-256 in [sources.json](sources.json). Source snapshots are provenance only, never operational FilmCraft instructions. Added adapted skill texts and the adapted multicam helper retain Apache-2.0. Existing Nexts genre/production templates remain identified separately.

| Original source/sections | FilmCraft target | Retained behavior and explicit adaptation |
|---|---|---|
| `asset-import/SKILL.md` import/relink | `filmcraft-import` | Reuse existing assets, preserve relink identity, reconcile partial imports; local FilmCraft import replaces hosted upload helpers |
| `transcription/SKILL.md` | `filmcraft-transcription` | Ready/running/failed/no-speech distinction, patience and transcript repair; local model/job schemas replace ChatCut APIs |
| `talking-head-guide/SKILL.md` | Existing `filmcraft-talking-head` | Semantic cleanup and final-timing dependencies; native verified transcript operations replace Script |
| `other-a-roll-editing-scenarios.md` restructuring/script sections | `filmcraft-story-edit` | Complete semantic units, connectors, target script and natural takes; no automatic short-form output |
| `references/b-roll.md` | `filmcraft-broll` | Full-screen/PiP choice, protected content, source/destination checks; native fit/rounding capabilities discovered |
| `references/audio-and-music.md` | `filmcraft-audio` | Speech-first mix, BGM extent/tiling/fades, no double attenuation; anchor/follower roles are not assumed FilmCraft fields |
| `music/SKILL.md`, `music/references/song.md` | `filmcraft-audio` optional branch | Vocal/instrumental distinction, lyrics and timing limits; missing generation remains unavailable |
| `multicam-sync/SKILL.md`, `references/multicam.md` | `filmcraft-multicam` | Evidence-based structure, preserved synced master, program audio, motivated truthful angles, numeric sync invariants |
| `multicam-sync/scripts/transcript-offset.mjs` | Bundled multicam script | Original voting/median/drift algorithm retained; invalid source timing/text rejected and output map hardened; no editing side effects |
| `create-motion-graphics/SKILL.md` design/placement sections and `references/motion-graphics.md` | `filmcraft-motion` | Content/time/form/background decisions, coherent style, editable fields and composed verification; native graphics replace ChatCut JSX renderer |
| `shader-gen/SKILL.md` catalog/placement/LUT sections | `filmcraft-effects` | Existing effects first, clip vs source scope, real geometry; no copied builtin ids or shader-generation guarantee |
| `voice/references/video-sync.md` | `filmcraft-audio` and existing `filmcraft-voice` | Observed visual windows, actual audio-duration fit, stale-map repair; existing Nexts TTS provider contract retained |
| `verification/SKILL.md` | `filmcraft-verify` | Structural readback and actual composed pixels; local preview replaces hosted editor URLs |
| `export/SKILL.md` | `filmcraft-export` | Requested output only, explicit/active target, job receipts, complete artifact evidence; native local export replaces browser/cloud contracts |

The classification includes pre-existing Nexts product-short, promo, explainer, interview and montage templates. These are not described as copied ChatCut skills. This release adapts the relevant editing sections; it does not claim a full implementation of ChatCut's service APIs, JSX renderer or every generation provider.

## Scope after user clarification

The user requested classification of editing techniques into one FilmCraft package. Digital-human, voice-cloning, lipsync and video-translation services, model-specific generation adapters, hosted widgets/product-help/account flows are outside this release. Their absence is not hidden behind a generic generation fallback.

Nexts continuation intentionally differs from upstream submit-and-end instructions: an authorized multi-stage task observes existing jobs and continues until requested work completes or a concrete blocker/review decision occurs. Source-based editorial principles are preserved; user authorization controls unnecessary repeated approvals. All operational skills remain English.

Use the [technique catalog](../technique-catalog.md) for classification and [unified acceptance](../unified-acceptance.md) for live test coverage. Runtime feature support and output quality remain pending actual editor acceptance.
