---
c4_type: entity
entity_id: article
agent_id: article-agent
name: Article
version: 0.1.0
flow: article-ingestion
---

# Article — Entity Manifest

## What this entity type represents

A piece of content discovered from an RSS source, moved through a gather → fetch → process lifecycle. The central entity in the Signal Digest system. All insights are derived from articles.

## States

```
discovered → fetched → processed → archived (terminal)
                │
                ├── paywalled (terminal)
                └── failed (terminal)
```

| State | Meaning |
|-------|---------|
| `discovered` | URL known from RSS; metadata only (title, source, published date) |
| `fetched` | Full or partial content retrieved; word count, access level, full text populated |
| `processed` | LLM analysis complete; executive summary, tags, and insights created |
| `archived` | No longer actively surfaced; content preserved |
| `paywalled` | Content not accessible; terminal |
| `failed` | Fetch or processing failed; terminal |

## Fields

### Core columns (typed)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Slug: `{source}--{YYYY-MM-DD}--{title-slug}` |
| `entity_type` | `'article'` | — |
| `topic_id` | string | References Topic |
| `source_slug` | string | References Source |
| `url` | string | Canonical URL — deduplication key |
| `published_date` | date | From RSS feed |
| `status` | ArticleStatus | Managed by Teal Flow / article-ingestion |

### Data fields (JSONB — per ADR-002)

| Field | Populated at | Notes |
|-------|-------------|-------|
| `title` | discover | — |
| `perspective` | discover | Inherited from source config |
| `tier` | discover | Inherited from source config |
| `word_count` | fetch | — |
| `access_level` | fetch | full, partial, thin |
| `tags` | process | From topic tag vocabulary |
| `executive_summary` | process | 2-sentence LLM summary |

> **Note:** `full_text` is a dedicated `text` column on the `articles` table, not a JSONB data field. See ADR-003.

## Roles

| Role | Permissions |
|------|------------|
| `researcher` | Create (via gather), execute all transitions, view all states |
| `reader` | View `processed` and `archived` only |

## Touchpoints

| Cell | Interaction | Direction |
|------|-------------|-----------|
| Article Queue | Reads articles by status; surfaces transition actions | consumes |
| Gather Engine | Creates article instances via gather action | produces |
| Fetch Engine | Populates fetch-step fields; advances to `fetched` | produces |
| Analysis Engine | Populates process-step fields; advances to `processed` | produces |
| Insight entity | Articles are the parent of all insights | parent |
| Topic entity | Articles are scoped to a topic | scoped by |
| Teal Semantics | Entity type config consumed by rendering cells | defines |
| Teal Flow | `article-ingestion` flow governs all transitions | governed by |

## Agent change protocol

Before implementing any change to this entity type, the article-agent **must** clarify:

- [ ] Does the change add a new state? Update `ArticleStatus` in `src/lib/types.ts`, update the flow manifest `.c4/flows/article-ingestion.md`, and coordinate with all cells that render article status.
- [ ] Does the change add or modify a data field? Update the `EntityTypeConfig` in `src/lib/semantics.ts`. If the field needs indexing, add a generated column to the DB schema.
- [ ] Does the change modify `url` as the deduplication key? Review the gather engine — deduplication depends on this field.
- [ ] Does the change affect terminal states (`paywalled`, `failed`, `archived`)? Confirm no business logic expects to transition out of them.
- [ ] Does the change affect the Article → Insight relationship? Coordinate with the insight-agent.
