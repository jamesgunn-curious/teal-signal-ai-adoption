---
c4_type: flow
flow_id: insight-curation
agent_id: insight-curation-agent
name: Insight Curation
parent_cell: teal-flow
version: 0.1.0
used_by: [insight]
---

# Insight Curation — Flow Manifest

## What this flow type defines

The researcher curation lifecycle for extracted insights. Simple two-branch terminal flow — an insight is either curated (surfaced in digest) or dismissed (excluded). All transitions are user-initiated via the insight curation queue.

## State machine

```
      extracted
     ╱          ╲
[Curate]      [Dismiss]
  ╱                  ╲
curated            dismissed
(terminal)         (terminal)
```

## Transition definitions

| From | To | Allowed roles | Required inputs | Label |
|------|----|---------------|-----------------|-------|
| `extracted` | `curated` | researcher | — | Curate |
| `extracted` | `dismissed` | researcher | — | Dismiss |

## Validation rules

- Both `curated` and `dismissed` are terminal in v1.
- Editing a curated insight's text or tags is a 🟠 open decision (spec E.2.1) — not currently a transition, but may become one (e.g. `curated` → `curated` self-transition with an edit action, or a separate `edited` flag). Do not implement before resolving E.2.1.
- A transition is invalid if the actor's role is not `researcher`.

## The curation queue

Insights in `extracted` status are surfaced in the curation queue, ordered by article (most recently processed first). The queue displays:
- Insight text and quote
- Article title and source
- Suggested tags (from analysis engine)
- Which digest section the insight would appear in (based on tags)

## Side effects

- On `curated`: insight appears immediately in digest view
- On `dismissed`: insight is removed from curation queue and excluded from digest view (but accessible with explicit `dismissed` filter)
- Insight counts by status update on topic dashboard on any transition

## Deferred extensions

- **Re-opening dismissed insights**: Allowing `dismissed` → `extracted` would make the flow non-terminal. Not in scope for v1 — the workaround is re-processing the source article.
- **Bulk curation**: "Curate all" or "Dismiss all" for a set of insights. In scope as batch action but not yet specced.
- **Insight editing**: Editing `text`, `quote`, or `tags` post-extraction. Open decision at E.2.1 — implement only after resolving.

## Agent change protocol

Before implementing any change to this flow type, the insight-curation-agent **must** clarify:

- [ ] Does the change make `curated` or `dismissed` non-terminal? The digest view assumes `curated` is terminal — making it revisable changes the semantic contract with the digest cell.
- [ ] Does the change add insight editing? This is a 🟠 open decision (E.2.1) — resolve it in the spec and update this manifest before implementing.
- [ ] Does the change affect what appears in the digest? The digest view reads `curated` insights directly — coordinate with the digest-view-agent.
- [ ] Does the change add a new state between `extracted` and the terminal states? This complicates the curation queue UI — coordinate with the curation queue agent.
