---
name: filmcraft-verify
description: Verify FilmCraft edits with current structure, composed frames, audio and requested artifacts; distinguish unverified quality from completed tool operations.
---

# FilmCraft Verification

Adapted from ChatCut `verification/SKILL.md`; see [provenance](../../references/chatcut-adaptation/README.md). Follow the [shared contract](../../references/workflow-contract.md); this verification dependency does not recursively invoke itself.

1. Reread only the affected project/sequence/tracks/items using current inspection tools, following pagination where needed. Verify requested order, source offsets, durations, A/V links, captions, layers, effect bindings and dependent timing. Unknown omitted data is not an empty timeline.
2. Inspect actual composed frames at the affected moments. Raw source frames support source selection but cannot prove crop, layers, subtitles, effects or motion on the timeline. Render metadata or an unviewed image path is not visual verification.
3. For speech edits, listen across seams and compare meaning; for music, inspect balance/loops; for multicam, check shared-time invariants and audiovisual sync. Static frames and waveforms alone do not prove audible quality or lip sync. Clearly label checks the host cannot perform.
4. Check initial/middle/final states plus the actual changed boundaries, settled graphics and relevant subtitle frames. If verification fails, repair within scope and recheck the changed result. If another writer changes state, stop mutations and reconcile.
5. For requested files, use [export](../filmcraft-export/SKILL.md)'s artifact checks. Distinguish editable-project success, render completion and verified output quality. Record performed checks and remaining checks in workspace QA notes. A blocked renderer or unavailable perception remains a stated gap, never an unsupported fallback or a success claim.
