# Spec: UI Redesign — nav restructure, chrome, status tokens, wireframe adoption

**Date:** 2026-05-29
**ADR:** ADR-005
**Design reference:** `.c4/design/Signal-Digest-Wireframe.html`
**Status markers:** ✅ implemented · ❌ not yet · 🟠 open decision · ⚠️ known issue · ⏸ deferred

---

## Context

The wireframe prototype (`.c4/design/Signal-Digest-Wireframe.html`) introduced several structural and visual patterns that are being adopted into the production build. This spec captures the decisions, acceptance criteria, and open questions for each.

Agreed decisions are captured in ADR-005. This spec governs the implementation.

---

## Phase 1 — Status token system

> **Why first:** Every other phase renders status chips. The token system must exist before screens are rebuilt.

### 1.1 Token definitions

❌ Create `src/lib/status-tokens.ts` exporting a map of status → token shape:

```
{
  className: string        // e.g. 'status-discovered'
  label: string            // display label
}
```

Status values requiring tokens:

| Entity | Statuses |
|---|---|
| Article | discovered · fetched · processed · archived · paywalled · failed |
| Insight | extracted · curated · dismissed |
| Source | active · paused · removed |
| Topic | active · archived |

❌ Remove all inline Tailwind colour combos for status chips from existing pages. Replace with token classNames.

### 1.2 CSS custom properties

❌ In `src/app/globals.css`, define per-status CSS custom properties:

- `--status-{name}-bg` — background colour
- `--status-{name}-border` — border colour
- `--status-{name}-text` — text colour
- `--status-{name}-texture` — `repeating-linear-gradient(...)` or `none`

**Texture assignments (dark theme):**

| Status | Texture |
|---|---|
| discovered | sparse dot grid (45°, 4px repeat) |
| fetched | single diagonal stripe (45°, 6px repeat) |
| processed | none (solid — complete signal) |
| paywalled | cross-hatch (45° + 135°) |
| failed | tight diagonal (45°, 3px repeat) |
| archived | fine dot noise (very subtle) |
| extracted | sparse dot grid (same as discovered) |
| curated | none (solid) |
| dismissed | fine dot noise |
| active | none (solid) |
| paused | single diagonal stripe |
| removed | fine dot noise |

❌ All token properties scoped to `:root` (dark default). Light theme values scoped to `[data-theme="light"]` — values TBD when light theme is implemented (⏸).

### 1.3 StatusChip component

❌ Create `src/components/ui/status-chip.tsx` — renders a `<span>` using the token className. Replaces the inline `<span className="text-xs px-2 ...">` pattern used everywhere.

**Acceptance criteria:**
- Given any valid status string, StatusChip renders with the correct colour + texture
- Given an unknown status, StatusChip renders a neutral fallback (no crash)
- Removing `--status-{name}-texture` from `:root` and adding it to `[data-theme="light"]` is sufficient to switch texture off for light theme

---

## Phase 2 — Sidebar / nav restructure

> **Wireframe reference:** Brand cluster + grouped nav in `f17e0a6a` (app shell)

### 2.1 Brand cluster

❌ Replace the current sidebar header (text-only wordmark) with a brand cluster:
- `S` logomark (circle, teal stroke, large letter inside — see wireframe SVG thumbnail)
- "Signal Digest" name
- Topic slug below ("ai adoption")
- Role toggle (researcher / reader) inline below the name — not at the bottom of the sidebar

### 2.2 Grouped nav

❌ Restructure `src/components/nav/sidebar.tsx` nav links into two groups (Topics nav removed — no screen exists and multi-topic is deferred):

```
[Workflow]
  Sources       /dashboard (pipeline overview + sources — see D2)
  Gather        /gather (❌ new screen — Phase 4)
  Article queue /articles
  Curate        /insights

[Output]
  Digest        /digest
  Trends        /trends (⏸ deferred — show empty placeholder)
```

> **Decision — D1 resolved:** Topics nav link removed entirely. There is one topic, no topics management screen, and multi-topic support is ⏸ deferred. Re-introduce when a Topics screen is built.

**Acceptance criteria:**
- Nav renders two labelled groups with correct links
- Active state highlights the correct group item
- Role toggle in brand cluster replaces the role toggle at sidebar bottom
- Researcher sees all groups; reader sees Output group only

---

## Phase 3 — Per-screen header chrome

> **Wireframe reference:** `headerContext()` function in `f17e0a6a`

### 3.1 PageHeader component

❌ Create `src/components/ui/page-header.tsx`:

```tsx
<PageHeader
  crumbs={['Workflow', 'Article queue']}
  stats={[
    { n: 4, label: 'discovered', accent: true },
    { n: 3, label: 'fetched' },
  ]}
  actions={<Btn>↻ gather</Btn>}
/>
```

Props:
- `crumbs: string[]` — rendered as `Group / Screen`
- `stats: { n: number | string; label: string; accent?: boolean }[]`
- `actions?: ReactNode`
- `back?: { label: string; href: string }` — for detail screens

❌ Replace the current `<h1>` + count pattern on each page with `<PageHeader>`.

**Per-screen stat definitions** (matches wireframe `headerContext`):

| Screen | Stats |
|---|---|
| Sources / Dashboard | active sources · total sources |
| Gather | active feeds · lookback · last run |
| Article queue | discovered (accent if >0) · fetched · processed |
| Article detail | words · perspective · status pill |
| Curate (Insights) | to review (accent if >0) · curated · dismissed |
| Digest | curated insights · sections |

**Acceptance criteria:**
- PageHeader renders crumbs, stats, and actions slot
- Stats with `accent: true` render in the primary teal colour
- Back link renders correctly on detail screens

---

## Phase 4 — Dedicated Gather screen

> **Wireframe reference:** `GatherScreen` in `4cdff32a`

❌ Create `src/app/gather/page.tsx`

Content:
- PageHeader with gather stats (active feeds, lookback, last run)
- Source list showing which sources will be gathered from (active only)
- Run gather button (currently: DiscoverButton — move here, remove from dashboard)
- Per-source progress feedback during run (optional for Phase 4, can be ⏸)

❌ Remove `DiscoverButton` from `src/app/dashboard/page.tsx` header

❌ Add `/gather` to nav under Workflow group (Phase 2)

🟠 **Open:** Dashboard page — once Gather moves to its own screen and Sources gets its own section in nav, what does `/dashboard` become? Options:
- (a) Redirect `/dashboard` → `/gather` (dashboard dissolves)
- (b) Keep as pipeline overview only (pipeline tile bar + no sources table)
- (c) Rename to `/topics` and use it as the Topics screen

Recommend: (b) for now — keep the pipeline tile bar, strip the sources table, rename the section header to "Overview". Sources moves to its own page in Phase 5.

**Acceptance criteria:**
- `/gather` renders a page with the active sources list and a run gather button
- Clicking run gather triggers the same server action as the current DiscoverButton
- DiscoverButton is removed from dashboard

---

## Phase 5 — Bulk selection + contextual action bar on Article queue

> **Wireframe reference:** `QueueScreen` in `e52bff4d`

❌ Add checkbox selection to each article row in `src/app/articles/page.tsx`

❌ Replace the always-visible `BulkActions` component (currently in dashboard header) with a contextual bulk action bar that appears only when articles are selected:

```
[ 3 selected ] [ fetch selected ] [ process selected ] [ clear ]
```

❌ Move `BulkActions` off `src/app/dashboard/page.tsx`

❌ Show sequential progress during batch operations (matches wireframe `runBatch` simulation, but using real SSE or polling against actual server actions)

🟠 **Open:** Article queue is a server component. Checkbox selection requires client state. Options:
- (a) Convert articles page to a client component (fetches via API route)
- (b) Extract an `ArticleQueueClient` wrapper that holds selection state, wraps the server-rendered list
- (c) Use URL state for selection (hacky, not recommended)

Recommend: (b) — thin client wrapper, keep data fetching server-side.

**Acceptance criteria:**
- Checkboxes appear on each article row
- Select-all toggles visible rows
- Bulk action bar slides in when ≥1 article selected, disappears on clear
- Fetch / process actions work on selected articles only
- Progress feedback shown during batch run

---

## Phase 6 — Article detail screen

❌ Create `src/app/articles/[id]/page.tsx`

Content:
- PageHeader with back → queue, article stats (words, perspective, status pill)
- Article metadata (source, date, tags, access level)
- Executive summary
- Fetch / process / archive action buttons (inline, not dropdown)
- Extracted insights list (if processed)

❌ Article titles in the queue list become links to `/articles/[id]`

**Acceptance criteria:**
- `/articles/[id]` renders article metadata and content
- Status-appropriate action buttons shown (fetch if discovered, process if fetched, etc.)
- Back link returns to `/articles` queue

---

## Deferred

⏸ **Light theme** — token system is designed to support it; implementation deferred until dark theme is complete across all screens. See ADR-005.

⏸ **Trends screen** — `/trends` nav link present but screen not built. Show empty placeholder.

⏸ **Topics screen** (full) — multi-topic management. For now `/topics` redirects to `/dashboard`.

⏸ **Hypotheses layer** — tracked in `specs/2026-05-27-hypothesis-layer/`. Not in scope for this spec.
