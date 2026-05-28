# Blueprint — Signal Digest

Version: 0.2 | Date: 2026-05-28 | Status: Active

This is the structural foundation for the Signal Digest Teal OS implementation. It defines what entities exist, how they relate, and what states they can be in. BDD specs in `specs/` describe what the system *does*; this document describes what the system *is*. Refer to `docs/sdd-approach-ref.md` for the SDD methodology these artefacts follow.

---

## Domain model

```
Topic (1) ─────────────── (many) Source
  │                                 │
  │                         source_slug
  │                                 │
  └──────────── (many) Article ◄────┘
                      │
                      └──── (many) Insight

Tags: flat vocabulary per topic, shared across Articles and Insights
      stored as string arrays (not a join table)
```

### Key relationships

- A **Topic** defines a research scope: its sources, tag vocabulary, digest sections, and active hypotheses.
- A **Source** is an RSS/Atom feed registered under a topic, with a perspective and tier.
- An **Article** is discovered via a source's feed and moves through a defined lifecycle.
- An **Insight** is a discrete paragraph-level observation extracted from a processed article.

---

## Entity types

### Article

The primary workflow entity. Moves through gather → fetch → process stages, all user-initiated.

**Core columns** (typed, queryable):

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Slug: `{source}--{date}--{title-slug}` |
| `topic_id` | string | References Topic.id |
| `source_slug` | string | References Source.slug |
| `status` | ArticleStatus | Managed by Teal Flow |
| `url` | string | Deduplication key |
| `published_date` | date | From RSS feed |
| `created_at` | timestamp | — |
| `updated_at` | timestamp | — |

**Data fields** (JSONB — see ADR-002):

| Field | Type | Populated at | Notes |
|-------|------|-------------|-------|
| `title` | string | discover step | — |
| `perspective` | enum | discover step (from source config) | — |
| `tier` | '1' \| '2' | discover step (from source config) | — |
| `word_count` | number | discover or gather step | Set at discover if RSS content extracted; else set at gather |
| `access_level` | enum | discover or gather step | `full` (>500w) \| `partial` (150–500w) \| `thin` (<150w) |
| `executive_summary` | string | analyse step | 2-sentence LLM summary |
| `tags` | string[] | analyse step | From topic tag vocabulary |
| `fetch_error` | string? | gather step | Set when gather fails or content is thin; article stays `discovered` |
| `analyse_error` | string? | analyse step | Set when Claude API call fails; article stays `fetched` for retry; cleared on success |
| `full_text` | — | — | Stored as dedicated `text` column (not in JSONB) — see ADR-003 |

**States**: `discovered` → `fetched` → `processed` → `archived` + `paywalled` | `failed` (terminal)

**Roles**: `researcher` (all transitions), `reader` (view `processed` and `archived` only)

---

### Insight

Extracted from a processed article. Has its own curation lifecycle.

**Columns**:

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID |
| `article_id` | string | References Article.id |
| `status` | InsightStatus | — |
| `text` | text | The insight claim (paragraph-level, one coherent argument) |
| `quote` | text | Direct supporting quote from the article |
| `tags` | string[] | From topic tag vocabulary |
| `perspective` | enum | Inherited from source; may be overridden |
| `created_at` | timestamp | — |
| `updated_at` | timestamp | — |

**States**: `extracted` → `curated` | `dismissed`

**Roles**: `researcher` (curate/dismiss), `reader` (view `curated` only)

---

### Topic

Configuration entity. A research focus area with sources, tag vocabulary, digest sections, and hypotheses.

**Columns**:

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Slug, e.g. `ai-adoption` |
| `name` | string | Display name |
| `description` | text | Research purpose |
| `lookback_days` | number | Default RSS lookback window |
| `hypotheses` | text[] | Active research threads |
| `status` | TopicStatus | — |

**States**: `active` | `archived`

**Roles**: `researcher` (create/manage/archive), `reader` (view)

---

### Source

An RSS/Atom feed registered against a topic. Config entity — no complex workflow.

**Columns**:

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Slug — not editable after creation |
| `topic_id` | string | References Topic.id — not editable after creation |
| `name` | string | Display name — editable |
| `slug` | string | e.g. `lennys-newsletter` — same as id |
| `feed_url` | string | RSS/Atom URL — editable (use Edit to correct wrong URLs) |
| `perspective` | enum | practitioner, leadership, product, research, editorial — editable |
| `tier` | '1' \| '2' | Content quality tier — editable |
| `access_type` | enum | free, free+paid — editable |
| `status` | SourceStatus | Managed via Pause/Resume/Remove actions |

**States**: `active` | `paused` | `removed`

**Roles**: `researcher` (add, edit, pause, resume, remove), `reader` (view active sources only)

**Edit source:** `PATCH /api/sources/[id]` accepts any combination of `name`, `feedUrl`, `perspective`, `tier`, `accessType`, `status`. The inline Edit form in the dashboard pre-populates current values. Slug and topic_id are immutable.

---

## State flows

### Article ingestion flow

```
                      [Discover action]
                   fetches RSS feeds in bulk
                             │
              ┌──────────────┴──────────────────────┐
      RSS has ≥150 words                  RSS has no / thin content
      content:encoded                               │
              │                                     ▼
              │                               discovered
              │                                     │
              │              ┌──────────────┬───────┴──────┐
              │          [Gather]    [Mark paywalled]  (error →
              │              │              │           fetchError
              │              │              ▼            in data)
              │              │           paywalled
              │              │           (terminal)
              └──────────────▼
                          fetched
                             │
                    ┌────────┴────────┐
                [Analyse]        (error →
                    │           analyseError
                    │            in data,
                    │           stays fetched
                    │            for retry)
                    ▼
                processed
                    │
                [Archive]
                    │
                    ▼
                 archived
                 (terminal)
                 
              failed (terminal) — manual mark only
```

Key constraints:
- `paywalled`, `failed`, and `archived` are terminal — no transition out
- `fetchError` and `analyseError` are recorded in `data` JSONB; article stays in its current status for retry
- Articles with RSS content (≥ 150 words in `<content:encoded>`) are created as `fetched` at Discover time — Gather step is skipped
- Legacy `fetched` articles with no `full_text` are moved back to `discovered` by bulk-analyse (data cleanup)

### Insight curation flow

```
         extracted
        ╱          ╲
   [Curate]      [Dismiss]
     ╱                  ╲
  curated             dismissed
  (terminal)          (terminal)
```

---

## Key payload shapes

These interfaces are defined in `src/lib/types.ts` within this project. They are not imported from teal-os-framework — they are this implementation's own code-level expression of the entity manifests in `.c4/entities/`. If the manifest and the interface diverge, the manifest is the source of truth.

### TypeScript interfaces

```typescript
type ArticleStatus = 'discovered' | 'fetched' | 'processed' | 'archived' | 'paywalled' | 'failed'
type InsightStatus = 'extracted' | 'curated' | 'dismissed'
type TopicStatus = 'active' | 'archived'
type SourceStatus = 'active' | 'paused' | 'removed'
type Perspective = 'practitioner' | 'leadership' | 'product' | 'research' | 'editorial'
type Tier = '1' | '2'
type AccessLevel = 'full' | 'partial' | 'thin'

interface ArticleData {
  title: string
  perspective: Perspective
  tier: Tier
  wordCount?: number
  accessLevel?: AccessLevel
  executiveSummary?: string
  tags: string[]
  fetchError?: string    // set when gather fails or thin content; article stays discovered
  analyseError?: string  // set when Claude API fails; article stays fetched for retry; cleared on success
  // fullText is NOT in ArticleData — it is a dedicated text column on the articles table (see ADR-003)
}

interface ArticleInstance {
  id: string
  entityType: 'article'
  topicId: string
  sourceSlug: string
  url: string
  publishedDate: string
  status: ArticleStatus
  data: ArticleData
  createdAt: string
  updatedAt: string
}

interface InsightInstance {
  id: string
  entityType: 'insight'
  articleId: string
  status: InsightStatus
  text: string
  quote: string
  tags: string[]
  perspective: Perspective
  createdAt: string
  updatedAt: string
}
```

---

## Tech stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js (App Router) | Server actions for all mutations |
| Language | TypeScript (`strict: true`) | See ADR-004 |
| ORM | Drizzle ORM | Schema-first, migrates to Postgres |
| Database | PostgreSQL | Local: `localhost:5432/signal_ai_adoption` |
| UI components | shadcn/ui + Tailwind CSS | |
| State | Zustand | Client-only — server state via server actions |
| AI | Claude API (Anthropic SDK) | Used in Step 9: process action |

Next.js version: read from `node_modules/next/dist/docs/` before writing any Next.js code — see AGENTS.md.

---

## Structural decisions

✅ **Full text storage** — Resolved 2026-05-26. See ADR-003.
`full_text` is a dedicated `text` column on the `articles` table, not part of the JSONB `data` field. This keeps the JSONB data field for variable content metadata while giving `full_text` its own typed column (enabling future full-text search indexing if needed). All other article content fields remain in JSONB per ADR-002.

✅ **Multi-topic UI** — Resolved 2026-05-26.
Single topic (`ai-adoption`) for v1. Multi-topic is a major UX scope addition. Deferred. Do not hardcode topic IDs; use a parameterisable reference, but don't build topic-switching UI.

✅ **RSS content extraction at Discover** — Resolved 2026-05-28.
The Discover route extracts `<content:encoded>` (preferring it) or `<description>` from each RSS item. If the resulting plain text is ≥ 150 words, the article is created as `fetched` with `full_text` already set — the Gather step is skipped. This is critical for newsletter platforms (Substack, etc.) that render their article pages client-side and cannot be scraped via plain HTTP fetch. Free articles typically yield full text; paywalled articles yield a teaser (usually sufficient for analysis).

✅ **Analyse error tracking** — Resolved 2026-05-28.
When bulk-analyse encounters a Claude API failure, `analyseError` is written to the article's `data` JSONB and the article remains in `fetched` status. On the next successful analysis, `analyseError` is cleared. The dashboard distinguishes new `fetched` articles (no prior attempt) from retry candidates (have `analyseError`) and shows separate "Analyse N new" and "Retry M" buttons. Error messages are surfaced on article cards.

✅ **Source editability** — Resolved 2026-05-28.
Sources can be edited (name, feedUrl, perspective, tier, accessType) via `PATCH /api/sources/[id]` and inline Edit form. Slug and topic_id are immutable. Motivation: incorrect feed URLs (e.g. Substack profile page vs RSS URL) need to be correctable without removing and re-adding the source.

⏸ **Insight editing post-extraction** — Deferred. See `.c4/design/insight-editing-extension.md`.

⏸ **Thread layer** — Specced. See `specs/2026-05-27-hypothesis-layer/spec.md`. Research threads (formerly hypotheses) are a first-class entity with a separate build plan.

🟠 **Batch actions (selected articles)** — Awaiting UI design. Bulk-all (gather all, analyse all, retry all) is implemented. Individual article selection + batch apply is deferred pending design.

---

## AI adoption topic — seed data

The `ai-adoption` topic from the existing signal system provides the initial seed data. Key reference values:

**Perspectives**: practitioner, leadership, product, research, editorial

**Sources (seeded — 9)**: lennys-newsletter, pragmatic-engineer, engineering-leadership (canopy.is — dormant since Aug 2025), the-beautiful-mess, dev-interrupted, the-engineering-manager, one-useful-thing, leaddev, martinfowler

**Sources (added via UI)**: @gregorojstersek → `newsletter.eng-leadership.com/feed` (Gregor Ojstersek, weekly engineering leadership)

**Tag vocabulary (22 tags, 5 groups)**:
- Problem selection: right-problem, prioritisation, differentiation
- Velocity: shipping-fast, iteration, refactoring, parallel-work
- AI & tools: ai-tools, llm, agents, automation, ai-limitations
- People & culture: culture, leadership, org-change, reskilling, human-factors, resistance
- Cases: success-story, failure, cautionary-tale, research, early-adopter

**Digest sections (5)**:
- Problem selection & design
- Velocity & delivery
- AI tools & automation
- People, culture & org change
- Cases & research
