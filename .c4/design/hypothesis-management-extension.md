# Design Note: Hypothesis Management Extension

Status: Deferred — not in scope for v1
Relevant spec: A.1.3
Raised: 2026-05-26

---

## What this is

The ability for a researcher to author, edit, and track research hypotheses within a topic — and to see how insights relate to or confirm/challenge those hypotheses over time.

In the existing signal system, hypotheses are stored as free text in `config.md` under a `hypotheses` YAML array. They are read-only in the UI (the HTML digest doesn't expose them), and there is no mechanism to link insights to hypotheses.

---

## Why it was deferred

Hypothesis management is an important research feature, but it is additive — the core pipeline (gather, fetch, process, curate, digest) works without it. The v1 scope is to prove the pipeline in teal-os before adding research meta-features. Hypotheses are also highly UX-sensitive — the interaction model (how does a researcher link an insight to a hypothesis? how do hypotheses evolve?) needs design work before it can be specced.

---

## How it might be built in Teal OS

### Hypothesis as a field (minimal)

Keep hypotheses as a `text[]` field on the `Topic` entity. Add a simple edit UI in the Topic Manager cell to add/edit/remove hypotheses. No linking to insights. This is a UI enhancement, not a new entity type.

**When to use:** If the need is simply to surface hypotheses in the app rather than in `config.md`.

### Hypothesis as an entity type (full)

Introduce a `Hypothesis` entity type in Teal Semantics. Fields: `id`, `topic_id`, `text`, `status` (`active | confirmed | rejected | revised`), `created_at`, `updated_at`. No complex flow needed — status is manually managed by the researcher.

A new `InsightHypothesisLink` join structure (or a `hypothesis_id` FK on `InsightInstance`) would allow insights to be tagged against one or more hypotheses during curation.

The digest view could then include a "hypothesis tracking" section showing: which hypotheses have supporting insights, which have counter-evidence, and which are still open.

**When to use:** When the research workflow matures to the point where hypothesis tracking is a first-class activity.

---

## teal-os-framework implications

The `Hypothesis` entity type, if implemented, is a generic pattern: "a named claim that gets confirmed, rejected, or revised through evidence gathered elsewhere in the system." This is distinct from a workflow entity (it doesn't have a linear state machine) but similar to a research annotation or tag that evolves.

This could inform a future teal-os pattern for "evidence entities" — entities that accumulate supporting or counter-evidence from other entities through a linking mechanism, rather than moving through a state machine. Worth revisiting when this feature is specced in detail.
