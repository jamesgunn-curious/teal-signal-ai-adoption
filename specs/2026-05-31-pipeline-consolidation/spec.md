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

---

## Phase 3 — Polish, article detail, and narrative evolution

**Date added:** 2026-06-04

Items identified from UI review session. Work through in order — later items depend on earlier ones.

---

### Step 7 — Fix: analyseError not cleared on success ✅

**Bug:** Articles that re-run analysis successfully still show the previous `analyseError` in their JSONB data. Phase 2 spec says ✅ "On success, `analyseError` is cleared from article data" — the clear never landed or was overwritten.

- In `src/app/api/articles/[id]/process/route.ts`, confirm the update merges `analyseError: null` (or deletes the key) into `data` on a successful analysis run.
- Verify by checking a `processed` article that has `analyseError` in its data column.

---

### Step 8 — Pipeline page: fix breadcrumb + deduplicate header stats ✅

- Change `crumbs={['Workflow', 'Pipeline']}` → `crumbs={['Pipeline']}` in `src/app/pipeline/page.tsx`. "Workflow" is not a real nav page.
- The PageHeader stats (active feeds · pending · analysed) duplicate the counts already visible in the PipelineBar. Remove the stats from the PageHeader — let the bar carry them. The header should show only the title.

---

### Step 9 — Per-article actions: Paywalled & Failed as classify actions ✅

`Paywalled` and `Failed` are classifications, not pipeline-advancing actions. They should not sit alongside `Gather` and `Analyse` as equal-weight buttons.

In `src/app/articles/article-actions.tsx`:
- Keep `Gather` and `Analyse` as the primary action buttons (existing style)
- Replace `Paywalled` and `Failed` buttons with small muted inline chips: `[⊘ paywalled]` and `[✕ failed]`
  - Style: `text-[10px] text-[#444] border border-[#333] px-1.5 py-0.5 rounded hover:text-[#666]`
  - Same API call underneath; just visually de-emphasised

---

### Step 10 — Narratives nav badge ✅

In `src/components/nav/nav-wrapper.tsx`:
- Query count of `active` narratives for the topic
- Pass as `narratives: activeCount` in the counts object to `TopNav`

In `src/components/nav/top-nav.tsx`:
- Render the badge on the Narratives tab if count > 0 (same pattern as Pipeline and Review tabs)

---

### Step 11 — Narrative dormant flow: pause / fold-into / split-into ✅

**Decision (2026-06-04):** When a narrative is marked dormant, the researcher should be prompted to clarify *why* — this is the natural moment to split or converge.

**Three options on "Mark dormant":**
| Option | What happens | `parentId` |
|---|---|---|
| **Pause** | Just marks dormant; may revive later | unchanged |
| **Fold into →** | Researcher picks another narrative; this one closes with `parentId` pointing to the target | set to target id |
| **Split into →** | Researcher enters two new titles; two new `active` narratives are created with `parentId` pointing back to this one; this one closes | set on children |

**Changes required:**

In `src/app/narratives/[id]/narrative-detail-client.tsx`:
- Replace the current "Mark dormant" button with a modal/inline form that presents the three options
- Pause: existing `PATCH status: dormant` call, no change
- Fold into: `PATCH /api/narratives/[id]` with `{ status: 'closed', parentId: targetNarrativeId }` — requires fetching the list of other active narratives to show as options
- Split into: `POST /api/narratives` twice (with `parentId: thisId`), then `PATCH` this narrative to `closed`

In `src/app/api/narratives/[id]/route.ts`:
- Accept `parentId` in the PATCH body and persist it

In `src/app/api/narratives/route.ts`:
- Accept `parentId` on POST

Update `src/db/schema.ts` comment: `// 'active' | 'dormant' | 'closed'` (fix stale `'archived' | 'resolved'` comment)

Update `.c4/entities/narrative.md` — add dormant transition detail (done alongside this step).

---

### Step 11b — Tab summary bars: extend pipeline-bar pattern to Review, Narratives, Digest ✅

**Decision (2026-06-04):** The PageHeader (`SECTION / Screen` + stats row) is removed. Each top-level tab instead opens directly into a contextual summary bar — like the PipelineBar — that gives a quick count summary and surfaces bulk actions relevant to that tab. No page title needed; the nav tab is the label.

**Pipeline** ✅ — already has PipelineBar; PageHeader removed.

**Review** — summary bar shows: `N to review · N curated · N dismissed` + bulk action "Curate all" (or dismiss all).

**Narratives** — summary bar shows: `N active · N dormant · N closed` + "New narrative" action (replaces the create form currently in the page header slot).

**Digest** — summary bar shows: `N insights · N curated · N extracted` + perspective filter pills (currently in the page body; move to bar).

Each bar lives in `src/components/{tab}/` matching the pipeline pattern. Server pages pass counts; bars are client components for interactivity.

PageHeader component kept — still used on nested pages (article detail, narrative detail).

---

### Step 12 — Article detail page ✅

New route: `src/app/articles/[id]/page.tsx`

**Layout:**
```
[PageHeader]
  crumbs: ['Pipeline', 'Article']
  stats: [word count, insight count, duration if analysed]
  actions: [Gather | Analyse | Archive] (state-dependent, same logic as queue row)

[Article metadata]
  Title, source, perspective, tier, published date, URL (external link)
  Status chip + model tag if analysed

[Article text]
  Full text if gathered; "Not yet gathered" placeholder if discovered

[Insights section]  (only if status = processed)
  Heading: "N insights extracted"
  Each insight row:
    - Insight text + quote
    - Perspective, tags
    - Reviewed badge if status = curated; muted if extracted; struck-through if dismissed
    - Narrative badges (which narratives it's linked to)
    - Actions: [Curate] [Dismiss] (if extracted) | [+ Add to narrative] (if curated/extracted)
```

**Wire-up:**
- Article titles in `src/components/pipeline/article-queue.tsx` → `<Link href={/articles/${id}}>` (replace external `<a>` for title)
- Keep the external link as a small `↗` icon next to the title

**API:** No new API routes needed — uses existing `/api/articles/[id]/transition`, `/api/articles/[id]/fetch`, `/api/articles/[id]/process`, `/api/insights/[id]/transition`.

---

### Step 13 — D.2.2: Re-process confirmation dialog ✅

In `src/app/articles/article-actions.tsx` and the article detail page:
- When `status === 'processed'` and the user clicks Analyse, show an inline confirmation:
  > "Re-processing will add new insights but will not delete existing ones. Continue?"
- Confirm → proceed with `POST /api/articles/[id]/process`
- Cancel → dismiss

---

### Step 14 — Review UX: reviewed/unreviewed signal ✅

### Step 16 — Bulk select: pill order, Re-gather, layout ✅

**Pill order (revised):** All · Discovered · Gathered · Paywalled · Failed · Analysed · Archived — active pipeline stages first, terminal states last.

**Re-gather action:** For `paywalled` and `failed` articles, a "Re-gather" bulk action is available. Calls the same `fetch` endpoint as single-article gather. Flow updated: `paywalled → fetched` and `failed → fetched` via `fetch` action are now valid transitions. Per-row "Re-gather" button added for those statuses.

**Layout — actions on right:** Select all / Clear always visible at the far-right of the filter pill row (not hidden behind selection). Bulk action buttons appear right-aligned below the pill row when selection > 0. Follows the "actions on right" UI convention (documented in `docs/blueprint.md`).

**Filter pill active state:** Selected pills now use `.filter-pill-active` CSS class — inverts chip to filled background in status colour. Removes the previous `ring-1 ring-white/20` halo. Consistent with the "All" pill active convention.

### Step 15 — Source-click filter in pipeline queue ✅

See specs/2026-06-04-smart-feed-discovery/spec.md Step H.

**Goal:** In Digest and Narratives, it should be immediately clear which insights have been reviewed (curated) vs left as-extracted. Over time, narratives with more curated insights are more trustworthy than those built purely on extracted ones.

Changes:
- **Digest** (`src/app/digest/page.tsx`): insights already render; add a small `reviewed` badge (use `status-curated` token style) on curated insights. Extracted insights show `extracted` chip — make it visually dimmer than curated.
- **Narrative detail** (`src/app/narratives/[id]/`): insight list shows reviewed/unreviewed signal per insight. Add a summary line in the header: e.g. "8 insights · 5 reviewed".
- **Review screen** (`src/app/insights/page.tsx`): add a note/label near the top clarifying that review is optional enrichment — insights reach Digest and Narratives regardless of review status.
