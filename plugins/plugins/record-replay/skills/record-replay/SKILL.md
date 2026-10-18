---
name: record-replay
description: Record a user's browser demonstration, compile it into an OpenAdapt Flow workflow, replay with new parameters, or export the workflow as an official Agent Skill or MCP server. Use for repeatable browser tasks and existing recordings.
---

# Record & Replay

Use the plugin's `flow_*` MCP tools. The implementation uses local OpenAdapt Flow 2.0.0. Native Windows/macOS/Linux recording is not exposed by this version.

## Record and compile

1. Call `flow_status`. If unavailable, report the local log path and the setup instructions in the plugin README. Do not install dependencies silently or substitute a sandbox demonstration.
2. Establish the target URL and the fields to vary. `param_fields` are HTML field names/IDs whose recorded defaults can be overridden later. Pass sensitive field names/IDs as `secret_fields`; password fields are handled by Flow. Screenshots and other page text may still contain sensitive content.
3. Call `flow_record` with a fresh recording ID, URL and field names. A real visible browser opens. The USER performs the demonstration; do not invent or perform their recording for them. Return the job ID and let the user demonstrate.
4. When the user finishes, call `flow_stop_recording`, then poll `flow_job` until completed. Do not kill the recorder to save it. If the user closes the browser, poll for completion.
5. Call `flow_compile` with the completed recording ID and a fresh workflow ID. Poll before using the compiled artifact. Failed/partial directories are not valid completed recordings or workflows.

## Replay

Use `flow_list` to discover IDs, readiness and parameter names (recorded values are withheld). Use only ready artifacts. Secret parameters come from locally configured `OPENADAPT_FLOW_SECRET_<UPPERCASE_FIELD>` environment variables, not ordinary replay parameters; direct the user to configure them locally without pasting secrets into chat. Replay operates the actual target application and can create external effects: establish the user's intended target, inputs and authorization before invoking it. Respect Nexts tool permissions. Do not use this plugin to submit Canvas model-generation requests; those remain manual Canvas actions.

Call `flow_replay` with the workflow ID, explicit target URL, parameter values and a fresh `request_id` for that user-authorized operation. Reuse the SAME request ID when recovering an ambiguous tool response. Never generate a new ID simply to retry a failed or uncertain operation. Poll `flow_job`; do not run multiple recordings/replays concurrently.

- `COMPLETED_UNVERIFIED`: steps finished; the business result was not independently checked.
- `VERIFIED` and `verified: true`: checked success. Do not infer this from exit code 0.
- `RECONCILIATION_REQUIRED`, interruption or cancellation: changes may already exist; a person must inspect before retrying. Cancellation does not roll back.
- `failed`: show the local log/report path and investigate; do not call it a successful replay.

`flow_cancel` stops the executor process tree. `flow_stop_recording` is the graceful save action for recording.

## Export

Call `flow_export` with `format: skill` or `format: mcp` and poll. These invoke upstream `emit-skill` and `emit-mcp`, including their copied workflow bundles. Return `artifact_path`. Exported content may contain private recorded values and screenshots: keep it local unless the user explicitly requests sharing. Export does not install or enable the result. An exported MCP server requires the Python `mcp` package as well as Flow/browser dependencies.

## Data boundary

Artifacts and executor diagnostics stay in the configured local data root, outside the plugin package. Nexts owns permissions, project/task state and account data. Do not upload recordings, parameters, screenshots or reports to account services. Model-assisted grounding is not enabled by this adapter. The website being operated still uses its own network connections.
