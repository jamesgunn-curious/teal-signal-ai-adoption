# Build plan: UI Redesign

**Spec:** `specs/2026-05-29-ui-redesign/spec.md`
**ADR:** ADR-005
**Date:** 2026-05-29
**Touchpoint classification:** Bounded — cross-cell (UI layer touches sources, articles, insights cells), but contracts already documented in manifests. No semantics/flow layer changes.

---

## Open decisions (resolve before starting affected phase)

| # | Decision | Phase blocked | Options | Recommendation |
|---|---|---|---|---|
| D1 | ~~Topics nav link~~ | ~~Phase 2~~ | — | **Resolved:** Topics nav removed entirely. No screen, no link. Re-introduce when multi-topic is in scope. |
| D2 | What does `/dashboard` become after Gather moves out? | Phase 4 | (a) dissolve → redirect (b) pipeline overview only (c) rename | (b) keep as pipeline overview, strip sources table — revisit after Phase 3 chrome lands |
| D3 | How to add client selection state to server-rendered article queue? | Phase 5 | (a) full client component (b) thin client wrapper (c) URL state | (b) `ArticleQueueClient` wrapper — keeps data fetching server-side |

---

## Build sequence

### Phase 1 — Status token system
*Foundation for all other phases. No UI is rebuilt until this exists.*

| Step | Work | Agent | Parallel? |
|---|---|---|---|
| 1.1 | Create `src/lib/status-tokens.ts` — token map for all 14 status values | `[agent: entity-agent/article]` + `[agent: entity-agent/insight]` | — |
| 1.2 | Add CSS custom properties to `src/app/globals.css` — colour + texture per status | `[agent: entity-agent/article]` | after 1.1 |
| 1.3 | Create `src/components/ui/status-chip.tsx` | `[agent: api-agent]` | after 1.2 |
| 1.4 | Replace inline status Tailwind combos in `articles/page.tsx`, `insights/page.tsx`, `dashboard/page.tsx` with `<StatusChip>` | `[agent: api-agent]` | after 1.3 |

*Manifests to read before coding: `.c4/entities/article.md`, `.c4/entities/insight.md`*

---

### Phase 2 — Sidebar / nav restructure
*Can start immediately after Phase 1 is complete. No data layer changes.*

| Step | Work | Agent | Parallel? |
|---|---|---|---|
| 2.1 | Resolve D1 (Topics nav target) | — | before 2.2 |
| 2.2 | Rewrite `src/components/nav/sidebar.tsx` — brand cluster + grouped nav + inline role toggle | `[agent: cell-agent/ui]` | — |

*Manifests to read: `.c4/cells/` (all)*

---

### Phase 3 — Per-screen header chrome
*Can run in parallel with Phase 2 after Phase 1 complete.*

| Step | Work | Agent | Parallel? |
|---|---|---|---|
| 3.1 | Create `src/components/ui/page-header.tsx` | `[agent: api-agent]` | parallel with Phase 2 |
| 3.2 | Add PageHeader to `dashboard/page.tsx`, `articles/page.tsx`, `insights/page.tsx`, `digest/page.tsx` | `[agent: api-agent]` | after 3.1 |

---

### Phase 4 — Dedicated Gather screen
*Depends on Phase 2 (nav link) and Phase 3 (PageHeader).*

| Step | Work | Agent | Parallel? |
|---|---|---|---|
| 4.1 | Resolve D2 (what dashboard becomes) | — | before 4.2 |
| 4.2 | Create `src/app/gather/page.tsx` — source list + run gather button | `[agent: cell-agent/gather]` | — |
| 4.3 | Move `DiscoverButton` to gather page; strip from dashboard | `[agent: cell-agent/gather]` | after 4.2 |
| 4.4 | Update dashboard (`/dashboard`) — pipeline overview only, strip sources table | `[agent: cell-agent/gather]` | after 4.3 |

*Manifests to read: `.c4/cells/gather.md` (if exists), `.c4/entities/source.md`*

---

### Phase 5 — Bulk selection + contextual action bar
*Depends on Phase 1 (StatusChip). Independent of Phases 2–4.*

| Step | Work | Agent | Parallel? |
|---|---|---|---|
| 5.1 | Resolve D3 (client state approach) | — | before 5.2 |
| 5.2 | Create `ArticleQueueClient` wrapper component with selection state | `[agent: cell-agent/articles]` | — |
| 5.3 | Add checkboxes + select-all to article rows | `[agent: cell-agent/articles]` | after 5.2 |
| 5.4 | Build contextual bulk action bar (appears on selection) | `[agent: cell-agent/articles]` | after 5.3 |
| 5.5 | Wire fetch/process actions to server actions; add progress feedback | `[agent: cell-agent/articles]` | after 5.4 |
| 5.6 | Remove `BulkActions` from dashboard header | `[agent: cell-agent/articles]` | after 5.5 |

*Manifests to read: `.c4/entities/article.md`, `.c4/flows/article-ingestion.md`*

---

### Phase 6 — Article detail screen
*Independent of Phases 2–5. Can start any time after Phase 1.*

| Step | Work | Agent | Parallel? |
|---|---|---|---|
| 6.1 | Create `src/app/articles/[id]/page.tsx` | `[agent: cell-agent/articles]` | — |
| 6.2 | Add PageHeader with back link + article stats | `[agent: cell-agent/articles]` | after 6.1 |
| 6.3 | Render article metadata, summary, tags, insights list | `[agent: cell-agent/articles]` | after 6.1 |
| 6.4 | Inline status-appropriate action buttons (fetch / process / archive) | `[agent: cell-agent/articles]` | after 6.1 |
| 6.5 | Make article titles in queue list link to `/articles/[id]` | `[agent: cell-agent/articles]` | after 6.1 |

*Manifests to read: `.c4/entities/article.md`, `.c4/flows/article-ingestion.md`*

---

## Dependency map

```
Phase 1 (tokens)
  ├── Phase 2 (sidebar)    ──┐
  ├── Phase 3 (chrome)     ──┼── Phase 4 (gather)
  └── Phase 5 (bulk select)  │
                              └── (no Phase 6 dep)
Phase 6 (article detail)  — independent after Phase 1
```

---

## Ready to ship when

- All ❌ items in spec.md implemented
- 🟠 open decisions resolved (D1, D2, D3)
- `/teal-os-fidelity` clean
- `/spec-fidelity specs/2026-05-29-ui-redesign/spec.md` clean
- StatusChip renders correctly on all entity types in the UI
- Wireframe screens compared manually against built screens (researcher role + reader role)
