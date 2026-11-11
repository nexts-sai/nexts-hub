---
name: filmcraft-export
description: Save and export an existing FilmCraft sequence as requested video, audio, subtitles or supported interchange, and resume/check render jobs without recutting or regenerating media.
---

# FilmCraft Export and Delivery

Adapted from ChatCut `export/SKILL.md`; see [provenance](../../references/chatcut-adaptation/README.md). Follow the [shared contract](../../references/workflow-contract.md). An export-only request preserves existing editing and captions.

1. Save the intended working project. Inspect the exact sequence, active editor target, range, canvas/fps, audio and caption tracks. Pass an explicit sequence id where supported and verify the visible/active target agrees. Do not select an unrelated latest sequence or export every version by default.
2. Discover current export/resolve schemas and supported formats. Use requested settings; otherwise preserve source/sequence settings with the existing H.264 MP4 default for video. Audio-only, SRT-only, transparent graphics or NLE interchange require their actual supported export capability. Never imply XML is a lossless native project round trip or a transparent codec exists without evidence.
3. Use unique absolute workspace output paths with existing parents. Respect requested burn-in versus sidecar captions. For SRT, verify the correct active sequence and caption track before export; a failed subtitle export must not be relabeled successful by quietly writing a substitute file or regenerating captions.
4. Submit once and record the returned job/queue id, target and path. Poll the matching native export job according to state guidance until terminal. Do not use a generation/transcription job endpoint or end the task just because the render is queued. After an ambiguous submission inspect the queue/state before resubmitting. Cancel only this task's explicit job when requested.
5. Terminal success must be followed by artifact checks: file exists, nonzero size, expected container/streams/dimensions/fps/duration, correct subtitle text/timing and target sequence. Use discovered dependencies for read-only probing/frame extraction. Inspect exported pixels/audio when available; successful encoding alone does not prove quality. If output is on a different machine, do not call its path a verified local attachment.
6. Deliver actual links and per-output status, warnings and remaining checks. Retain editable project/source dependencies; no cloud upload to manufacture a share link. An editing review checkpoint needs no export unless the user requested a standalone deliverable.
