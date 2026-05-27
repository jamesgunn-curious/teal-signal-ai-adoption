## ADR-001: All state transitions are user-initiated via the UI

**Status:** Accepted
**Date:** 2026-05-26
**Deciders:** James Gunn

### Context

The existing signal pipeline uses Python scripts that run automatically to transition articles through states: a gather script creates `discovered` entries from RSS feeds, a fetch script retrieves content, and a process script runs LLM analysis to extract insights. These scripts are run from the command line and write directly to flat JSON files.

This creates several problems: no visibility into what state each article is in mid-run; impossible to intervene or inspect between steps; no audit trail; no way to selectively process specific articles without editing the scripts; the pipeline is brittle (a fetch failure rolls back no partial work).

### Decision

All state transitions in the Teal OS implementation are user-initiated via the UI. Server actions or API routes do the actual work (RSS fetching, HTTP content retrieval, Claude API analysis), but a human explicitly triggers each step. No automated background jobs or cron-based execution in the initial implementation.

### Alternatives considered

| Option | Reason rejected |
|--------|----------------|
| Fully automated pipeline (cron / background job) | Replicates the visibility and control problems of the current scripts. Removes the researcher's ability to intervene between steps. |
| Hybrid (auto-gather, manual process) | Inconsistent mental model — some transitions are human-controlled, some aren't. Complicates the Teal Flow definition and the UI. |

### Consequences

**Positive:** Full visibility and control at each stage. Researcher can inspect state at any point. All transitions are auditable. Selective processing (fetch this article, skip that one) is the natural default, not an edge case.

**Negative/risks:** More deliberate steps than the automated pipeline. Mitigation: batch actions (e.g. "gather all sources", "fetch all discovered", "process all fetched") are explicitly in scope — they are still user-initiated, just applied to multiple instances at once. The batch action spec is tracked as a 🟠 in `docs/blueprint.md`.

### Spec refs

BDD Sections B (Article Gather), C (Article Fetch), D (Article Processing), E (Insight Curation)
