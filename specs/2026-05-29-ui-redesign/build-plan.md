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
| 1.1 | ✅ Create `src/lib/status-tokens.ts` — token map for all 14 status values | `[agent: entity-agent/article]` + `[agent: entity-agent/insight]` | — |
| 1.2 | ✅ Add CSS custom properties to `src/app/globals.css` — colour + texture per status | `[agent: entity-agent/article]` | after 1.1 |
| 1.3 | ✅ Create `src/components/ui/status-chip.tsx` | `[agent: api-agent]` | after 1.2 |
| 1.4 | ✅ Replace inline status Tailwind combos in `articles/page.tsx`, `insights/page.tsx`, `dashboard/page.tsx` with `<StatusChip>` | `[agent: api-agent]` | after 1.3 |

*Manifests to read before coding: `.c4/entities/article.md`, `.c4/entities/insight.md`*

---

### Phase 2 — Sidebar / nav restructure
*Can start immediately after Phase 1 is complete. No data layer changes.*

| Step | Work | Agent | Parallel? |
|---|---|---|---|
| 2.1 | ~~Resolve D1 (Topics nav target)~~ | — | **Resolved — Topics nav removed** |
| 2.2 | ✅ Replace sidebar with `src/components/nav/top-nav.tsx` — brand cluster + grouped nav + role toggle left of links |  `[agent: cell-agent/ui]` | — |

*Manifests to read: `.c4/cells/` (all)*

---

### Phase 3 — Per-screen header chrome
*Can run in parallel with Phase 2 after Phase 1 complete.*

| Step | Work | Agent | Parallel? |
|---|---|---|---|
| 3.1 | ✅ Create `src/components/ui/page-header.tsx` | `[agent: api-agent]` | — |
| 3.2 | ✅ Add PageHeader to `dashboard/page.tsx`, `articles/page.tsx`, `insights/page.tsx`, `digest/page.tsx` | `[agent: api-agent]` | — |

---

### Phase 4 — Dedicated Gather screen
*Depends on Phase 2 (nav link) and Phase 3 (PageHeader).*

| Step | Work | Agent | Parallel? |
|---|---|---|---|
| 4.1 | ~~Resolve D2~~ | — | **Resolved — dashboard keeps sources table + pipeline bar; BulkActions moves to article queue in Phase 5** |
| 4.2 | ✅ Create `src/app/gather/page.tsx` — source list + run gather button | `[agent: cell-agent/gather]` | — |
| 4.3 | ✅ Create `src/app/gather/gather-button.tsx`; DiscoverButton removed from dashboard | `[agent: cell-agent/gather]` | — |
| 4.4 | ✅ Dashboard retains sources table + pipeline bar; BulkActions moved under pipeline section | `[agent: cell-agent/gather]` | — |

*Manifests to read: `.c4/cells/gather.md` (if exists), `.c4/entities/source.md`*

---

### Phase 5 — Bulk selection + contextual action bar
*Depends on Phase 1 (StatusChip). Independent of Phases 2–4.*

**D3 resolved:** `ArticleQueue` (`src/components/pipeline/article-queue.tsx`) is already a `'use client'` component with `useState` — no wrapper needed.

| Step | Status | Work | Implementation notes |
|---|---|---|---|
| 5.1 | ✅ | D3 resolved — no wrapper needed | `ArticleQueue` is already client-side |
| 5.2 | ❌ | Add `selected: Set<string>` state + checkbox per article row | Add `const [selected, setSelected] = useState<Set<string>>(new Set())` to `ArticleQueue`. Add `<input type="checkbox">` at the start of each article row, styled to match panel-hush tokens. Toggle on click. |
| 5.3 | ❌ | Select-all / deselect-all control | Add above the filter pills. "Select all" selects all articles in current filter. "Deselect all" clears. Show count: `3 of 12 selected`. |
| 5.4 | ❌ | Contextual bulk action bar | Render a bar below the filter pills when `selected.size > 0`. Contents: `{N} selected · [Gather selected] [Analyse selected] [Clear]`. Gather selected only enabled when ≥1 selected article is `discovered`; Analyse selected only when ≥1 is `fetched`. |
| 5.5 | ❌ | Wire bulk actions with sequential progress | Process selected articles one at a time (same pattern as PipelineBar's sequential analyse queue). Show inline progress: `Gathering 2/5`. On finish: `Gathered 4 · 1 failed`. Call `router.refresh()` after completion. Clear selection. |
| 5.6 | ✅ | Remove BulkActions from dashboard | Already done in pipeline-consolidation Phase 1 |

*Manifests to read: `.c4/entities/article.md`, `.c4/flows/article-ingestion.md`*
*File to edit: `src/components/pipeline/article-queue.tsx`*

---

### Phase 6 — Article detail screen
*Independent of Phases 2–5. Can start any time after Phase 1.*

**Context:** `src/app/articles/page.tsx` already redirects → `/pipeline`. No conflicts. `src/app/articles/[id]/` does not exist yet.

| Step | Status | Work | Implementation notes |
|---|---|---|---|
| 6.1 | ❌ | Create `src/app/articles/[id]/page.tsx` server component | Fetch article by `params.id` from DB (drizzle: `db.select().from(articles).where(eq(articles.id, id))`). Also fetch related insights (`db.select().from(insights).where(eq(insights.articleId, id))`). 404 if not found. |
| 6.2 | ❌ | PageHeader | `<PageHeader crumbs={['Pipeline', article.data.title ?? 'Article']} backHref="/pipeline" />` — uses existing PageHeader component. Stats: status chip, word count, perspective. |
| 6.3 | ❌ | Metadata + summary section | Status chip, perspective/tier, source slug, publish date. Executive summary in a card. Tags as pills (same style as article queue rows). |
| 6.4 | ❌ | Insights list | All insights for this article. Each row: `<StatusChip status={insight.status} />`, insight text, quote (if present), tags. Group by status: extracted first, then curated, then dismissed. |
| 6.5 | ❌ | Action buttons | Reuse `<ArticleActions articleId={id} status={article.status} />` — already handles all transitions. Place below PageHeader. After action, `router.refresh()` already fires from ArticleActions. |
| 6.6 | ❌ | Link article titles in queue to detail page | In `src/components/pipeline/article-queue.tsx`: wrap article title `<a>` with `href={/articles/${article.id}}` (internal link, not `target="_blank"`). Keep external URL accessible via a small "↗" icon link. |

*Manifests to read: `.c4/entities/article.md`, `.c4/entities/insight.md`*
*New file: `src/app/articles/[id]/page.tsx`*

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

- ✅ All Phase 1–4 items done
- ❌ Phase 5 steps 5.2–5.5 implemented
- ❌ Phase 6 steps 6.1–6.6 implemented
- ✅ Open decisions D1, D2, D3 resolved
- `/teal-os-fidelity` clean
- `/spec-fidelity specs/2026-05-29-ui-redesign/spec.md` clean
- Wireframe screens compared manually against built screens (researcher + reader role)
