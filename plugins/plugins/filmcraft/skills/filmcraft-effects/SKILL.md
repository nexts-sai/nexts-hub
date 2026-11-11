---
name: filmcraft-effects
description: Apply scoped FilmCraft effects, transitions, masks, punch-ins, reframing and color/LUT treatments using existing native capabilities before considering custom generation.
---

# FilmCraft Effects, Transitions and Color

Adapted from ChatCut `shader-gen/SKILL.md` catalog-first, placement and LUT sections; see [provenance](../../references/chatcut-adaptation/README.md). Follow the [shared contract](../../references/workflow-contract.md).

- Inspect the exact target clip/range, intended visual result, canvas, existing effects and color state. Discover native effects/transitions/presets first. A provided LUT or existing suitable preset is application, not generation. Do not copy ChatCut builtin ids, shader schemas or numeric defaults.
- Distinguish appearance/grade, visibility mask/reveal, reframing/zoom and a transition between adjacent clips. Discover their actual target binding, property types and time units. Patch only requested properties; do not replace unrelated existing settings.
- Default an effect/LUT request to the intended timeline instance. Source-wide normalization affects every reuse and needs explicit scope. Verify which scope the actual operation changes before applying it.
- A whole-clip effect follows that clip when supported; a range/adjustment effect has its own timeline bounds. Recheck those bounds after trims or moves. For a transition inspect both neighboring clips and available source handles; never manufacture handles past source tails or alter speech to make an effect fit.
- For punch-ins/crop, protect the subject and readable information at all relevant frames. For LUT/grade, inspect source color information and existing normalization to avoid applying conversion twice. Use the actual intensity range and compare representative skin tones, highlights and shadows.
- Use custom effect generation only if the task needs it and an advertised authorized host capability exists. Missing generation is not permission to invent GLSL/JSX injection or silently replace the editor with a local render. Do not advertise catalog-only effects as custom shader support.
- Read back attachment, parameters and timing; inspect composed before/during/after frames, including transition midpoint. Check audio continuity if duration changed. Preserve originals and finish with [verification](../filmcraft-verify/SKILL.md); a successful mutation is not visual proof.
