---
name: workflow-authoring
description: Author a durable Nexts workflow for prepare_workflow — node types, the required JSON shape, graph and capability rules, the create/publish/run lifecycle, and how to fix validation errors. Load before building any non-trivial workflow.
---

# Workflow Authoring

Use this skill when the user asks to create, build, or schedule a reusable
**workflow** (a durable visual graph that can run later, on a trigger or a
schedule). It describes exactly what `prepare_workflow` accepts and what the
client will accept without a validation error. It does **not** cover one-off
expert creation (`create_expert`) or running an existing workflow
(`request_workflow_run`).

Call `prepare_workflow` only after the **trigger** and the **desired outcome**
are clear. Ask only for materially missing trigger/outcome details first; do not
interrogate the user for things you can infer. Do not answer a workflow request
with only a prose SOP — produce a real graph.

## The shape `prepare_workflow` accepts

Top-level object:

- `name` (1–120), `summary` (1–500).
- `requiredServices`: `[{ service, displayName }]` — only for **external
  connected-application** operations (e.g. a mail or CRM service).
- `requiredTools`: `[{ toolRef, displayName }]` — `toolRef` MUST be one of the
  enabled plugin/MCP refs listed in the `prepare_workflow` tool description this
  turn (`plugin:<id>:<tool>` or `mcp:<server>`). Never invent one.
- `requiredSkills`: `[{ skillRef, displayName }]` — `skillRef` MUST be one of the
  enabled skill refs listed this turn.
- `schedule` (optional, required only for **timed** workflows):
  `{ kind: "cron" | "interval" | "once", expr?, interval_minutes?, timezone?,
  description? }`. Use a standard **five-field** cron expression in `expr`; for
  `once`, `expr` is unix seconds; for `interval`, set `interval_minutes` (≥1).
  Omit `schedule` entirely for manually-triggered workflows. Never encode timing
  only in a node label.
- `nodes` (≥2): `[{ id, kind, position: {x, y}, data: { label, ... } }]`.
- `edges`: `[{ id, source, target, source_handle?, target_handle? }]`.

### Node `data` fields (by kind)

Every node needs `data.label`. Add fields only for the node's kind:

- **start** — entry. Declare every value the user must supply at run time as
  `input_fields`:
  `[{ key, label, type, required?, description?, placeholder?, options?,
  default_value? }]`. `key` matches `^[a-zA-Z_][a-zA-Z0-9_]*$` and is unique.
  `type` ∈ `text | paragraph | number | datetime | select | boolean |
  file_path | candidate_list`. For `select`, `options` is non-empty. Do **not**
  hide a required input only in a description or a JSON example.
- **end** — terminal.
- **agent** — a general AI step. Give a complete runnable `prompt`.
- **expert** — a capability-backed or local-expert step. Give a complete
  `prompt` that says exactly what to do, with the fixed arguments from the
  request. For enabled plugin/MCP capabilities set `tool_refs` (exact enabled
  refs) and mirror them in top-level `requiredTools`. For enabled skills set
  `skill_refs` and mirror them in `requiredSkills`. Never invent an
  `assistant_id`; the client matches a suitable local expert or uses general AI.
- **action** — a connected-application operation. Set `service`, a precise
  `operation_intent`, and known fixed `action_input` values. The client resolves
  the real catalog operation and connection after connection — do not invent
  `action_ref`, `connection_id`, or catalog IDs.
- **condition** — branching. Set `condition` (e.g. `$run.approved`). It must
  have both a `true` and a `false` outgoing edge (see Graph rules).
- **approval** — a human gate. Set `approval_message`.
- **parallel** — fan-out to several branches.
- **iteration** — loop over items. Optional `iteration_max_items` (1–100),
  `iteration_prompt`.
- **knowledge** — local RAG. Set `knowledge_paths` (non-empty); optional
  `knowledge_query`, `knowledge_top_k` (1–20).

Optional on any node: `description`, `input_mapping`, and for action nodes
`failure_policy` (`stop | retry | continue`), `retry_max_attempts` (1–5),
`retry_backoff_seconds` (1–60). Use `retry` only for safe, idempotent actions.

## Choosing the right node

- General AI reasoning/writing with no external capability → **agent**.
- An enabled plugin / MCP / skill capability → **expert** with exact
  `tool_refs` / `skill_refs` (+ matching `requiredTools` / `requiredSkills`).
- A connected external application (mail, CRM, calendar, …) → **action** with
  `service` + `requiredServices`. Before using a service, call
  `connected_apps_list` and `connected_apps_search_actions`, and use only a
  returned service and operation.
- Local-device capabilities (Chrome, Computer Use, shell, filesystem) are **not**
  connected applications. Never model them as an action `service` such as
  `local_system` or `computer_use` — that is rejected. Use the matching enabled
  plugin/MCP `tool_ref` on an **expert** node instead.

## Graph rules (the client rejects a graph that breaks any of these)

- Exactly **one** start node and **one** end node. No duplicate node `id`s.
- The graph is a **DAG**: no self-loops, no duplicate edges, no cycles.
- Every node (when there is more than one) is connected by at least one edge.
- Every edge's `source`/`target` references an existing node.
- **agent** node: has a non-empty `prompt` (or non-empty messages).
- **expert** node: has a `prompt` (no invented `assistant_id` required).
- **action** node: has a real capability — either a `plugin:`/`mcp:` `tool_ref`,
  or a resolvable `service`/operation. An `mcp:<server>` ref alone is not enough;
  it must name a tool. (The client fills `connection_id` after connection.)
- **condition** node: has a non-empty `condition` and both a `true` branch and a
  `false` branch (set each branch edge's `source_handle` to `true:*` / `false:*`).
- **approval** node: has a non-empty `approval_message`.
- **knowledge** node: has at least one `knowledge_path`.

Default a simple graph to a left-to-right line: `start → … → end`. The client
auto-lays-out positions, so approximate `x/y` is fine.

## Capability discipline (no hallucinated capabilities)

Build capability-dependent steps **only** from the exact enabled plugin, MCP,
skill, or connected-application capabilities visible this turn. Never invent a
`toolRef`, `skillRef`, application service, action, or capability. If no real
capability can perform a requested step, **stop and explain what is missing**
instead of calling `prepare_workflow`.

## Lifecycle — do not over-confirm, do not over-claim

1. You call `prepare_workflow`. This only *prepares* a graph.
2. The client shows a capability card and, once any required external
   connections are ready, **creates and publishes the workflow automatically**.
3. The user's request to create the workflow authorizes its capabilities.

Therefore: never ask the user to confirm, authorize, review, or submit the card,
and never claim the workflow is created until the client reports success. After
calling `prepare_workflow`, stop.

To **run** an existing published workflow the user references as
`workflow://<id>`, use `request_workflow_run` with the exact ID and only inputs
the user actually supplied — that prepares a run form; it does not execute, and
the user starts the run.

## Fixing a rejected workflow

If `prepare_workflow` (or the client) reports an error, fix the specific cause
and re-prepare — do not fall back to prose:

- *Unavailable tool/skill capability* → remove it or swap to an enabled ref from
  this turn's list.
- *Local-device action service* → move the step to an expert node with the real
  plugin/MCP `tool_ref`.
- *Missing start inputs* → add the missing `input_fields` on the start node.
- *Cycle / disconnected / wrong start-end count* → repair the edges so the graph
  is a single connected DAG with one start and one end.
- *Condition without both branches* → add the missing `true`/`false` branch edge.
- *Timed workflow without schedule* → add a structured `schedule` with a valid
  five-field cron expression.
