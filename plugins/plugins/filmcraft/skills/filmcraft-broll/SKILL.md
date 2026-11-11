---
name: filmcraft-broll
description: Add source-based B-roll cutaways or picture-in-picture overlays in FilmCraft to illustrate speech or cover jump cuts while protecting subject, text and captions.
---

# FilmCraft B-roll and Picture-in-Picture

Adapted from ChatCut's `talking-head-guide/references/b-roll.md`; see [provenance](../../references/chatcut-adaptation/README.md). Follow the [shared contract](../../references/workflow-contract.md).

1. Work on the final A-roll timing. Use B-roll for requested illustration or an identified jump-cut problem, not as a default enhancement. Prefer suitable existing project/user assets. Stock acquisition or generated visuals require the requested scope and actual tools; use [assets](../filmcraft-assets/SKILL.md) only for authorized generation.
2. Identify semantic anchors and actual final-sequence ranges. Avoid cutting away in the first/last three seconds by default unless the user's treatment calls for it. A cluster of cuts under three seconds apart often benefits from one longer cutaway. Avoid overlapping motion graphics by default.
3. Choose full-screen cutaway or PiP from explicit intent/existing style. If that consequential choice is unresolved, ask once. Keep A-roll audio continuous unless replacement audio is requested; inspect/mute B-roll source audio as appropriate.
4. Inspect the actual destination frame and representative source frames before choosing geometry. Protect faces, mouths, gestures, captions, existing overlays, products, logos, readable UI/text and document edges.
5. For PiP, compare safe destination rectangles rather than choosing a fixed corner. Use the largest readable balanced placement that leaves protected A-roll content visible. Preserve protected source content too. Native rounded corners may be used when supported and stylistically appropriate; discover units/ranges instead of copying ChatCut's borderRadius values. If the safe window is too small, choose another source moment or resolve the full-screen tradeoff.
6. For full-screen placement, compare source/canvas ratios per asset. Close ratios (roughly under 30% difference) can begin with cover, but inspect crop losses. Large differences require source inspection before crop. Use contain with an intentional supported background when cover would lose text, edge subjects or other protected information. A safe reframe may work for a compact subject; no batch cover default.
7. Discover native insertion/layer/fit/crop schemas and fresh track/clip ids. Keep original source offsets and editability. Read back the exact placed items and inspect composed frames against the source; library presence alone proves nothing. Verify entry/exit, protected regions, audio continuity and final timing before [verification](../filmcraft-verify/SKILL.md).
