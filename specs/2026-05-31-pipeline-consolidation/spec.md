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
✅ Create `src/app/pipeline/page.tsx` as a server component
- Fetches: sources, article status counts, pipeline stats (all in one data call)
- Renders: PageHeader + PipelineBar + SourcesSection + ArticleQueue

### Step 2 — PipelineBar component
✅ Create `src/components/pipeline/pipeline-bar.tsx` (client component)
- Renders the three-step flow with counts and action buttons
- Discover button calls gather API
- Gather N / Analyse N call bulk APIs
- Progress feedback inline (loading state per button)
- Shows "last run: —" stat (not yet stored; show "—" for now ⏸)

### Step 3 — SourcesSection component
✅ Create `src/components/pipeline/sources-section.tsx` (client component)
- Collapsed by default, expand/collapse via local state
- When expanded: renders existing per-source rows with StatusChip + SourceActions
- `+ Add source` always visible (uses existing AddSourceForm)

### Step 4 — Unified ArticleQueue
✅ Extract article list + filter pills from `src/app/articles/page.tsx` into a reusable component
- `src/components/pipeline/article-queue.tsx`
- Accepts pre-fetched articles + counts (no own data fetch)
- Renders filter pills + article rows + per-row ArticleActions

### Step 5 — Nav update
✅ Update `src/components/nav/top-nav.tsx` — replace 4 tabs with single `Pipeline` tab at `/pipeline`
✅ Update `src/components/nav/nav-wrapper.tsx` — Pipeline tab badge = discovered + fetched count
✅ Redirect `/dashboard`, `/gather`, `/articles` → `/pipeline` (D4 resolved: redirect)

### Step 6 — Move BulkActions off dashboard
✅ Remove `BulkActions` component from `src/app/dashboard/page.tsx`
✅ Gather N and Analyse N live in PipelineBar only

---

## Open decisions

✅ **D4 — What happens to `/dashboard`, `/gather`, `/articles` URLs?**
Resolved: redirect all → `/pipeline`.

✅ **D5 — Last run timestamp**
Resolved: infer from most recent article `createdAt` — no schema change, reasonable approximation.

---

---

## Phase 2 — Sequential analyse queue with timing

**Date added:** 2026-06-01

### Problem

`POST /api/topics/[id]/bulk-analyse` processes all articles in a single HTTP round-trip. With a local LLM (Ollama), each article takes 30–120s — the request times out before all articles complete, and there is no progress visibility or retry affordance.

### Behaviour

- ✅ Bulk Analyse processes articles one at a time, sequentially, from the client (UI-driven queue)
- ✅ Each article calls `POST /api/articles/[id]/process` independently — no long-running bulk HTTP request
- ✅ Progress shown inline in pipeline bar: `Analysing 3/12` (updating per article)
- ✅ If an article fails, the count increments and the queue continues to the next article
- ✅ Articles with `analyseError` from prior runs are included in the queue (they remain `fetched`) — retry is automatic
- ✅ Per-article timing: `analyseStartedAt`, `analyseCompletedAt` stored in `article.data` JSONB (reference); `analyseDurationMs` stored in dedicated integer column (see ADR-007)
- ✅ `word_count` promoted to dedicated integer column (see ADR-007)
- ✅ On success, `analyseError` is cleared from article data
- ✅ Duration and word count shown in article queue row

### Timeout architecture (ADR-007 context)

Local LLM timeout is **dynamic**, computed per article from its `word_count` column before the Ollama call:

```
timeout = min(ceiling, max(120s, wordCount × 400ms))
```

- Empirical basis: 140 words → 47s ≈ 336ms/word; 400ms/word adds headroom
- Minimum: 120s (covers model cold-start + short articles)
- Default ceiling: 600s (10 min) — covers articles up to ~1500 words comfortably
- Ceiling override: `LOCAL_LLM_TIMEOUT_MS` env var

This is sufficient at research-pipeline scale (single topic, hundreds of articles, sequential processing). If parallel processing or larger corpora are introduced, revisit with a proper job-queue (e.g. pg-boss or BullMQ backed by Postgres).

### Per-article retry

The per-article `Analyse` button in the article queue already works as a retry affordance — `fetched` articles with `analyseError` show the button. No additional UI change needed for single-article retry.

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
