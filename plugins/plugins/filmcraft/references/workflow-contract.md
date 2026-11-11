# Shared FilmCraft workflow contract

Read this with [FilmCraft editing](../skills/filmcraft-edit/SKILL.md) before executing a specialist. A specialist loaded as a dependency returns to its caller; do not restart the main router or unrelated stages.

## Execute the authorized stages

Inspect the intended visible project, active sequence and relevant source/track/clip state after host-managed readiness. Discover exact enabled command schemas, then pass `{id, params}` to `command_run`; batches contain `{steps:[{id,params}],stop_on_error:true}`. Examples and upstream API names are not executable FilmCraft contracts. Refresh ids after structural edits. Stop mutations on an unexpected project switch or concurrent writer.

Save a recoverable working copy before structural changes. Keep the original media and source sequence. Use the verified Nexts workspace and absolute paths. Call `load_workspace_dependencies` before shell helpers; use the returned Node, FFmpeg or FFprobe paths. Helpers may inspect or calculate evidence; FilmCraft remains the editor and exporter. No new bridge, headless substitution, automatic installation, hosted upload or handwritten project-file editing.

Speech cuts need actual timestamped transcription/forced alignment and source-to-sequence mapping. Plain text, silence detection and evenly divided durations are not word alignment. Visual-event edits need observed frame boundaries. A candidate plan is allowed without timing; executing guessed cuts is not. The [transcription specialist](../skills/filmcraft-transcription/SKILL.md) establishes readiness; the [talking-head specialist](../skills/filmcraft-talking-head/SKILL.md) governs speech edits.

Resolve structure and timing before dependent captions, B-roll, music or graphics. Include only requested finishing stages. Preserve explicit review checkpoints; an authorized end-to-end task does not need repeated approval of the same scope. Plan-only means no mutation. Editing alone normally delivers an editable timeline; export only requested standalone deliverables.

## Continue without false completion

Record each stage's target ids, output paths, job id and actual state in workspace task notes. Observe an existing pending/running job according to its check-back guidance; do not end an authorized task merely because submission succeeded. Give concise progress while waiting. A terminal failure, unavailable capability, cancellation or genuinely required user decision is a concrete blocker, not success. Continue independent authorized work where possible; never loop indefinitely on an unchanged error.

On timeout or lost response, inspect state/history/jobs before retrying. Batches are not atomic: preceding steps may have succeeded. Resume the first incomplete stage, never replay completed imports, generation, edits or renders. Cancel only known task job ids when requested. Do not undo intervening user edits.

Missing capability blocks the affected operation. Explain the specific limitation and any materially different alternative; never silently substitute another treatment or invent parameters. [Verification](../skills/filmcraft-verify/SKILL.md) requires structural readback and actual composed pixels/audio where relevant. [Export](../skills/filmcraft-export/SKILL.md) requires terminal success and verified artifacts. Report what was checked and what remains unverified.
