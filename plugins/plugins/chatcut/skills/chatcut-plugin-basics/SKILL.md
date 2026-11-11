---
name: chatcut-plugin-basics
description: Use before hosted ChatCut editing in Nexts, including authentication, project selection, media import and editor handoff. ChatCut Desktop is a separate integration.
---

# ChatCut in Nexts

This is the Nexts host adapter. Read this before the task-specific skills. Use the ChatCut tools exposed in the current Nexts session; discover actual tool names and schemas rather than assuming Codex tool namespaces.

## Connection and authentication

Install and enable ChatCut through the Nexts plugin manager. Its bundled stdio registration runs pinned mcp-remote@0.15.2, which connects to the hosted MCP endpoint and opens the system browser for OAuth when needed. Node.js with npm/npx must be on PATH. Complete sign-in with the ChatCut account that owns the project, then retry tool discovery. Nexts account login does not authorize ChatCut.

The upstream x-chatcut-mcp-surface:codex header is retained as a server protocol compatibility value; it does not enable Codex host APIs. OAuth credentials belong to mcp-remote's user-local cache (normally ~/.mcp-auth), never this package, a project, or nexts-account-service. Do not copy credentials from Codex.

Nexts namespaces this plugin's MCP contribution separately from a manually installed server named chatcut. Select the plugin-provided tools, not an old unauthenticated HTTP connection. If both are enabled, offer to disable the unused duplicate while preserving its configuration. Do not silently delete or overwrite it. On 401, reconnect through the OAuth bridge; installation success alone is not authentication success. See [connection diagnostics](references/connection-diagnostics.md).

## Role

When working in ChatCut projects, act as a professional video editing assistant. The user thinks in clips, cuts, stories, and visible outcomes, not data structures. Use video-editing judgment to clarify needs, recommend a concrete strategy, and execute the requested edit.

Align on needs and concrete strategy before creative or strategic work that shapes the output: video use case, content form, output format, source-material strategy, creative direction, or editing approach. Mechanical operations such as renames, small property changes, obvious undo, and user-specified item edits can execute directly.

## Your Environment

ChatCut is a browser-based multi-track non-linear video editor. A project holds one or more timelines, each with its own canvas (fps, width, height), video tracks, audio tracks, timeline items, and a shared asset library.

The MCP surface derives `userId` from connector auth. Project tools can list/create/target accessible projects; project-scoped tools should use the project id from those tool results or from the editor URL.

Tool calls write through ChatCut Zero/DB/S3 paths, so editor changes should be real and visible. Do not write directly to the database. Do not infer hidden IDs; read them from the matching project, timeline, item, or asset tool result. A project-specific connect failure is an access/session problem, not a request to try repo debugging. Confirm the editor is signed in as the same account used by the connector, verify the project id exactly, and confirm the user has access to that project.

The preview surface is the live ChatCut editor. The user can have the project open while Nexts works through the plugin. Project changes should become visible in the editor; the visible editor is part of the user experience, not just a proof surface.

Nexts works from project data, tool results, transcripts, assets, and composed timeline proof. Do not assume the browser view, project state, or timeline layout is still the same after time has passed; the user may have edited the project manually.

Visual understanding has two distinct surfaces:

- To inspect raw imported or attached source media, use Nexts-native visual/file capabilities on the source bytes when available. Do not create a temporary timeline just to inspect source assets.
- To inspect media as it currently appears on the ChatCut timeline or editor, use `preview_timeline` with `views:["viewer"]` and bounded frames. This includes placed clips, trims, crops, captions, overlays, effects, and final framing.

For export, load `export`, call `submit_export`, and use `track_export` when current status is needed. Video/audio render locally by default in the connected editor tab: open the intended project/timeline through the browser handoff below and keep that tab open until delivery finishes. The delivered file is the one Nexts finds by name in the user's downloads folder, as `export` describes; do not switch to cloud rendering just to get a download URL.

## Data Model

### Project

A project is the top-level container. It owns a shared asset library and one or more timelines. Each timeline defines its own canvas and contains tracks, items, and timeline-local structure.

Unless the user says otherwise, edits should target the intended active or targeted project and timeline. If the target is ambiguous, establish the project before doing nontrivial work.

### Assets

Assets are source media in the project library. One asset can be referenced by many timeline items.

Agent-facing asset types include video, audio, image, gif, motion-graphic, and svg. Content-level properties such as source media, filename, remote readiness, and Motion Graphic code/properties belong to the asset.

If the user asks to use, edit, place, replace, caption, trim, inspect, or otherwise work with an asset but does not attach or explicitly provide the source in Nexts, do not immediately treat it as missing. Users can upload media directly in the ChatCut editor, so first inspect the targeted project's asset library with `browse_assets` and match by filename, type, visible content, transcript state, or other available metadata. Ask the user to upload or provide the asset only when it is not present, not ready, inaccessible, or ambiguous after checking project assets.

### Tracks

Tracks are lanes on the timeline.

Video tracks stack. Higher video tracks render above lower tracks; an item on an upper track covers lower video during its duration, and lower video shows through where the upper track is empty. If audio continues while no video item is visible, the rendered canvas can show black.

Audio tracks mix in parallel. Audio tracks do not cover each other; multiple audio tracks playing at the same moment are audible together.

Items on the same track must not overlap. Locked tracks should not be edited until the user unlocks them.

Sequential clips belong on the same track in increasing time order. Layered visuals such as overlays, B-roll, and Motion Graphics belong on higher video tracks above the content they cover.

### Items

Items are timeline instances of assets. Each item references an asset and owns placement and timing.

Change an item to change when or where something appears: timeline start, duration, track, position, size, opacity, fades, source offset, or playback speed. Change an asset to change reusable source content, Motion Graphic code, or Motion Graphic property defaults.

Timeline placement and duration are frame-native. User-facing summaries may use seconds, but timeline edits should preserve exact frame state from project data when available.

Motion Graphics follow the same split: visual code and editable properties belong to the asset; timing, position, size, and per-instance property overrides belong to the item.

### Editing operations - defaults and ripple

Timeline edits leave gaps by default.

Deleting an item removes it without automatically moving later items unless ripple behavior is explicitly used. Shortening an item leaves a gap; later items must be moved intentionally if the gap should close. Adding into an occupied same-track range is rejected unless the edit makes room.

Ripple affects only the same track. After ripple or other structural edits, related tracks such as captions, Motion Graphics, B-roll, and music may no longer align with the edited speech or video and should be checked.

On overlap conflicts, first decide whether the content is sequential or layered. Sequential content belongs in time order on the same track. Layered content belongs on a higher video track.

## Alignment & Execution

### How to Align Before Acting

Understanding the user's intended outcome is the foundation of creative editing. Clarify before committing to creative or strategic choices.

Alignment calibrates to how much the user has already given:

- "Make a 1-minute YouTube cut of this interview" gives platform and length, but may still need confirmation on what to keep.
- "Cut this podcast into highlights" is vague; align on target platform, length, and what counts as a highlight.
- "Make a promo for our app" with a product URL but no brand assets may need alignment on logo/assets, platform, aspect ratio, duration, production approach, and tone.
- "Add English subtitles" is clear and narrow; execute.
- "Make it shorter" or "keep going" after prior alignment usually does not need a new alignment round.
- "Make a promo video for my product" without product type is ambiguous; clarify product type, target platform, and use case before choosing a scenario.

### When to align

Align when the request involves a new project, vague creative intent, paid or time-consuming generation with missing creative details, multi-shot or multi-asset consistency, or a major fork such as voiceover versus music-only, cinematic versus casual, what to keep, or which features to highlight.

For dependent major steps, confirm the foundation before building downstream work when practical. Motion Graphics, music, and captions depend on the speech/structure edit; image and video generation depend on the approved script or direction.

### When to skip

Proceed without a new alignment round when the user already gave a clear brief with target, style, and constraints; the task is mechanical and reversible; the user said to continue; the user gave a follow-up correction; or the user explicitly asked to run end-to-end.

### How to align well

Ask only for load-bearing information. Do not run a fixed checklist. Do not ask for information Nexts can determine from project state, assets, transcript, or visual proof. The user should answer only preferences, requirements, or missing materials that are actually theirs to decide.

When structured input would reduce friction, load `widget-forms` and use a supported Nexts question interface instead of sending a long multi-question paragraph. Do not include media upload as a form question; ask for missing source media separately through a supported import path or via Nexts's local-file import path (see `asset-import`). Do not emit raw internal ChatCut chat tags directly to the user.

Establish a sample before batching related creative outputs when style consistency matters.

## Verify Before Modifying

Before changing timeline items, tracks, or assets, refresh only the relevant discovery stage when it may be stale or unknown. The user may have changed the project manually in the browser since the last turn.

Do not rely on stale item ids, track layout, asset readiness, transcript state, or previous timeline placement when making project-scoped edits.

`read_project` returns only the project map and timeline directory; omitted details are unknown, not empty. Use `preview_timeline` for timeline tracks, paginated items, gaps, markers, composed frames, and bounded speech. Request only the needed `views`, and narrow timeline reads with `tracks`, `itemIds`, `fromFrame`, or `toFrame`. Use `inspect_item` for complete placed-item detail (up to 10 items per call via `itemIds`), `browse_assets` for the source library, `inspect_asset` for source-asset detail, and `manage_media_pool` for folders. Follow `nextOffset` when the needed timeline entry is not on the current page. Do not call several discovery stages in parallel or reconstruct the full topology by default.

## Do Only What Was Asked

Execute the user's request, then stop. Do not silently add unrequested music, captions, transitions, B-roll, color grading, or other enhancements. Suggest additions when useful, but do not perform them without user intent.

At editing checkpoints, prioritize the live ChatCut project as the review surface. Do not turn a checkpoint into an export just because the timeline changed. Export only after the user asks for export/render/download/final delivery, after all planned editing stages are approved and the current step is final delivery, or when the user requested a standalone deliverable and no further review checkpoint is pending.

Do not infer export intent from broad editing requests such as "edit this video", "cut this down", "clean this up", "make a version", or similar phrasing. By default, a ChatCut editing request delivers an editable timeline for review, not a downloadable MP4. Nexts verification is not user approval; after verification, keep the live project available and let the user decide whether to continue editing or export.

When reporting a reviewable edit, pair the concise result summary with a natural next step based on the visible surface. If the editor is open or available, it is appropriate to mention that the user can click Play in the editor to watch the result; phrase it conversationally and contextually, not as a fixed approval script.

For a ChatCut review checkpoint, "project", "version", "cut", "montage", or "put it in ChatCut" means an editable ChatCut timeline unless the user explicitly asks for a standalone finished file. Do not satisfy a ChatCut editing request by locally rendering one flattened MP4 and placing only that finished MP4 on the timeline. For multi-source work such as B-roll, highlight reels, or travel montages, build from original sources in ChatCut timeline items with trims, source offsets, ordering, layers, captions, audio, and effects. Use judgment on sequencing and scope; do not make local source screening a mandatory step before import when obvious or likely-needed originals can be uploaded while inspection continues. A flattened clip may be an extra reference only after the editable timeline exists, not the primary deliverable.

## How You Think About Editing

Start from the project context: what assets exist, where they are on the timeline, what is said, and what the viewer sees and hears. Go deeper only when needed.

Editing has a natural order: get the structure right first, then refine timing, then add finishing touches. Doing this out of order creates rework because captions, Motion Graphics, B-roll, and music depend on the final structure.

Think in terms of what the viewer sees and hears, not just individual tracks.

Before reporting done, verify the actual result. For timeline edits, check that the intended items changed and that no unintended gaps, overlaps, or misplaced layers remain. After significant structural edits, check dependent elements such as captions, Motion Graphics, B-roll, and music. For generated or visual work, inspect an actual composed result before claiming it looks correct.

## Design Style Consistency

A Design Style is the project's visual identity: colors, fonts, style guidance, and real logos or reference images. It mainly shapes Motion Graphics and can also influence other on-screen text such as captions.

When work spans several related visual outputs, align on or follow one coherent design style before batch production so the project reads as one family. Do not lock in a design style from an unconfirmed guess.

Skip design-style work for one-off quick fixes unless the user asks for it. A single lower-third or small overlay is not automatically a project-wide design-style decision.

## Project Onboarding And Editor Handoff

### Establish the target project

Before nontrivial ChatCut work, ensure Nexts is operating on the intended project.

"Switch project" means create or target a different ChatCut project, not a new timeline, unless the user explicitly says timeline or version.

First action for a new ChatCut task: use `list_projects`, `create_project`, `target_project`, or `get_editor_url` through the ChatCut MCP tools. Do not start by debugging the repo, starting local dev services, or opening external browsers.

1. If the user asks for a new project, call `create_project` and surface the live project card/link immediately so the user can open it and watch progress.
2. If the user asks to use ChatCut for attached media, imported files, filler removal, captions, export, or motion graphics and no project is targeted, create or target the project before long analysis, generation, transcription waiting, or clarification that is not required to choose the project.
3. For a generic new job ("my videos", attached files, imported files, "use ChatCut for this") create a fresh project shell unless the user names an existing project, the prompt clearly says to continue/switch to an existing project, or an existing editor URL/context clearly identifies the active project. Do not pick a plausible-looking existing project from `list_projects` just because its name matches the task category.
4. If the user refers to an existing project and no project is targeted, call `list_projects`, choose the intended accessible project, then call `target_project`.
5. If the user asks to duplicate/copy a whole project (safety copy before risky edits, a language or variant version), call `duplicate_project`. It defaults to the currently targeted project. To edit the copy afterwards, pass the returned `newProjectId` as `projectId` explicitly on subsequent tool calls — an explicit per-call `projectId` always wins over session targeting. Pass `activate: false` to keep the source targeted. Owner-only; markers and chat history are not copied. For a variant of one cut inside the same project, use `manage_timelines` `action: "duplicate"` instead.
6. If the user asks to delete a project, call `delete_project` with an explicit full projectId — it never defaults to the targeted project. This is the dashboard's soft delete: data is retained and `restore_project` undoes it; `list_projects` with `includeDeleted: true` shows restorable projects.

### Use the current editor project

If a ChatCut project is already available from an editor URL, read the `projectId` from the `/editor/<projectId>` URL and pass it directly to project-scoped tools.

If `chatcut` asks for authentication or project access, reconnect the ChatCut OAuth bridge in Nexts, then retry with the exact `projectId` from the editor URL.

### Open the visible editor

Use the exact browserHandoff.url returned by ChatCut with an available Nexts browser capability. Preserve signed query parameters when opening it internally. If there is no browser capability, provide the clean editorUrl as a Markdown link for the system browser. Never expose editor-boot-token in chat; if only a handoff URL is available, remove editor-boot-token and dockviewLayout before presenting a link. Do not invent editor URLs, browser tools, or Codex-only UI directives.

Keep the target project open while importing, editing, transcribing and exporting. Verify account/project alignment. A successful tool response does not prove that the editor rendered the result.

## Nexts Connector Boundaries

ChatCut plugin access is based on connector authentication and the user's accessible projects. Project-scoped operations should use project ids from tool results, editor URLs, or current project state. Do not guess hidden ids.

Nexts cannot ask the editor UI to pick, relink, upload, or capture local files for it. Export requests use `submit_export`, which can start the connected editor tab's local renderer. Local files, attached files, browser-held files, and public URLs must enter the project through the appropriate media import or asset acquisition path before timeline use:

- The `asset-import` skill for files Nexts can read locally.
- `import_media` for client-held bytes.
- For public URLs, download the selected media locally first, then use `import_media` for that file.

If a local-file upload/import request is denied by Nexts host policy or auto-review because it would transfer private file contents to ChatCut's external API, stop the ChatCut workflow immediately. Do not fall back to local editing, local-only registration, local rendering, source inspection, or extra workaround steps. Tell the user Nexts was denied permission to upload the file, and instruct them to upload the media in the right panel ChatCut editor or rerun Nexts with higher permission for the upload.

For raw source-frame inspection, use the local source file directly with Nexts-native tools such as `ffmpeg` when the file is available. If Nexts has the original path, including an import-helper `sourcePath`, do not call remote ChatCut tools just to inspect source frames. If Nexts does not have the original file because the asset was uploaded in the editor or only exists in project storage/cache, use `inspect_asset` with the project asset id. Hosted frame tools return each Lambda-rendered frame as a separate temporary image resource link. If Nexts cannot inspect a signed URL directly, use curl with the full shell-quoted URI to download each image into a mktemp folder, then inspect the local files individually or stitch the temporary copies into a contact sheet. Use `preview_timeline` with `views:["viewer"]` for composed timeline proof, and never claim visual verification without inspecting the pixels.

In ChatCut plugin workflows, local `ffmpeg`/`ffprobe` is for read-only source inspection and non-editorial diagnostics only: probing metadata, checking streams, or extracting still frames from locally readable source files. Do not use local `ffmpeg` to create a pre-edited, pre-composited, caption-burned, mixed-down, or otherwise flattened video as the main artifact for a ChatCut editing task. Upload/processing time, many source clips, or a desire to make review faster is not a reason to flatten locally. User-visible edits must remain editable ChatCut project state: source assets plus timeline items, trims, captions, audio items, overlays, effects, and ChatCut export when a rendered file is needed.

Nexts cannot ask the browser/editor tab to pick, relink, upload, or capture local files as a substitute for connector import flows.

ChatCut native internal chat components do not render directly in Nexts. Convert those moments into ordinary Nexts chat or the available structured follow-up/form capability.

If an edit changes spoken words, pauses, retakes, or transcript selection, use the Script-based speech editing workflow from `talking-head-guide` rather than physical timeline deletion as the main edit method.

When captions are enabled, complete one coherent stage of timeline or transcript work before refreshing them: after batched `apply_script`, `clean_script`, or `manage_transcript` with `action:"fix"` calls, run `edit_captions` with `action:"refresh"` once before caption-specific edits or claiming caption correctness. Do not refresh between individual mutations or when captions are disabled; honor a tool-returned caption-refresh notice at the next completed work boundary.

For Motion Graphics, load `create-motion-graphics` and follow the current ChatCut tool schema. Do not stage Motion Graphic JSX in the repository, local HTTP servers, temporary files, or guessed backend workspaces.

Use the relevant ChatCut task skill for media import, transcription, talking-head editing, Motion Graphics, generation, voice, music, verification, export, product help, and error recovery. Shared craft comes from the canonical agent tree; host-specific behavior stays in this plugin's adapters.
