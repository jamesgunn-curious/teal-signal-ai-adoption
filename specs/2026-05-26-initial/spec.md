# BDD Spec — Signal Digest (Initial)

Version: 0.3 | Date: 2026-05-27 | Status: Active — implementation in progress
Blueprint: `docs/blueprint.md` | ADRs: `docs/adr/`

Status markers reflect current implementation state as of 2026-05-27.

Status markers: ✅ implemented | ❌ not implemented | 🟠 open decision — resolve before implementing | ⚠️ known issue | ⏸ deferred

---

## Section A — Topic & Source Management

A researcher manages the research scope: creating topics, registering sources, and reviewing topic health.

### A.1 — Create a topic

❌ **A.1.1**
Given I am a researcher on the topics page,
When I click "New topic" and complete the form (name, description, lookback_days),
Then a new topic is created with status `active` and I am taken to the topic detail view.

> Note: Single-topic v1 — `ai-adoption` is seeded. Topic creation UI deferred per blueprint multi-topic decision.

❌ **A.1.2**
Given I am a researcher viewing a topic,
When I click "Archive topic",
Then the topic status changes to `archived`, all associated sources are paused, and the topic no longer appears in the active topics list.

> Note: Deferred with A.1.1.

⏸ **A.1.3** — *Deferred: Hypothesis management is out of scope for v1. Parked as a teal-os extension candidate — see `.c4/design/hypothesis-management-extension.md`.*

### A.2 — Manage sources

✅ **A.2.1**
Given I am a researcher viewing a topic,
When I click "Add source" and provide name, slug, feed_url, perspective, and tier,
Then the source is created with status `active` and appears in the topic's source list.

✅ **A.2.2**
Given I am a researcher viewing an active source,
When I click "Pause source",
Then the source status changes to `paused` and it is excluded from future gather runs.

✅ **A.2.3**
Given I am a researcher viewing a paused source,
When I click "Resume source",
Then the source status returns to `active` and it is included in future gather runs.

✅ **A.2.4**
Given I am a researcher viewing any source,
When I click "Remove source",
Then the source status changes to `removed`, it is permanently excluded from gather runs, and existing articles from that source are retained.

### A.3 — Topic summary view

✅ **A.3.1**
Given I am a researcher viewing a topic,
When I view the topic dashboard,
Then I can see article counts by status (discovered, fetched, processed, archived, paywalled, failed) and insight counts by status (extracted, curated, dismissed).

---

## Section B — Article Gather

A researcher triggers a gather run, which fetches RSS feeds for active sources and creates article instances for newly discovered URLs.

### B.1 — Trigger gather

✅ **B.1.1**
Given I am a researcher viewing a topic with at least one active source,
When I click "Gather articles",
Then the system fetches the RSS feed for each active source (using the configured lookback_days) and creates article instances with status `discovered` for any URLs not already present in the system.

⚠️ **B.1.2**
Given a gather run is in progress,
When the run completes,
Then I see a summary: N new articles discovered from M sources, with a link to view the newly discovered articles.

> Deviation: summary shows total new article count but no direct link to the discovered filter. Minor — link to `/articles?status=discovered` not yet added to gather result.

✅ **B.1.3**
Given a URL already exists in the system (any status),
When a gather run encounters the same URL,
Then no duplicate article is created — the existing article is not modified.

✅ **B.1.4**
Given an active source's RSS feed is unreachable,
When a gather run encounters that source,
Then the error is surfaced in the gather summary and the source continues to be active — it is not automatically paused.

### B.2 — View discovered articles

✅ **B.2.1**
Given articles have been discovered,
When I view the article queue filtered to `discovered`,
Then I see each article's title, source, published date, and perspective.

---

## Section C — Article Fetch

A researcher reviews discovered articles and triggers content retrieval for those worth reading.

### C.1 — Fetch a single article

✅ **C.1.1**
Given an article with status `discovered`,
When I click "Fetch" on that article,
Then the system retrieves the article content, populates `word_count`, `access_level`, and `full_text`, and advances the article status to `fetched`.

✅ **C.1.2**
Given an article fetch completes successfully,
When I view the article,
Then I can see the word count and a preview of the article content.

### C.2 — Handle paywall and failures

✅ **C.2.1**
Given an article with status `discovered` or `fetched`,
When I click "Mark as paywalled",
Then the article status changes to `paywalled` (terminal) and it is removed from the active fetch queue.

⚠️ **C.2.2**
Given an article fetch fails (connection error, 404, etc.),
When the failure is detected,
Then the article remains in `discovered` status, the error reason is surfaced in the article detail, and I can retry or mark it as failed.

> Deviation: current implementation auto-advances to `failed` on fetch error rather than remaining in `discovered`. Error reason is not surfaced in the article card. Spec intent was to let the researcher decide. To fix: catch the error, leave status as `discovered`, store error message in data JSONB, surface in UI.

✅ **C.2.3**
Given I have reviewed a failed fetch attempt,
When I click "Mark as failed",
Then the article status changes to `failed` (terminal) and it is removed from the active fetch queue.

### C.3 — Batch fetch

🟠 **C.3.1** — *Awaiting UI design (to be supplied via claude-design URL). Do not implement until design is provided.*
Given multiple articles with status `discovered`,
When I select a set of articles and click "Fetch selected",
Then the system fetches each selected article in sequence and updates statuses accordingly. A progress indicator shows N of M completed.

---

## Section D — Article Processing

A researcher triggers LLM analysis on fetched articles to extract insights.

### D.1 — Process a single article

✅ **D.1.1**
Given an article with status `fetched`,
When I click "Process" on that article,
Then the system sends the article content to the Claude API with the configured insight extraction prompt and creates insight instances with status `extracted` for each insight returned.

✅ **D.1.2**
Given processing completes,
When I view the article,
Then the article status has advanced to `processed`, the `executive_summary` and `tags` fields are populated, and I can see the count of insights extracted.

✅ **D.1.3**
Given processing is complete,
When I navigate to the insights view filtered to this article,
Then I see each insight's text, quote, and tags.

### D.2 — Processing constraints

✅ **D.2.1**
Given an article with status `discovered` (not yet fetched),
When I attempt to process it,
Then the "Process" action is not available — the article must be fetched first.

❌ **D.2.2**
Given an article that has already been processed,
When I attempt to process it again,
Then a confirmation is shown: re-processing will add new insights but will not delete existing ones.

### D.3 — Batch process

🟠 **D.3.1** — *Awaiting UI design (same design as C.3.1 — to be supplied via claude-design URL).*
Given multiple articles with status `fetched`,
When I select a set and click "Process selected",
Then each article is processed in sequence and a progress indicator is shown.

---

## Section E — Insight Curation

A researcher reviews extracted insights and curates (keeps) or dismisses (discards) each one.

### E.1 — Curate and dismiss

✅ **E.1.1**
Given an insight with status `extracted`,
When I click "Curate",
Then the insight status changes to `curated` and it appears in the digest and curated insights views.

✅ **E.1.2**
Given an insight with status `extracted`,
When I click "Dismiss",
Then the insight status changes to `dismissed` and it is excluded from digest views (but remains accessible in the full insights list with appropriate filtering).

✅ **E.1.3**
Given I am viewing the insight curation queue,
When I filter to `extracted`,
Then I see only insights not yet curated or dismissed, ordered by article (most recently processed first).

### E.2 — Insight editing

⏸ **E.2.1** — *Deferred: Insight editing is out of scope for v1. Parked as a teal-os extension candidate — see `.c4/design/insight-editing-extension.md`.*

### E.3 — Digest preview during curation

✅ **E.3.1**
Given I am curating insights,
When I view the insight curation queue,
Then I can see which digest section each insight will appear in, based on its current tags (shown as "→ Section name" label on each insight card).

---

## Section F — Digest View

A reader or researcher views curated insights organised by digest section, with filtering by source and tag.

### F.1 — Digest display

✅ **F.1.1**
Given curated insights exist,
When I navigate to the digest view for a topic,
Then I see insights grouped into the topic's configured digest sections, with each insight showing its text, quote, source, and tags.

✅ **F.1.2**
Given a digest section has no curated insights,
When I view the digest,
Then the section is hidden — it does not display an empty section header.

### F.2 — Filtering

✅ **F.2.1**
Given I am viewing a digest,
When I select a tag from the tag filter,
Then only insights tagged with that tag are shown, across all digest sections.

✅ **F.2.2**
Given I am viewing a digest,
When I select a source from the source filter,
Then only insights from articles sourced from that feed are shown.

✅ **F.2.3**
Given I have applied filters,
When I click "Clear filters",
Then all curated insights are shown and the filter UI resets.

### F.3 — Trends

🟠 **F.3.1** — *Awaiting UI design (to be supplied via claude-design URL). Do not implement until design is provided.*
Given curated insights exist across multiple gather runs,
When I view the trends panel,
Then I see tag frequency over time (how many insights per tag per run).

---

## Section G — Roles & Access

### G.1 — Role-based views

✅ **G.1.1**
Given I am a reader (not a researcher),
When I visit the application,
Then I can view the digest (Section F) only — the article queue, insight curation queue, dashboard, and source management are not accessible from the navigation.

✅ **G.1.2**
Given I am a researcher,
When I switch to "reader view" using the role toggle in the sidebar,
Then I see only the digest — the same view a reader would see — without having to log out.

---

## Open items summary

| ID | Type | Description |
|----|------|-------------|
| B.1.2 | ⚠️ Deviation | Gather summary missing link to discovered filter |
| C.2.2 | ⚠️ Deviation | Fetch failure auto-advances to `failed` instead of staying `discovered` + surfacing error |
| D.2.2 | ❌ Not built | Re-process confirmation dialog |
| A.1.1/A.1.2 | ❌ Deferred | Topic create/archive UI (single-topic v1) |
| C.3.1/D.3.1 | 🟠 Blocked | Batch fetch/process — awaiting UI design |
| F.3.1 | 🟠 Blocked | Trends view — awaiting UI design |
| A.1.3/E.2.1 | ⏸ Deferred | Hypothesis management, insight editing — teal-os extension candidates |

---

## Decisions log

| ID | Decision | Status |
|----|----------|--------|
| A.1.3 | Hypothesis management | ⏸ Deferred — teal-os extension candidate |
| C.3.1 / D.3.1 | Batch fetch/process UX | 🟠 Awaiting UI design (claude-design URL) |
| E.2.1 | Insight editing | ⏸ Deferred — teal-os extension candidate |
| F.3.1 | Trends view | 🟠 Awaiting UI design (claude-design URL) |
| Blueprint | Full text storage | ✅ Resolved — dedicated `text` column (ADR-003) |
| Blueprint | Multi-topic UI | ✅ Resolved — single topic for v1; major UX scope increase deferred |
