# Providers and host boundary

Default provider is Nexts. Backend source contract: `nexts-account-service/src/ai/routes.ts`, `ai-multimodal-proxy.ts`; host image/video tools: `nexts-runtime/src/agent/runtime/media_gen.rs`.

| Stage | Interface | Model |
| --- | --- | --- |
| Image | Host `generate_image`; standalone POST `/images/generations` | `auto` |
| Video | Host `generate_video`; standalone POST `/video/generations`, GET `/video/generations/{id}` | `auto` |
| Narration | Host `generate_speech`; standalone POST `/audio/speech` | `elevenlabs-tts` |

Image/video fallbacks belong to the backend Auto routes. No vendor list is embedded here. The standalone video API uses `image` as an image data URI, matching the current Nexts provider implementation. For explicit ElevenLabs requests, both adapters check `/audio/voices` for `selection.ttsModel: elevenlabs-tts`, then POST `/audio/speech` with `model: auto`. This uses the exclusive Voice route and avoids treating a built-in TTS provider as an ordinary allowlisted text model. If another TTS provider is selected, stop with a specific Voice-page configuration message; never silently switch the voice. Speech language selects the backend voice; backend configuration owns the ElevenLabs API key and voice IDs.

## Standalone script authentication

Node 18+ and FilmCraft CLI are required. Normal in-app use calls host `generate_image`, `generate_video`, and `generate_speech`; the host retains session ownership and returns local assets. The speech tool requires a Nexts build including the accompanying `media_gen.rs` change.

For separately authenticated external runners only, the script reads `NEXTS_ACCOUNT_API_BASE_URL` (including `/api/v1`) and `NEXTS_ACCESS_TOKEN` from its launch environment, optionally `NEXTS_DEVICE_ID`. Tokens are never persisted or printed. HTTPS is required except for localhost. Nexts does not automatically inject these variables into arbitrary plugin scripts. The plugin does not read Nexts SQLite, keychain or token files. Do not put a token in a prompt, manifest, JSON request or CLI argument.

Example request files:

```json
{"kind":"image","prompt":"A ceramic cup on a simple studio table","size":"1024x1024"}
```
```json
{"kind":"video","prompt":"Slow camera push toward the cup","referenceImage":"C:/production/cup.png"}
```
```json
{"kind":"speech","text":"A quiet moment, made for you.","language":"en"}
```

Each request has a unique local job ID. The adapter persists `submitting` before POST, then `pending`, `complete`, or `unknown`. HTTP errors also remain non-retryable until inspected: a gateway may have accepted an upstream paid operation. Polling never resubmits. Asset downloads do not carry the Nexts bearer credential to CDNs; failed downloads retain the receipt and can be resumed with the same `generate`/`poll` call.

## Extension contract

Add a provider module alongside `nexts.mjs` exporting `submit(request)`, `poll(taskId)` and `download(receipt)`. Return `{status,taskId?,asset?}`, where asset is `{base64,mime}` or `{url}`; use explicit video fields, never thumbnail URLs. Keep credentials in the provider transport. Add contract tests for success, queued/failed tasks, ambiguous submissions, and resume without duplicate POST. Wire provider choice explicitly before exposing it to users; editing this document alone does not add an adapter.

Add video modes in `references/modes.md` or dedicated mode files, using the same production JSON and asset contract. Modes describe creative decisions, not transport credentials.
