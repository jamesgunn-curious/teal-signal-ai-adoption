# Build Plan — Thread Layer

Generated: 2026-05-27 | Spec: `spec.md`

Track progress here. Update status as steps complete.

Status: `[ ]` not started | `[~]` in progress | `[x]` done | `[⏸]` blocked/waiting

---

## SDD classification

**Work type:** Greenfield section — new entity type, new UI cells, no existing code being modified.
Full G1 → G2 → G3 cycle required. G2 gate passed (spec critique resolved 2026-05-27). G3 runs after all 8 steps complete.

**Touchpoint classification: Bounded**
The thread layer crosses cell boundaries (new entity → dashboard cell, insights list cell, API layer) but all contracts are being documented in manifests before code is written. No undocumented cross-cell dependencies. No changes to the shared `teal-semantics` or `teal-flow` cells.

G3 obligation: advisory (run both fidelity checks before starting next phase — see Fidelity checkpoint below).

---

## Agentic build test

This plan is the first attempt at dispatching per-step subagents rather than a single-session build. Each step lists the agent ID, its declared file boundaries, and the manifests it must read before writing any code. The orchestrator (this session) dispatches one subagent per step, verifies output against the step contract, then moves to the next.

Steps 1–2 are sequential (Step 2 reads Step 1 output). Steps 3–5 can run in parallel once Step 2 is complete. Step 6 depends on Step 3. Step 7 depends on Steps 4–6.

---

## Phase 1 — Foundation (sequential)

### Step 1 — DB schema + types
`[ ]` `[agent: database-agent]`

**Read before coding:**
- `specs/2026-05-27-hypothesis-layer/spec.md` — Thread and InsightThreadLink entity definitions

**Declared file boundaries:**
- `src/db/schema.ts` — add `threads` table and `insight_thread_links` table
- `src/lib/types.ts` — add `ThreadStatus`, `ThreadInstance`, `InsightThreadLinkInstance`

**Deliverables:**
- `threads` table: `id` (UUID), `topic_id` FK, `title`, `description`, `status` (text, default `active`), `created_at`, `updated_at`
- `insight_thread_links` table: `insight_id` FK (ON DELETE CASCADE), `thread_id` FK (ON DELETE CASCADE), `created_at`. Composite PK.
- `ThreadStatus = 'active' | 'dormant' | 'closed'` in types.ts
- `ThreadInstance` interface in types.ts
- Run `npm run db:push` to apply schema

**Step contract (verify before proceeding):** `npm run db:push` exits 0; `ThreadStatus`, `ThreadInstance` types exist in `src/lib/types.ts`; both tables present in Drizzle schema export.

---

### Step 2 — Thread entity manifest + flow note
`[ ]` `[agent: entity-agent/thread]`

**Read before coding:**
- `.c4/README.md`
- `.c4/entities/topic.md` — Thread is scoped to a topic
- `.c4/entities/insight.md` — InsightThreadLink joins Thread ↔ Insight
- `specs/2026-05-27-hypothesis-layer/spec.md`

**Declared file boundaries:**
- `.c4/entities/thread.md` — new entity manifest (create)
- `.c4/README.md` — add Thread to entity type index table

**Deliverables:**
- Thread entity manifest documenting: what it represents, states, fields, roles, touchpoints, agent change protocol
- Note in manifest: Thread uses no Teal Flow type — status transitions are handled inline in the API route
- README entity table updated

**Step contract:** `.c4/entities/thread.md` exists and is well-formed (frontmatter + all sections); README entity table includes Thread row.

---

## Phase 2 — API layer (parallel after Step 1)

### Step 3 — Thread CRUD routes
`[ ]` `[agent: api-agent]`

**Read before coding:**
- `.c4/entities/thread.md` (from Step 2)
- `src/db/schema.ts` (from Step 1)
- `src/lib/types.ts` (from Step 1)
- Existing route pattern: `src/app/api/topics/route.ts` for shape reference

**Declared file boundaries:**
- `src/app/api/threads/route.ts` — GET (list by topicId), POST (create)
- `src/app/api/threads/[id]/route.ts` — GET (single), PATCH (update title/description/status), DELETE (not in spec, omit)

**Deliverables:**
- `GET /api/threads?topicId=X` — returns all threads for topic, ordered active first then dormant then closed
- `POST /api/threads` — body: `{ topicId, title, description }`, creates with status `active`
- `GET /api/threads/[id]` — returns thread with linked insight count
- `PATCH /api/threads/[id]` — accepts `{ title?, description?, status? }`, validates status is valid ThreadStatus

**Step contract:** All four routes return correct shapes; PATCH with invalid status returns 422.

---

### Step 4 — Insight–thread link routes
`[ ]` `[agent: api-agent]`

**Read before coding:**
- `.c4/entities/thread.md`
- `.c4/entities/insight.md`
- `src/db/schema.ts`
- Spec H.2 — linking rules (curated only; remove link without affecting insight)

**Declared file boundaries:**
- `src/app/api/threads/[id]/insights/route.ts` — GET (list linked insights), POST (link one or more)
- `src/app/api/threads/[id]/insights/[insightId]/route.ts` — DELETE (remove link)

**Deliverables:**
- `GET /api/threads/[id]/insights` — returns linked insights joined with article data (title, url, perspective)
- `POST /api/threads/[id]/insights` — body: `{ insightIds: string[] }`, inserts links, skips non-curated insights with a warning, uses `onConflictDoNothing`
- `DELETE /api/threads/[id]/insights/[insightId]` — removes link row only

**Step contract:** POST with a dismissed insight ID skips it and returns `{ linked, skipped }`. DELETE returns 204. GET returns insight shape including article title.

---

### Step 5 — Thread badges on insights
`[ ]` `[agent: api-agent]`

**Read before coding:**
- `src/app/api/insights` existing route — understand current response shape
- Spec H.2.3 — insight cards should show thread title badges

**Declared file boundaries:**
- `src/app/api/insights/route.ts` — extend to include thread links in response

**Deliverables:**
- `GET /api/insights` response includes `threads: { id, title }[]` per insight (left join on `insight_thread_links` → `threads`)
- Empty array when no links

**Step contract:** GET /api/insights returns `threads` array on each insight object; insights with no links return `threads: []`.

---

## Phase 3 — UI cells (parallel after Steps 3–5)

### Step 6 — Thread detail page
`[ ]` `[agent: cell-agent/thread-detail]`

**Read before coding:**
- `.c4/entities/thread.md`
- `specs/2026-05-27-hypothesis-layer/spec.md` — H.3 section
- Existing page pattern: `src/app/insights/page.tsx` for style reference (panel-hush theme)

**Declared file boundaries:**
- `src/app/threads/[id]/page.tsx` — server component, thread detail
- `src/app/threads/[id]/thread-actions.tsx` — client component, status transitions + edit
- `src/app/threads/[id]/link-insights.tsx` — client component, insight picker

**Deliverables:**
- Thread detail page: title, description, status badge, linked insights list (reverse-chronological)
- Each linked insight card: text, quote, perspective badge, tags, article title (linked to URL), Remove action
- Edit mode: inline title/description edit, status toggle (active/dormant/close)
- "Add evidence" button opens insight picker: filterable list of curated insights not yet linked to this thread
- Panel-hush theme throughout (`bg-[#0f0f0f]`, `border-[#00e05a22]`, green accents)

**Step contract:** Page renders without errors; insight picker only shows `curated` insights; Remove link calls DELETE route and refreshes.

---

### Step 7 — Dashboard threads panel + sidebar nav
`[ ]` `[agent: cell-agent/dashboard]`

**Read before coding:**
- `.c4/entities/thread.md`
- `specs/2026-05-27-hypothesis-layer/spec.md` — H.1, H.4 sections
- `src/app/dashboard/page.tsx` — existing dashboard structure
- `src/components/nav/sidebar.tsx` — existing nav

**Declared file boundaries:**
- `src/app/dashboard/page.tsx` — add Threads panel below pipeline summary
- `src/components/nav/sidebar.tsx` — no change needed (threads accessible via dashboard panel only in v1)

**Deliverables:**
- Threads panel below the pipeline cards, above the sources list
- Panel shows: active threads first (full opacity), dormant threads below (60% opacity), "show closed" toggle
- Each thread card: title, status badge, linked insight count, "New thread" inline form at top
- Thread card links to `/threads/[id]`
- Empty state: "No threads yet — start one to track a research narrative."
- New thread form: title + description fields, submits to POST /api/threads

**Step contract:** Panel renders on dashboard; new thread form creates and refreshes; clicking a card navigates to thread detail; dormant/closed visibility controlled by toggle.

---

### Step 8 — Thread badges on insight cards
`[ ]` `[agent: cell-agent/insights]`

**Read before coding:**
- `src/app/insights/page.tsx`
- Spec H.2.3 — thread title badges on curated insight cards

**Declared file boundaries:**
- `src/app/insights/page.tsx` — add thread badges to insight cards

**Deliverables:**
- Insight cards in the curated view show thread badges (pill-style, green outline) for each linked thread
- Badge links to `/threads/[id]`
- Extracted and dismissed views: no thread badges (threads only relevant to curated)

**Step contract:** Curated insight cards show thread badges where links exist; no badges on extracted/dismissed cards.

---

## Fidelity checkpoint (G3)

After all steps complete, run **both** fidelity checks before starting any subsequent work:

**Check 1 — Manifest fidelity** (`/teal-os-fidelity`):
- Thread entity manifest (`.c4/entities/thread.md`) ↔ `ThreadInstance` in `types.ts` ↔ API route shapes
- InsightThreadLink manifest contract ↔ `insight_thread_links` schema ↔ route implementations
- No manifest → code drift introduced

**Check 2 — Spec fidelity** (`/spec-fidelity specs/2026-05-27-hypothesis-layer/spec.md`):
- All H.1.x (create/manage) work end-to-end
- H.2.1 (add evidence from thread detail) works with curated-only filter
- H.2.3 (badges on insight cards) renders correctly
- H.3 (thread detail page) shows all linked insight fields
- H.4 (dashboard panel) shows correct ordering and empty state
- H.5 (reader role) cannot see edit controls

G3 result determines readiness to start the next build phase. Bounded classification means both checks are advisory — but any manifest ↔ code drift found must be resolved before proceeding.
