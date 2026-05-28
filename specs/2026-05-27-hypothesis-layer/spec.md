# BDD Spec — Thread Layer

Version: 0.2 | Date: 2026-05-27 | Status: Critique resolved — ready for build plan
Related: `specs/2026-05-26-initial/spec.md` §A.1.3 | Design: `.c4/design/hypothesis-management-extension.md`

---

## Context

A researcher tracks ongoing research narratives — *threads* — across multiple digest cycles. A thread is a named research narrative that accumulates evidence (curated insights) as articles are gathered and analysed. It evolves, shifts, and can spawn new sources to pull on. It never fully "closes" — it's a living structure.

This is the layer that turns a list of curated insights into tracked research. Without threads, the digest is a flat list. With threads, each insight lands somewhere in a long-running story.

The research loop this enables:
1. Gather articles → Analyse → Curate insights
2. Review curated insights in context of active threads
3. Link evidence to threads (from thread detail)
4. Thread view reveals new angles → add a source specifically to chase a thread
5. Next gather cycle pulls from new source → more evidence → thread deepens

**Design decisions resolved:**
- Thread, not Hypothesis — a living narrative, not a testable claim
- Dashboard panel as entry point; each thread opens to a detail page (`/threads/[id]`)
- Linking is a deliberate post-curation step from thread detail (not inline with curation)
- No stance field in v1 — evidence is evidence; thread text carries interpretation
- Thread status: `active | dormant | closed` (not confirmed/rejected)
- Transitions handled inline in API route — no new Teal Flow type needed

---

## Section H — Thread Management

### H.1 — Create and manage threads

**H.1.1**
Given I am a researcher on the dashboard,
When I view the Threads panel and click "New thread",
Then I can enter a title and a short description (the narrative or question I'm following),
And the thread is created with status `active` and appears in the panel.

**H.1.2**
Given I am a researcher viewing the Threads panel,
When I view an `active` thread card,
Then I see: title, status badge, count of linked insights, last updated date.

**H.1.3**
Given I am a researcher viewing the Threads panel,
When I click a thread card,
Then I am taken to the thread detail page (`/threads/[id]`).

**H.1.4**
Given I am a researcher on a thread detail page,
When I click "Edit",
Then I can update the title and description without changing status or losing linked insights.

**H.1.5**
Given I am a researcher on a thread detail page,
When I change the status to `dormant`,
Then the thread recedes in the dashboard panel (shown below active threads, dimmed) but is not archived.

**H.1.6**
Given I am a researcher on a thread detail page,
When I click "Close thread",
Then the thread moves to `closed`, it is hidden from the dashboard panel by default (visible with "show closed" toggle), and linked insights are retained.

---

### H.2 — Link insights to threads

**H.2.1**
Given I am a researcher on a thread detail page,
When I click "Add evidence",
Then I see a filterable list of all `curated` insights for the current topic,
And I can select one or more insights to link to this thread.

**H.2.2**
Given I am a researcher on a thread detail page,
When I view linked insights,
Then I see each insight with its text, quote, source article title, and a "Remove" action.

**H.2.3**
Given I am a researcher viewing a curated insight (in the insights list or digest),
When the insight is linked to one or more threads,
Then I see thread title badges on the insight card.

**H.2.4**
Given I am a researcher on a thread detail page,
When I click "Remove" on a linked insight,
Then the link is removed; the insight itself is unaffected.

**H.2.5**
Given I am a researcher on a thread detail page,
When I click "Add evidence" and the insight picker is open,
Then dismissed insights are excluded — only `curated` insights appear.

---

### H.3 — Thread detail page

**H.3.1**
Given I am a researcher on a thread detail page,
When I view the page,
Then I see: thread title, description, status, created/updated dates, and all linked insights in reverse-chronological order (most recently linked first).

**H.3.2**
Given I am a researcher on a thread detail page,
When I view a linked insight,
Then I can see the source article title (linked to the article URL) and the insight's perspective and tags.

**H.3.3**
Given I am a researcher on a thread detail page,
When I click "Add source for this thread",
Then I am taken to the dashboard with the Add Source form pre-opened.
> Note: v1 shortcut — full source-from-thread flow is a deferred extension.

---

### H.4 — Dashboard panel

**H.4.1**
Given I am a researcher on the dashboard,
When I view the Threads panel (below the pipeline summary),
Then I see: active threads first, dormant threads below (dimmed), with a "show closed" toggle.

**H.4.2**
Given I am a researcher on the dashboard with no threads,
When I view the Threads panel,
Then I see a prompt: "No threads yet — start one to track a research narrative."

---

### H.5 — Reader view

**H.5.1**
Given I am a reader,
When I navigate to `/threads/[id]`,
Then I see the thread title, description, and linked curated insights — without edit controls.

**H.5.2**
Given I am a reader on the dashboard,
When I view the Threads panel,
Then I see `active` and `dormant` threads only — `closed` threads are hidden.

---

## Entity: Thread

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | — |
| `topic_id` | string FK | References Topic |
| `title` | string | Short label, e.g. "AI fatigue is real but context-specific" |
| `description` | text | The narrative or question being followed |
| `status` | ThreadStatus | `active \| dormant \| closed` |
| `created_at` | timestamp | — |
| `updated_at` | timestamp | — |

## Entity: InsightThreadLink (join)

| Field | Type | Notes |
|-------|------|-------|
| `insight_id` | UUID FK | References Insight — `ON DELETE CASCADE` |
| `thread_id` | UUID FK | References Thread — `ON DELETE CASCADE` |
| `created_at` | timestamp | — |

Composite PK: `(insight_id, thread_id)`

---

## New type

`ThreadStatus = 'active' | 'dormant' | 'closed'`

Add to `src/lib/types.ts`.

---

## Deferred extensions

- **Thread → source linking**: researcher attaches a new source directly to a thread at discovery time; source is tagged with the spawning thread for traceability
- **Thread narrative notes**: free-text notes block on thread detail where researcher can write up evolving interpretation (separate from description)
- **Cross-thread insight view**: "which threads does this insight touch?" — visible when an insight is linked to multiple threads
- **Article full-text reader**: in-app reader mode using stored `fullText` so researcher can read without leaving the tool (currently links out to URL)
