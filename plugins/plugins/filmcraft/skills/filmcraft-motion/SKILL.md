---
name: filmcraft-motion
description: Create and place editable titles, lower thirds, quote emphasis, chapter markers, data graphics and explanatory motion in FilmCraft using supported native capabilities.
---

# FilmCraft Motion Graphics

Adapted from ChatCut `create-motion-graphics/SKILL.md` (editorial/design sections) and talking-head `references/motion-graphics.md`; see [provenance](../../references/chatcut-adaptation/README.md). Follow the [shared contract](../../references/workflow-contract.md).

1. Resolve viewer purpose, exact content, final speech/event timing, placement, visual language and editable fields. Inspect the actual target frame; transcript alone cannot choose composition. Follow an established style or user reference. If a missing style decision materially affects a batch, use available real presets or one representative sample; honor an explicit instruction to proceed without a style checkpoint. Do not save an unconfirmed guess as the project's confirmed style.
2. Classify the graphic: identity/context label, quote/key term, statistic, list/comparison/diagram, chapter marker or concept visualization. Shared palette/type/motion does not mean every graphic should be the same card. Reuse assets only for the same intentionally recurring viewer job and structure.
3. Decide content, absolute timeline anchor, internal relative reveal timing, form and background. Actual word timings are required for speech-synchronous reveals. Allow enough settled reading time before exit. Overlay graphics should have a local bounding box and transparent background where supported; full-screen beats intentionally own the frame and may be opaque.
4. Discover FilmCraft's native title/shape/keyframe/template or editable-graphics controls before implementation. Do not submit ChatCut JSX, `item.props`, CSS, design-style APIs or code-generation requests to invented FilmCraft commands. If the requested form exceeds native capability, report that gap and resolve a simpler supported form; do not flatten the whole edit to emulate it.
5. Expose text, color, numbers and asset choices as editable native properties where supported. Use fonts available to the actual renderer and verify multilingual glyphs. Protect face, mouth, gesture, products, existing graphics and caption band for overlays. Prefer deliberate position/size over a fixed corner; a full-screen beat has a different purpose.
6. Design the settled composition first, then motion that follows the chosen style. Do not add glows, sweeps or cards as automatic polish. Keep animation within the placed duration. After timing changes, repair the graphic's internal beats instead of truncating them blindly.
7. Read back the placed graphic, then inspect entry, settled and exit frames. Compare multiple frames before calling an intermediate reveal missing or clipped. Check content, reading hierarchy, bounds, glyphs and protected regions. Compare batch graphics for a shared visual language; adjust size/position first, then form if needed. Library creation alone is not placement success.
