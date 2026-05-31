# Build Plan — Narrative Layer

**Supersedes:** Original 2026-05-27 plan (8-step greenfield design, predates partial implementation)
**Updated:** 2026-06-01 — re-interpreted against actual partial implementation found in session
**Spec:** `spec.md` (Section H — Thread/Narrative Management)
**ADR:** None — status transition logic is inline in API route per original design decision

---

## SDD status

| Gate | Status | Notes |
|------|--------|-------|
| G1 — Blueprint | ✅ | `docs/blueprint.md` current; Narrative entity documented |
| G2 — Spec critique | ✅ | Section H v0.2, critique resolved 2026-05-27; re-critiqued 2026-06-01 against impl |
| G3 — Fidelity | ⏳ pending | Run both checks after Steps 5–7 complete |

**Touchpoint classification: Bounded**
Cross-cell (narrative detail ↔ insights list) — contracts documented in manifests before code written.
G3 obligation: advisory — run both checks before marking section complete.

---

## Implementation state

### Completed this session

| Step | Spec refs | Files | Status |
|------|-----------|-------|--------|
| 1 — Status migration | — | `src/lib/types.ts`, DB (SQL UPDATE) | ✅ |
| 2 — Entity manifest | — | `.c4/entities/narrative.md` | ✅ |
| 3 — PATCH route | H.1.4, H.1.5, H.1.6 | `src/app/api/narratives/[id]/route.ts` | ✅ |
| 4 — Available-insights route | H.2.1 | `src/app/api/narratives/[id]/available-insights/route.ts` | ✅ |

**Pre-existing (built in prior session, status at session start):**

| Component | Status | Gap |
|-----------|--------|-----|
| `narratives` DB table + `narrativeInsights` join table | ✅ | — |
| `NarrativeInstance`, `NarrativeInsightInstance` types | ✅ | Status values were wrong (archived/resolved) — fixed in Step 1 |
| `GET /api/narratives` (list), `POST /api/narratives` (create) | ✅ | — |
| `GET /api/narratives/[id]/insights`, `POST` (link), `DELETE` (unlink) | ✅ | — |
| `/narratives` list page | ✅ | Updated for dormant/closed labels |
| `/narratives/[id]` detail page | ⚠️ | Read-only — no edit, no status actions, no Add evidence |

---

### Remaining (dispatched as agent tasks — see task IDs below)

| Step | Spec refs | Agent task | Files | Status |
|------|-----------|------------|-------|--------|
| 5 — Narrative detail client | H.1.4, H.1.5, H.1.6, H.2.1, H.2.4, H.3.1, H.3.2, H.5 | TASK-narrative-detail | `src/app/narratives/[id]/narrative-detail-client.tsx` (create), `src/app/narratives/[id]/page.tsx` (modify) | ❌ |
| 6 — Insight card badges | H.2.3 | TASK-insight-badges | `src/app/insights/page.tsx` (modify) | ❌ |
| 7 — README entity index | — | inline | `.c4/README.md` | ❌ |

---

### Separate workstream — Sequential analyse queue

Tracked in: `specs/2026-05-31-pipeline-consolidation/spec.md` — Phase 2

| Step | Spec refs | Agent task | Files | Status |
|------|-----------|------------|-------|--------|
| A — Client-side sequential queue | Pipeline Phase 2 | TASK-seq-analyse | `src/components/pipeline/pipeline-bar.tsx` (modify) | ❌ |

Note: `POST /api/articles/[id]/process` already stamps `analyseStartedAt`, `analyseCompletedAt`, `analyseDurationMs` into `article.data` — verified in session.

---

## Step contracts

### Step 5 — Narrative detail client

**Acceptance (from spec):**
- H.1.4: Edit mode for title + description — inline form, PATCH on submit, refresh
- H.1.5: "Mark dormant" button when status = `active` → PATCH `{ status: 'dormant' }`
- H.1.6: "Close" button when status ≠ `closed`; "Reactivate" when status = `dormant`
- H.2.1: "Add evidence" inline expander — fetches `/api/narratives/[id]/available-insights`, shows filterable list of curated insights not yet linked, Link button per row calls POST insights
- H.2.4: "Remove" button on each linked insight — calls DELETE /api/narratives/[id]/insights `{ insightId }`
- H.3.1: Page shows title, description, status badge, dates, linked insights reverse-chronological
- H.3.2: Each linked insight shows text, quote, perspective, tags, source article title (linked to URL)
- H.5: Reader role — no edit controls, no status buttons, no Add evidence (role from Zustand store `useRoleStore`)

### Step 6 — Insight card badges

**Acceptance:**
- H.2.3: Curated insight cards show narrative badge pills for each linked narrative
- Badge = narrative title, links to `/narratives/[id]`
- Extracted and dismissed cards: no badges

### Step A — Sequential analyse queue

**Acceptance (from Pipeline spec Phase 2):**
- Bulk Analyse button fetches fetched article IDs from `GET /api/articles?status=fetched&topicId=ai-adoption`
- Processes articles one at a time with sequential `await fetch(POST /api/articles/[id]/process)`
- Progress shown inline: `Analysing 2/12`
- On article failure, increments failed count and continues to next article
- After all complete, shows `Analysed N · M failed` and calls `router.refresh()`

---

## G3 Fidelity checkpoint

After Steps 5–7 complete:

**Check 1 — Manifest fidelity** (`/teal-os-fidelity`):
- `.c4/entities/narrative.md` ↔ `NarrativeInstance` in `types.ts` ↔ `narratives` schema ↔ API route shapes
- `NarrativeStatus` values match manifest states

**Check 2 — Spec fidelity** (`/spec-fidelity specs/2026-05-27-hypothesis-layer/spec.md`):
- All H.1.x (create/manage) — H.1.1 (create) ✅ pre-existing; H.1.2 (card view) ✅; H.1.3 (click → detail) ✅; H.1.4/5/6 (edit/dormant/close) → Step 5
- H.2.1 (add evidence) → Step 5
- H.2.3 (badges on insight cards) → Step 6
- H.2.4 (remove link) → Step 5
- H.3 (detail page content) → Step 5
- H.4 (dashboard panel) → ✅ fulfilled by `/narratives` list page (ADR-006 removed dashboard)
- H.5 (reader role) → Step 5

G3 result determines section readiness. Both fidelity checks advisory (Bounded classification).
