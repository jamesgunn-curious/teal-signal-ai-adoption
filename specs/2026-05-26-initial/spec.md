# BDD Spec — Signal Digest (Initial)

Version: 0.4 | Date: 2026-05-28 | Status: Active — implementation in progress
Blueprint: `docs/blueprint.md` | ADRs: `docs/adr/`

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

⏸ **A.1.3** — *Deferred to Thread Layer spec. Specced in `specs/2026-05-27-hypothesis-layer/spec.md`. Research threads (formerly hypotheses) are a separate build.*

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

✅ **A.2.5**
Given I am a researcher viewing any active or paused source,
When I click "Edit" on a source,
Then an inline form appears pre-populated with the source's current name, feed URL, perspective, and tier,
And I can update any of those fields and save — the slug and topic association are not editable.

> Note: Edit source was added to fix incorrect feed URLs entered via Add Source (e.g. Substack profile URL vs RSS feed URL). PATCH `/api/sources/[id]` accepts name, feedUrl, perspective, tier, accessType in addition to status.

### A.3 — Topic summary view

✅ **A.3.1**
Given I am a researcher viewing a topic,
When I view the topic dashboard,
Then I can see article counts by status (discovered, fetched, processed, archived, paywalled, failed) and insight counts by status (extracted, curated, dismissed).

---

## Section B — Article Discover

A researcher triggers a discover run, which fetches RSS feeds for active sources and creates article instances for newly discovered URLs.

### B.1 — Trigger discover

✅ **B.1.1**
Given I am a researcher viewing a topic with at least one active source,
When I click "Discover",
Then the system fetches the RSS feed for each active source (using the configured lookback_days) and creates article instances for any URLs not already present in the system.

If the RSS item includes a `<content:encoded>` or `<description>` block with ≥ 150 words of usable text, the article is created with status `fetched` and `full_text` pre-populated from the RSS content — the Gather step is skipped for that article. Articles without sufficient RSS content are created with status `discovered` and require a separate Gather step.

⚠️ **B.1.2**
Given a discover run is in progress,
When the run completes,
Then I see a summary: N new articles discovered from M sources.

> Deviation: summary shows total new article count but no per-source breakdown in the UI. Per-source results (including errors) are returned in the API response but not surfaced to the user.

✅ **B.1.3**
Given a URL already exists in the system (any status),
When a discover run encounters the same URL,
Then no duplicate article is created — the existing article is not modified.

✅ **B.1.4**
Given an active source's RSS feed is unreachable,
When a discover run encounters that source,
Then the error is recorded per-source and the source continues to be active — it is not automatically paused.

### B.2 — View discovered articles

✅ **B.2.1**
Given articles have been discovered,
When I view the article queue filtered to `discovered`,
Then I see each article's title, source, published date, and perspective.

✅ **B.2.2**
Given a discovered article has a `fetchError` in its data (from a previous failed gather attempt),
When I view the article card,
Then the error message is visible on the card so the researcher understands why gather did not advance it.

---

## Section C — Article Gather

A researcher reviews discovered articles and triggers content retrieval for those worth reading.

> Note: Articles that arrive with RSS content (≥ 150 words) at Discover time are already in `fetched` status and skip this section.

### C.1 — Gather a single article

✅ **C.1.1**
Given an article with status `discovered`,
When I click "Gather" on that article,
Then the system retrieves the article content, populates `word_count`, `access_level`, and `full_text`, and advances the article status to `fetched`.

If the fetched content is fewer than 150 words (thin content — likely paywalled or blocked), the article remains in `discovered` with a `fetchError` noting the word count, and the researcher can mark it paywalled or try again later.

✅ **C.1.2**
Given an article fetch completes successfully,
When I view the article,
Then I can see the word count and access level.

### C.2 — Handle paywall and failures

✅ **C.2.1**
Given an article with status `discovered` or `fetched`,
When I click "Mark as paywalled",
Then the article status changes to `paywalled` (terminal) and it is removed from the active gather queue.

✅ **C.2.2**
Given an article gather fails (connection error, 404, thin content, etc.),
When the failure is detected,
Then the article remains in `discovered` status, a `fetchError` is stored in `data` JSONB with the reason, and the error is surfaced on the article card. The researcher can retry or mark it paywalled.

✅ **C.2.3**
Given I have reviewed a failed gather attempt,
When I click "Mark as failed",
Then the article status changes to `failed` (terminal) and it is removed from the active gather queue.

### C.3 — Batch gather

✅ **C.3.1 — Bulk gather all**
Given articles with status `discovered` exist,
When I click "Gather all N" on the dashboard,
Then each discovered article is fetched in sequence. Articles with sufficient content advance to `fetched`. Articles with thin content or fetch errors stay in `discovered` with `fetchError` recorded. A summary shows N gathered, M failed.

🟠 **C.3.2** — *Awaiting UI design.*
Given multiple articles with status `discovered`,
When I select a set and click "Gather selected",
Then the system gathers each selected article and updates statuses accordingly.

---

## Section D — Article Analyse

A researcher triggers LLM analysis on gathered articles to extract insights.

### D.1 — Analyse a single article

✅ **D.1.1**
Given an article with status `fetched`,
When I click "Analyse" on that article,
Then the system sends the article content to the Claude API with the insight extraction prompt and creates insight instances with status `extracted` for each insight returned.

✅ **D.1.2**
Given analysis completes,
When I view the article,
Then the article status has advanced to `processed`, the `executive_summary` and `tags` fields are populated, and the insight count is visible.

✅ **D.1.3**
Given analysis is complete,
When I navigate to the insights view filtered to this article,
Then I see each insight's text, quote, and tags.

### D.2 — Analysis constraints

✅ **D.2.1**
Given an article with status `discovered` (not yet gathered),
When I attempt to analyse it,
Then the "Analyse" action is not available — the article must be gathered first.

❌ **D.2.2**
Given an article that has already been analysed (`processed`),
When I attempt to analyse it again,
Then a confirmation is shown: re-analysing will add new insights but will not delete existing ones.

### D.3 — Batch analyse

✅ **D.3.1 — Bulk analyse all (new)**
Given articles with status `fetched` and no prior `analyseError` exist,
When I click "Analyse N new" on the dashboard,
Then each article is sent to the Claude API in sequence. Successfully analysed articles advance to `processed`. Failed articles remain in `fetched` with `analyseError` recorded in `data` JSONB. The dashboard updates to show "Retry M" for previously failed articles.

✅ **D.3.2 — Retry failed analyses**
Given articles with status `fetched` and an `analyseError` in `data` exist,
When I click "Retry M" on the dashboard,
Then the same bulk analysis runs for those articles. On success, `analyseError` is cleared and status advances to `processed`. On continued failure, the error is updated.

✅ **D.3.3 — Distinguish new from retries**
Given the dashboard shows gathered articles awaiting analysis,
When there is a mix of newly gathered articles (no prior attempt) and previously failed articles,
Then the dashboard shows two separate action buttons: "Analyse N new" and "Retry M" — so the researcher can see at a glance how many are first-time vs re-attempts.

✅ **D.3.4 — Analyse error surfacing**
Given an article has a recorded `analyseError`,
When I view the article card,
Then the error message is visible (amber colour, distinct from the red `fetchError`) so I understand why analysis has not yet succeeded.

🟠 **D.3.5** — *Awaiting UI design.*
Given multiple articles with status `fetched`,
When I select a set and click "Analyse selected",
Then each article is analysed in sequence with progress indication.

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

🟠 **F.3.1** — *Awaiting UI design. Do not implement until design is provided.*
Given curated insights exist across multiple discover runs,
When I view the trends panel,
Then I see tag frequency over time.

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
Then I see only the digest — without having to log out.

---

## Open items summary

| ID | Type | Description |
|----|------|-------------|
| B.1.2 | ⚠️ Deviation | Discover summary shows total count only — no per-source breakdown in UI |
| D.2.2 | ❌ Not built | Re-analyse confirmation dialog |
| A.1.1/A.1.2 | ❌ Deferred | Topic create/archive UI (single-topic v1) |
| C.3.2/D.3.5 | 🟠 Blocked | Batch gather/analyse selected — awaiting UI design |
| F.3.1 | 🟠 Blocked | Trends view — awaiting UI design |
| A.1.3/E.2.1 | ⏸ Deferred | Thread layer (separate spec), insight editing — teal-os extension candidates |

---

## Decisions log

| ID | Decision | Status |
|----|----------|--------|
| A.1.3 | Thread layer (research narratives) | ⏸ Separate spec — `specs/2026-05-27-hypothesis-layer/spec.md` |
| C.3.2 / D.3.5 | Batch gather/analyse selected UX | 🟠 Awaiting UI design |
| E.2.1 | Insight editing | ⏸ Deferred — teal-os extension candidate |
| F.3.1 | Trends view | 🟠 Awaiting UI design |
| Blueprint | Full text storage | ✅ Resolved — dedicated `text` column (ADR-003) |
| Blueprint | Multi-topic UI | ✅ Resolved — single topic for v1 |
| Blueprint | RSS content at discover | ✅ Resolved — `<content:encoded>` captured at discover time; articles with ≥ 150 words go straight to `fetched` |
| Blueprint | Analyse error tracking | ✅ Resolved — `analyseError` in data JSONB; dashboard splits new vs retry |
