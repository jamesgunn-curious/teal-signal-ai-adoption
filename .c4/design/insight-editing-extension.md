# Design Note: Insight Editing Extension

Status: Deferred — not in scope for v1
Relevant spec: E.2.1
Raised: 2026-05-26

---

## What this is

The ability for a researcher to edit an insight's `text`, `quote`, or `tags` after it has been extracted by the analysis engine — either in `extracted` or `curated` state.

The v1 curation flow is terminal: `extracted → curated | dismissed`. Editing is not a transition — it is a mutation of the insight's data in-place. This creates a tension with the Teal Flow model, which tracks state transitions but not field-level mutations.

---

## Why it was deferred

For v1, the assumption is that LLM extraction quality is high enough that curation (keep/dismiss) is sufficient. Editing adds UI complexity (edit form in the curation queue), schema complexity (audit trail of changes), and a new interaction pattern that warrants its own spec section. The workaround is re-processing the source article.

---

## How it might be built in Teal OS

Three options, each with different implications for the Teal Flow model:

### Option A — Field mutation without a transition (simplest)

Allow `PUT /api/insights/{id}/data` to update `text`, `quote`, and `tags` directly, bypassing Teal Flow. Track an `edited_at` timestamp and `edited_by` user reference on the insight row.

**Tradeoff:** Simple to build. But field mutations are invisible to the flow engine — they don't appear in the transition log. The insight's state doesn't change, only its data. This is consistent with how other entity field updates work in most systems, but it diverges from the "all meaningful changes go through Teal Flow" principle.

### Option B — Self-transition with edit inputs (Teal Flow native)

Add a `curated → curated` self-transition to the `insight-curation` flow with `requiredInputs: ['text', 'quote', 'tags']`. The flow engine validates the transition and records it. This keeps editing inside the Teal Flow model and creates an audit trail of every edit.

**Tradeoff:** Architecturally clean — editing is a first-class transition. But `curated → curated` is an unusual pattern (no state change). The flow manifest needs to explicitly declare it as a "mutation transition" rather than a state change, and the UI needs to surface it differently from curate/dismiss actions.

### Option C — Draft state before curating (most powerful)

Add an `editing` state between `extracted` and `curated`: `extracted → editing → curated`. The researcher can edit the insight while it is in `editing` state. On save, it transitions to `curated`. Dismissed insights cannot be edited.

**Tradeoff:** The most explicit model — editing has its own state, transitions are clear, and the flow diagram is unambiguous. But it adds a state to the flow type and the entity type, which requires updating the schema, the UI, and any filtering that uses `extracted` as "pending curation".

---

## Recommendation for when this is built

Option B (self-transition) is the most consistent with Teal Flow conventions and keeps editing auditable. Option A is acceptable for a quick win if editing is low-risk and infrequent. Option C is worth considering if the editing workflow becomes a significant part of the researcher's process.

This decision should be made at the G1 gate for the insight editing spec section — it is a structural decision that affects the flow manifest.

---

## teal-os-framework implications

If Option B is implemented, it establishes a pattern for "mutation transitions" (same-state transitions with data inputs) that is not currently present in the framework. This would be worth generalising in `teal-os-framework` once proven here.
