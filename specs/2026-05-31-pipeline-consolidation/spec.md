# Spec: Pipeline screen consolidation

**Date:** 2026-05-31
**ADR:** ADR-006
**Status markers:** ✅ implemented · ❌ not yet · 🟠 open decision · ⏸ deferred

---

## What this spec covers

Replacing the four separate tabs (Sources · Discover · Article queue + bulk actions) with a single **Pipeline** tab. The new nav is:

```
Pipeline  |  Review  |  Narratives  |  Digest
```

---

## Screen layout — Option A

```
[PageHeader]
  PIPELINE / Pipeline
  11 active feeds  ·  66 gathered  ·  49 analysed

[Pipeline bar]
  [↻ Discover]   0 discovered  →  [Gather 66]   66 gathered  →  [Analyse 66]   49 analysed
  11 active feeds · 14d lookback · last run: —

[Sources section — collapsed by default]
  Sources  11 active  [▾ expand]  [+ Add source]
  ─────────── (expands to show per-source rows with Edit / Pause / Remove)

[Article queue]
  [All] [Discovered 0] [Gathered 66] [Analysed 49] [Paywalled 23] [Failed 0]
  ─────────────────────────────────────────────────────────────────────────────
  • article rows (status chip · metadata · per-row actions)
```

---

## Actions — full inventory

### Pipeline bar actions

| Action | Button label | When shown | API call |
|---|---|---|---|
| Run RSS scan → creates `discovered` articles | `↻ Discover` | Always | `POST /api/topics/[id]/gather` |
| Bulk fetch content for all `discovered` | `Gather N →` | `discovered` count > 0 | `POST /api/topics/[id]/bulk-gather` |
| Bulk run model on all `fetched` | `Analyse N →` | `fetched` count > 0 | `POST /api/topics/[id]/bulk-analyse` |

### Sources section actions

| Action | When available |
|---|---|
| `+ Add source` | Always |
| `▾ expand / ▴ collapse` | Always |
| Edit source (name, feed URL, perspective, tier) | Sources expanded |
| Pause source (removes from next discover run) | Sources expanded, source is `active` |
| Resume source | Sources expanded, source is `paused` |
| Remove source | Sources expanded |

### Per-article actions

| Action | Condition | Transition |
|---|---|---|
| Gather (single) | Article is `discovered` | → `fetched` |
| Analyse (single) | Article is `fetched` | → `processed` |
| Mark paywalled | Article is `discovered` or `fetched` | → `paywalled` |
| Archive | Any status | → `archived` |
| Open article detail | Always (Phase 6) | navigates to `/articles/[id]` |

### Article list filtering

Status filter pills: **All · Discovered · Gathered · Analysed · Paywalled · Failed**
Each pill shows the count for that status.

---

## Implementation steps

### Step 1 — New `/pipeline` route
❌ Create `src/app/pipeline/page.tsx` as a server component
- Fetches: sources, article status counts, pipeline stats (all in one data call)
- Renders: PageHeader + PipelineBar + SourcesSection + ArticleQueue

### Step 2 — PipelineBar component
❌ Create `src/components/pipeline/pipeline-bar.tsx` (client component)
- Renders the three-step flow with counts and action buttons
- Discover button calls gather API
- Gather N / Analyse N call bulk APIs
- Progress feedback inline (loading state per button)
- Shows "last run: —" stat (not yet stored; show "—" for now ⏸)

### Step 3 — SourcesSection component
❌ Create `src/components/pipeline/sources-section.tsx` (client component)
- Collapsed by default, expand/collapse via local state
- When expanded: renders existing per-source rows with StatusChip + SourceActions
- `+ Add source` always visible (uses existing AddSourceForm)

### Step 4 — Unified ArticleQueue
❌ Extract article list + filter pills from `src/app/articles/page.tsx` into a reusable component
- `src/components/pipeline/article-queue.tsx`
- Accepts pre-fetched articles + counts (no own data fetch)
- Renders filter pills + article rows + per-row ArticleActions

### Step 5 — Nav update
❌ Update `src/components/nav/top-nav.tsx` — replace 4 tabs with single `Pipeline` tab at `/pipeline`
❌ Update `src/components/nav/nav-wrapper.tsx` — Pipeline tab badge = discovered + fetched count
❌ Redirect `/dashboard`, `/gather`, `/articles` → `/pipeline` (or leave as aliases)

### Step 6 — Move BulkActions off dashboard
❌ Remove `BulkActions` component from `src/app/dashboard/page.tsx`
❌ Gather N and Analyse N live in PipelineBar only

---

## Open decisions

🟠 **D4 — What happens to `/dashboard`, `/gather`, `/articles` URLs?**
Options: (a) redirect to `/pipeline`, (b) keep as aliases, (c) 404
Recommend: (a) redirect — keeps URLs clean, no dead routes

🟠 **D5 — Last run timestamp**
The discover step doesn't currently record when it last ran. The pipeline bar shows "last run: —". Options: (a) add `lastGatheredAt` to topics table, (b) infer from most recent article `createdAt`, (c) leave as "—" for now.
Recommend: (b) for now — no schema change needed, reasonable approximation.

---

## Acceptance criteria

- Given I land on `/pipeline`, I see the pipeline bar, collapsed sources summary, and article list in one view
- Given `discovered` > 0, the `Gather N` button is visible and clickable
- Given `fetched` > 0, the `Analyse N` button is visible and clickable
- Given I expand sources, all active sources are shown with their article status chips and actions
- Given I filter by a status, the article list updates to show only that status
- Given I click Discover, the button shows a loading state and the counts update on completion
- Nav shows 4 tabs: Pipeline · Review · Narratives · Digest
- Pipeline tab badge shows discovered + fetched count (work pending)
