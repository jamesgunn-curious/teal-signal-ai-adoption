# Build Plan — Signal Digest

Generated: 2026-05-26 | Spec: `spec.md` | Blueprint: `docs/blueprint.md`

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
Spec: A.1, A.2

### Step 7 — Gather action
`[x]` `POST /api/topics/[id]/gather` — fetch RSS feeds, create `discovered` articles
`[x]` Deduplication on `url` field
`[x]` Returns summary: N new articles from M sources
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
Spec: D.1, D.2

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

`[⏸]` **Step 16 — Batch actions** (C.3.1, D.3.1) — awaiting UI design URL
`[⏸]` **Step 17 — Trends view** (F.3.1) — awaiting UI design URL

---

## Fidelity checkpoints

Run a spec-fidelity pass (G3 gate) at the end of each phase before starting the next:
- End of Phase 1: confirm types and flow logic match manifests
- End of Phase 2: confirm API routes satisfy BDD spec sections A–E
- End of Phase 3: confirm UI cells satisfy all ❌ statements in scope
