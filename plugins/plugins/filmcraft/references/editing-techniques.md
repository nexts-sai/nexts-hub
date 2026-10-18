# FilmCraft editorial techniques

Use this reference with one of the style Skills. It describes editorial decisions; `filmcraft-edit` discovers the actual FilmCraft MCP commands and applies them.

## Shared workflow

1. Inspect media metadata and the current project before editing. For source footage, identify speech, pauses, repeated takes, key actions, usable B-roll, music beats, and continuity risks.
2. Write a compact edit plan before mutation: keep/drop ranges, shot order, target duration, aspect ratio, captions, graphics, audio layers, and export requirements. Keep decisions and review outputs in the current Nexts temporary workspace.
3. Build a first cut with hard cuts and only the essential audio. Review timing and story before adding effects.
4. Add B-roll, captions, cards, motion, transitions, and color adjustments as separate passes. Each pass must have a reason and must be inspectable in the timeline.
5. Render a review preview, check the first hook, speech intelligibility, caption timing, safe areas, visual continuity, and ending. Then export the requested delivery and inspect the exported media.

## Effects and motion

- Prefer motivated cuts, match cuts, J-cuts/L-cuts, punch-ins, crop/reframe, speed changes, and simple opacity or transform keyframes.
- Use zooms, pans, and position changes to support the speaker, product, or action. Use a short easing curve; do not add constant motion to every shot.
- Use content cards for titles, lower thirds, statistics, quotes, chapter markers, and calls to action. Keep one hierarchy: title, supporting detail, then source or CTA.
- Use transitions to signal a change in time, place, or idea. Default to a cut; use a dissolve, wipe, blur, or whip only when the visual reason is clear.
- Treat filters, color looks, sound effects, and music as reviewable candidates. Never claim that a named effect exists until the MCP command list confirms it.

## Audio and captions

Keep dialogue or narration intelligible above music and effects. Use J-cuts and room tone to hide edits in speech. Captions must follow actual audio timing, fit the frame safe area, and remain readable at the target resolution. Mark estimated timings as unreviewed until listened to.

## Review boundary

The Skill may propose several candidates for a look, cut, card, or motion treatment. Apply a candidate only after its required command and parameters are discovered. If FilmCraft lacks a requested effect, report the missing capability and choose a simpler supported treatment; do not simulate success with an undocumented command.
