# Build Plan — Signal Digest

Generated: 2026-05-26 | Updated: 2026-05-28 | Spec: `spec.md` | Blueprint: `docs/blueprint.md`

Track progress here. Update status as steps complete. Spec markers (✅ ❌) are updated in `spec.md` in parallel.

Status: `[ ]` not started | `[~]` in progress | `[x]` done | `[⏸]` blocked/waiting

---

## Phase 1 — Foundation

Steps 1–5 have no UI and no inter-dependencies beyond sequencing. Steps 2–5 can be done in one session.

### Step 1 — Scaffold & configure
`[x]` Next.js scaffold (`npx create-next-app`) — Next.js 16.2.6
`[x]` Drizzle config (`drizzle.config.ts`, `src/db/index.ts`)
`[x]` `.env.local` with `DATABASE_URL`
`[x]` `tsconfig.json` — confirm `strict: true`
`[x]` shadcn/ui init

### Step 2 — DB schema
`[x]` `src/db/schema.ts` — tables: `topics`, `sources`, `articles`, `insights`
`[x]` `npm run db:push` — apply to local Postgres
`[x]` `src/db/seed.ts` — seed ai-adoption topic + 9 sources

### Step 3 — Types
`[x]` `src/lib/types.ts` — `ArticleStatus`, `InsightStatus`, `TopicStatus`, `SourceStatus`, `Perspective`, `ArticleInstance`, `InsightInstance`, `TopicInstance`, `SourceInstance`

### Step 4 — Teal Semantics
`[x]` `src/lib/semantics.ts` — `EntityTypeConfig` for article, insight, topic, source
`[x]` Aligns with `.c4/entities/*.md` manifests

### Step 5 — Teal Flow
`[x]` `src/lib/flow.ts` — `article-ingestion` and `insight-curation` flow types
`[x]` `validateTransition` function
`[x]` Aligns with `.c4/flows/*.md` manifests

---

## Phase 2 — API layer

### Step 6 — Topic & Source routes
`[x]` `GET /api/topics` — list topics
`[x]` `POST /api/topics` — create topic
`[x]` `PATCH /api/topics/[id]` — update / archive topic
`[x]` `GET /api/topics/[id]/sources` — list sources for topic
`[x]` `POST /api/topics/[id]/sources` — add source
`[x]` `PATCH /api/sources/[id]` — pause / resume / remove source
`[x]` `PATCH /api/sources/[id]` extended — edit name, feedUrl, perspective, tier, accessType (2026-05-28)
Spec: A.1, A.2, A.2.5

### Step 7 — Gather action
`[x]` `POST /api/topics/[id]/gather` — fetch RSS feeds, create `discovered` articles
`[x]` Deduplication on `url` field
`[x]` Returns summary: N new articles from M sources
`[x]` RSS content extraction (2026-05-28) — `<content:encoded>` captured at discover time; articles with ≥150 words created as `fetched` directly, skipping the separate Gather step. Critical for newsletter platforms (Substack etc.) that render content via JS.
Spec: B.1, B.2

### Step 8 — Article transitions
`[x]` `GET /api/articles` — list articles (filterable by status, topic)
`[x]` `PATCH /api/articles/[id]/transition` — advance state via Teal Flow
`[x]` `POST /api/articles/[id]/fetch` — retrieve content, populate `full_text`, advance to `fetched`
Spec: C.1, C.2

### Step 9 — Process action (Claude API)
`[x]` `POST /api/articles/[id]/process` — call Claude API, extract insights, advance to `processed`
`[x]` Creates insight instances with status `extracted`
`[x]` Populates `executive_summary` and `tags` on article
`[x]` Bulk analyse improvements (2026-05-28):
  - `analyseError` written to `data` JSONB on failure; cleared on success
  - Dashboard splits `fetched` articles into "new" (no prior attempt) vs "retry" (have `analyseError`)
  - Separate "Analyse N new" and "Retry M" buttons on dashboard
  - `analyseError` surfaced on article cards (amber, distinct from red `fetchError`)
  - Legacy `fetched` articles with no `full_text` moved back to `discovered` by bulk-analyse
Spec: D.1, D.2, D.3

### Step 10 — Insight transitions
`[x]` `GET /api/insights` — list insights (filterable by status, article, topic)
`[x]` `PATCH /api/insights/[id]/transition` — curate or dismiss
Spec: E.1

---

## Phase 3 — UI cells

### Step 11 — Navigation & layout
`[x]` `src/components/nav/sidebar.tsx` — role indicator, nav links
`[x]` `src/app/layout.tsx` — root layout with sidebar
`[x]` Zustand store setup (`src/lib/store.ts`)
`[x]` Edit source inline form (`src/app/dashboard/edit-source-form.tsx`) — toggled by Edit button in source card (2026-05-28)

### Step 12 — Topic dashboard
`[x]` `src/app/dashboard/page.tsx` — article counts by status, insight counts by status
`[x]` Source list with status indicators
Spec: A.3

### Step 13 — Article queue
`[x]` `src/app/articles/page.tsx` — list articles by status, transition actions
`[x]` Fetch and process actions per article
`[x]` Paywalled / failed marking
Spec: B.1–B.2, C.1–C.2, D.1–D.2

### Step 14 — Insight curation queue
`[x]` `src/app/insights/page.tsx` — extracted insights queue, curate/dismiss actions
Spec: E.1, E.3

### Step 15 — Digest view
`[x]` `src/app/digest/page.tsx` — curated insights grouped by digest section
`[x]` Tag and source filtering
Spec: F.1, F.2

---

## Phase 4 — Awaiting design

`[~]` **Step 16 — Batch actions** (C.3.1, D.3.1)
- `[x]` Bulk-all buttons on dashboard (Gather all / Analyse all) — implemented
- `[ ]` Individual article selection + batch Gather/Analyse selected — awaiting UI design

`[⏸]` **Step 17 — Trends view** (F.3.1) — awaiting UI design

---

## Phase 5 — Spec deviations to close

`[x]` **Step 18 — Fix C.2.2** — fetch failure / thin content stays in `discovered` with `fetchError` in `data` JSONB. Surfaced in article card UI. `bulk-analyse` counts no-fullText as `skipped` not `failed`. Single-article fetch route (`/api/articles/[id]/fetch`) also updated to match.

`[ ]` **Step 19 — D.2.2 re-process confirmation** — when Process is triggered on an already-processed article, show confirmation dialog: "Re-processing will add new insights but will not delete existing ones."

---

## Phase 6 — Framework evolution

`[ ]` **Step 20 — Multi-agent cell routing** *(teal-os-framework)*
The build plan already assigns steps to named agents (`[agent: cell-agent/{name}]`) but these are labels only — all code was written by a single session agent. To realise the vision:
- Build a `/teal-os-build` skill in command-centre that reads a build plan and dispatches a subagent per step using Claude Code's `Agent` tool
- Each subagent prompt scopes it to: read your manifest + touchpoints, build only files within your declared boundaries
- teal-os-fidelity runs as post-step verification before the orchestrator moves on
- Reference: `.c4/README.md` "On agent IDs" — the infrastructure is ready, the routing is not

`[ ]` **Step 21 — Design token system / component library** *(teal-os-framework)*
Extract the panel-hush theme tokens and component patterns (buttons, cards, pills, inputs) from this implementation into `teal-os-framework/src/components/ui/` and a `tokens.ts` file. Makes the green-on-black theme a named, reusable export across teal-os implementations rather than per-project arbitrary values.

`[ ]` **Step 22 — Hypothesis / thread layer** *(this project + teal-os extension)*
The original signal project had "tangents" — persistent narrative threads that grouped insights across articles over time (e.g. "AI fatigue" recurring across multiple sources). This maps to hypothesis management (spec A.1.3, deferred). Design exists at `.c4/design/hypothesis-management-extension.md`. This is the most intellectually significant missing feature — the layer that turns a list of curated insights into tracked research threads.

---

## Horizon — Related work (not in build spec)

These are not implementation steps for this project but threads worth tracking alongside it.

### H1 — Design tokens → teal-os-framework
Extract panel-hush theme tokens (bg, text, border, card colours) and component patterns (buttons, pills, cards, inputs) from this implementation into `teal-os-framework/src/components/ui/` and a `tokens.ts`. Goal: make the green-on-black theme a named, reusable export so future teal-os implementations don't copy arbitrary Tailwind values.
- Status: parked — implementation complete here, extraction not started
- Prerequisite: agree on component library scope (just tokens? headless? or full shadcn fork?)

### H2 — Real agentic builds (original teal-os vision)
The vision was to define cells as agent task boundaries, with an orchestrator skill (`/teal-os-build`) dispatching a subagent per build step. Steps 20 uses labels (`[agent: cell-agent/...]`) but all code was written single-session.
- Next test: take Step 19 or Step 22 as a guinea pig — write the spec, produce a build plan, and attempt dispatching subagents via the `Agent` tool per step rather than writing all code inline
- Control points: the manifest system already provides pre/post verification contracts (`teal-os-fidelity`); the orchestrator just needs to read them
- Outcome question: does SDD + manifest contracts give enough structure for a subagent to build correctly within its declared boundary without full session context?

### H3 — SDD approach review (from this session)
This session was the first full SDD cycle for teal-os: spec → critique → build plan → build → fidelity. Observations to carry forward:
- The spec → build plan translation via `/teal-os-interpret` worked well as a control point before any code was written
- Phase 5 (spec deviations) validated the value of the BDD spec as a post-build reference — deviations were caught by comparing spec to observed behaviour, not by reading code
- The three-layer contract (manifest → TypeScript → validateTransition) held up; the typed-table DB deviation was the only significant divergence and it was documented
- Open question: at what granularity should the spec be written to support agentic builds? Current spec (BDD sections A–F) is the right level for human review but may be too coarse for per-step subagent scope

---

## Fidelity checkpoints

Run a spec-fidelity pass (G3 gate) at the end of each phase before starting the next:
- End of Phase 1: confirm types and flow logic match manifests
- End of Phase 2: confirm API routes satisfy BDD spec sections A–E
- End of Phase 3: confirm UI cells satisfy all ❌ statements in scope
- End of Phase 5: confirm spec deviations C.2.2 and D.2.2 are resolved and spec updated
