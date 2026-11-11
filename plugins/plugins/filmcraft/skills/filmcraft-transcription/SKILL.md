---
name: filmcraft-transcription
description: Establish or repair timestamped source and sequence transcripts for FilmCraft speech edits and captions, or deliver transcription only without changing the cut.
---

# FilmCraft Transcription

Adapted from ChatCut `transcription/SKILL.md`; see [provenance](../../references/chatcut-adaptation/README.md). Follow the [shared contract](../../references/workflow-contract.md).

1. Identify the exact source or sequence, audio stream, language and existing transcript state. Reuse ready transcripts; distinguish source time from the edited sequence clock. A transcription-only request does not authorize cuts or captions.
2. If media is absent, use [asset import](../filmcraft-import/SKILL.md). Inspect actual local transcription models and enabled source/sequence transcription schemas. Missing model readiness is a dependency, not no-speech. Do not silently download a model or use remote ASR.
3. Start only idle or explicitly failed work when transcription is part of the requested task. FilmCraft start commands are not assumed idempotent. Inspect existing jobs before submission, retain the returned job id, and wait on that job. One pending response is not a stuck run. Upstream's duration-based patience rule is a diagnostic heuristic: allow roughly max(5 minutes, min(60 minutes, twice source duration)), or 10 minutes when duration is unknown, before investigating apparent stalls; an explicit failure needs immediate diagnosis. Do not automatically resubmit after this interval.
4. No audio/no speech is a valid analysis outcome. Check the intended stream if evidence suggests speech should exist; otherwise return that result without fabricated text or retries.
5. Read actual text/timestamps, units, word-address format and source identity. Verify mapping at the beginning, middle and end, including repeated uses of one source. Preserve timing provenance. Plain-text output may satisfy a text-only transcript request but cannot unlock synchronized captions, speech cuts or multicam alignment.
6. Correct source transcript errors only when the audio supports the correction. Caption display wording is a separate operation in [captions](../filmcraft-captions/SKILL.md). Do not overwrite source speech to implement a display preference. After source or timeline changes, reread mapping and refresh dependent captions once the coherent edit stage is complete.

Return the ready transcript and timing evidence to the calling workflow. Report partial coverage, unclear speakers and unavailable word alignment explicitly.
