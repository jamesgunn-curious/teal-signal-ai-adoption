## ADR-006: Pipeline screen — consolidate Sources, Discover, Gather, Analyse into one tab

**Status:** Accepted
**Date:** 2026-05-31
**Deciders:** James Gunn

---

### Context

The nav had six tabs: Sources · Discover · Article queue · Review · Narratives · Digest.

The first four — Sources, Discover, Article queue (which contains Gather and Analyse actions) — all relate to the same pipeline half: finding articles, fetching their content, and extracting insights. Keeping them as separate tabs created duplication (sources are context for discover; discover feeds the queue; the queue drives gather and analyse) and meant the researcher had to move between tabs to do related work.

The second half — Review · Narratives · Digest — is distinct: it operates on already-extracted insights rather than article ingestion.

---

### Decision

Consolidate Sources + Discover + Article queue into a single **Pipeline** tab.

**New nav (4 tabs):**
```
Pipeline  |  Review  |  Narratives  |  Digest
```

**Chosen layout: Option A — pipeline bar + expandable sources + article list**

```
PIPELINE
────────────────────────────────────────────────────────────────
  [↻ Discover]   0 discovered  →  [Gather 66]   66 gathered  →  [Analyse 66]   49 analysed
  11 active feeds · 14d lookback · last run: yesterday

  Sources  11 active  [▾ expand]  [+ Add]
  ─────────────────────────────────────────  ← expands to show source rows inline

  ─ Article queue ─────────────────────────────────────
  [All] [Discovered 0] [Gathered 66] [Analysed 49] [Paywalled] [Failed]

  • article rows...
```

**Actions available from this single screen:**

| Action | Trigger | Condition |
|---|---|---|
| Discover (run RSS scan) | Pipeline bar `[↻ Discover]` button | Always available |
| Gather N (bulk fetch content) | Pipeline bar `[Gather N →]` button | discovered > 0 |
| Analyse N (bulk run model) | Pipeline bar `[Analyse N →]` button | fetched > 0 |
| Add source | `[+ Add]` in sources section | Always |
| Expand/collapse sources | `[▾ expand]` toggle | Always |
| Edit source | Per-source row action | Sources expanded |
| Pause/resume source | Per-source row action | Sources expanded |
| Remove source | Per-source row action | Sources expanded |
| Filter articles by status | Pill filter row | Always |
| Gather single article | Per-article action | Article is `discovered` |
| Analyse single article | Per-article action | Article is `fetched` |
| Mark as paywalled | Per-article action | Article is `discovered` or `fetched` |
| Archive article | Per-article action | Any status |
| Open article detail | Click article title | Always (Phase 6) |

---

### Options considered

**Option A — Pipeline bar + expandable sources + article list** ← chosen

Compact top section. Sources hidden by default (shown on demand). Pipeline bar makes the "what to do next" obvious at a glance. Best for daily-use workflow.

**Option B — Two-column split (sources left, actions right) + article list below**

Sources always visible — better when actively managing feeds. More vertical space consumed before the article list. Better for an initial setup phase, less good for daily research use.

**Option C — Visual pipeline tiles (each step = clickable tile + action)**

Most visual, maps to the pipeline mental model. Each tile doubles as a status filter and action trigger. More opinionated, highest implementation effort. Good candidate for a future refinement once Option A proves out.

---

### Consequences

**Positive:**
- Single surface for all article ingestion work
- Key actions (Discover, Gather, Analyse) visible and reachable without tab-switching
- Sources are accessible but not in the way
- Nav reduced from 6 → 4 tabs; each tab now maps to a distinct workflow phase

**Negative/risks:**
- Single page does more — more server data to fetch on load (sources + pipeline counts + articles)
- Sources expand/collapse adds client state to what is otherwise a server component
- Phase 5 (bulk selection) and Phase 6 (article detail) become more important as the queue is now the only article surface

### Spec

`specs/2026-05-31-pipeline-consolidation/spec.md`

### Supersedes

Navigation structure from ADR-005. The 6-tab nav is replaced by the 4-tab nav described here.
