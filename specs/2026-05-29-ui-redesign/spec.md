# Spec: UI Redesign — nav restructure, chrome, status tokens, wireframe adoption

**Date:** 2026-05-29
**ADR:** ADR-005
**Design reference:** `.c4/design/Signal-Digest-Wireframe.html`
**Status markers:** ✅ implemented · ❌ not yet · 🟠 open decision · ⚠️ known issue · ⏸ deferred

---

## Context

The wireframe prototype (`.c4/design/Signal-Digest-Wireframe.html`) introduced several structural and visual patterns adopted into the production build. This spec captures decisions, acceptance criteria, and open questions for each.

Agreed decisions are captured in ADR-005. A second wireframe (`.c4/design/Signal-Digest-Wireframe-v2.html`) refined the nav direction — no role toggle, equal-width tabs, live counts.

### Pipeline terminology (confirmed)

| Step | What happens | Transition |
|---|---|---|
| **Discover** | Scan RSS feeds, find new article URLs | → `discovered` |
| **Gather** | Fetch & save article content up to paywall | `discovered` → `fetched` |
| **Analyse** | Extract insights (local Qwen model) | `fetched` → `processed` + `extracted` insights |
| **Review** | Human reviews extracted insights, accepts or dismisses | `extracted` → `curated` / `dismissed` |
| **Digest** | Output of all usable insights (extracted + curated) | — |
| **Narratives** | Researcher-curated threads tracked across runs | — |

---

## Phase 1 — Status token system ✅

All items implemented and verified. See build-plan.md.

---

## Phase 2 — Navigation ✅

> **Decision:** Sidebar replaced with sticky top nav bar. Role toggle removed entirely. All tabs always visible.

✅ `src/components/nav/top-nav.tsx` — full-width tab bar, equal-width tabs, brand cluster left
✅ `src/components/nav/nav-wrapper.tsx` — server component fetches live counts, passes to TopNav
✅ Tab labels: Sources · Discover · Article queue · Review · Digest · Narratives
✅ Live count badges: Article queue (discovered + fetched), Review (extracted)
✅ Active tab: green underline + bg highlight

---

## Phase 3 — Per-screen header chrome ✅

✅ `src/components/ui/page-header.tsx` — breadcrumb + stats + actions slot
✅ Wired into: Sources/dashboard, Article queue, Review/insights, Digest, Discover/gather, Narratives

---

## Phase 4 — Discover screen ✅

✅ `src/app/gather/page.tsx` — active feeds list, Discover button, lookback stat
✅ `src/app/gather/gather-button.tsx` — primary action, styled
✅ DiscoverButton removed from dashboard header

---

## Phase 5 — Bulk selection + contextual action bar

❌ Add checkbox selection to article rows in `src/app/articles/page.tsx`
❌ Contextual bulk action bar slides in on selection (fetch / analyse / clear)
❌ Move BulkActions off dashboard, into article queue
❌ Sequential progress feedback during batch operations

🟠 **D3 resolved:** Use thin `ArticleQueueClient` wrapper — keeps data fetching server-side, client wrapper holds selection state

---

## Phase 6 — Article detail + insight interaction screen

❌ `src/app/articles/[id]/page.tsx` — article metadata, content, per-article insights
❌ PageHeader with back → Article queue, article stats
❌ Inline fetch / analyse / archive actions
❌ Insight list with inline review (mark as reviewed, add to narrative, dismiss)
❌ Article titles in queue become links to detail screen

---

## Narratives ✅ (foundation) / ❌ (evolution features)

> Researcher-curated threads: pick a theme, track it across gather runs, evolve/split/converge.

**Schema:** ✅
- `narratives` table: id, topicId, title, description, status, parentId
- `narrative_insights` junction: narrativeId, insightId, note, addedAt

**API:** ✅
- `GET/POST /api/narratives` — list + create
- `GET/POST/DELETE /api/narratives/[id]/insights` — manage insights on a narrative

**UI:** ✅
- `src/app/narratives/page.tsx` — list with insight counts, create form
- `src/app/narratives/[id]/page.tsx` — narrative detail, insights timeline
- "+ Narrative" button on Review screen insight actions

**Still to build:**
❌ Archive / resolve narrative action
❌ Edit narrative title/description inline
❌ Split narrative (one → two, parentId set on children)
❌ Converge narratives (two → one)
❌ Add insight to narrative from article detail screen (Phase 6)
❌ Narrative count badge in nav tab

---

## Insight model changes ✅ (schema) / ❌ (flow)

**Model tagging:** ✅
- `model` column on insights table — stores `'claude-sonnet-4-6'`, `'qwen2.5:7b'` etc.
- Both `bulk-analyse` and single `process` routes write model name on insert
- Model shown in Digest and Narrative detail

**Insight flow — extracted usable without review:** ✅ (Digest) / ❌ (full)
- ✅ Digest shows `extracted` + `curated` insights (not just curated)
- ✅ Visual distinction: `curated` insights get a "reviewed" badge
- ❌ Review screen: make explicit that review is optional enrichment, not a gate
- ❌ Narratives: can attach `extracted` insights directly (works via API, no UI gate)

---

## Deferred

⏸ **Light theme** — token system designed for it; implement after dark is complete
⏸ **Trends screen** → replaced by Narratives
⏸ **Narrative split/converge** — parentId in schema, UI deferred
⏸ **Hypotheses layer** — tracked in `specs/2026-05-27-hypothesis-layer/`
