---
c4_type: flow
flow_id: article-ingestion
agent_id: article-ingestion-agent
name: Article Ingestion
parent_cell: teal-flow
version: 0.1.0
used_by: [article]
---

# Article Ingestion — Flow Manifest

## What this flow type defines

The lifecycle of an article from RSS discovery through content retrieval, LLM processing, and archival. All transitions are user-initiated via the UI (see ADR-001) — the flow defines which transitions are valid and which role can trigger them; the UI surfaces the appropriate actions per state.

## State machine

```
             [researcher: Gather]
          creates articles in bulk
                    │
                    ▼
                discovered ──[Archive]──┐
                    │                   │
               [Fetch]                  │
                    │                   ▼
                 fetched ─────[Archive]─►archived
                    │                  (terminal)
               [Process]
                    │
                 processed ──[Archive]──►
                    │
              ↑ [Re-analyse with confirm]

     paywalled ──[Re-gather]──► fetched
               ──[Archive]────► archived

       failed  ──[Re-gather]──► fetched
               ──[Archive]────► archived
```

## Transition definitions

| From | To | Allowed roles | Required inputs | Label |
|------|----|---------------|-----------------|-------|
| *(gather action)* | `discovered` | researcher | — | Gather (bulk create) |
| `discovered` | `fetched` | researcher | — | Fetch / Gather |
| `fetched` | `processed` | researcher | — | Analyse |
| `processed` | `processed` | researcher | confirmation dialog | Re-analyse |
| `paywalled` | `fetched` | researcher | — | Re-gather |
| `failed` | `fetched` | researcher | — | Re-gather |
| `discovered` | `archived` | researcher | — | Archive |
| `fetched` | `archived` | researcher | — | Archive |
| `processed` | `archived` | researcher | — | Archive |
| `paywalled` | `archived` | researcher | — | Archive |
| `failed` | `archived` | researcher | — | Archive |

> **Note:** `markPaywalled` and `markFailed` manual transitions were removed (2026-06-04). Paywalled/failed status is now system-set only (thin content detection on gather, or future auto-detection). Re-gather lets researchers retry paywalled/failed articles without creating a new instance.

## Validation rules

- `archived` is terminal — no transition out.
- `paywalled` and `failed` are recoverable via Re-gather (`fetch` action). If a second gather attempt also fails, the article returns to the same status with an updated `gatherFailCount`.
- `processed` → `processed` re-processing is allowed (appends new insights, does not delete existing ones) — requires a confirmation dialog (BDD D.2.2).
- Fail counts are tracked in article `data` JSONB: `gatherFailCount`, `gatherErrors[]`, `analyseFailCount`, `analyseErrors[]`. Use these to surface retry history to the researcher.
- A transition is invalid if the actor's role is not `researcher`.

## The gather action

"Gather" is not a standard transition (it creates instances rather than advancing existing ones). It is a bulk operation triggered by the researcher that:
1. Reads all active sources for a topic
2. Fetches each RSS/Atom feed
3. For each URL not already in the system: creates an article instance with status `discovered`, populating title, url, source_slug, topic_id, published_date, perspective, tier from the feed entry and source config
4. Returns a summary: N new articles discovered from M sources

The deduplication check is on `url` — if an article with that URL already exists (any status), no new instance is created.

## The fetch action

The fetch transition (discovered → fetched):
1. Retrieves the article content via HTTP
2. Populates `word_count`, `access_level`, and `full_text` in the article's `data` field
3. Advances status to `fetched`
4. If retrieval fails: leaves status as `discovered`, surfaces error — researcher then manually marks as paywalled or failed

## The process action

The process transition (fetched → processed):
1. Sends `full_text` to the Claude API with the topic's insight extraction prompt configuration
2. Creates one insight instance (status `extracted`) per extracted insight
3. Populates `executive_summary` and `tags` on the article
4. Advances article status to `processed`

## Side effects

- Status badge updates immediately in all cells on any transition
- Article count by status updates in the topic dashboard on any transition
- On `processed`: insight count displayed on article card

## Deferred extensions

- **Scrape-mode discover**: Sources with `feedType = 'scrape'` need a different gather path (HTML page crawl for article links). Specced in `specs/2026-06-04-smart-feed-discovery/spec.md` Step F. Requires robots.txt compliance before shipping.
- **Automated retry**: If fetch fails, auto-retry after N minutes. Not in scope for v1 — all retries are user-initiated.
- **Webhook / push ingestion**: Sources push new articles rather than being polled. Architectural extension — see `design/` if pursued.

## Built extensions (2026-06-04/05)

- **Bulk gather / analyse / archive**: Checkbox selection in article queue; sequential processing with progress. `discovered` → bulk Gather, `fetched` → bulk Analyse, `paywalled`/`failed` → bulk Re-gather, any → bulk Archive.
- **Smart discover with high-water mark**: `lastDiscoveredAt` on sources; incremental scanning (only days since last run + 1 buffer) unless `force=true`.
- **Feed auto-discovery**: `POST /api/sources/resolve-feed` resolves any URL to the best feedable form — Substack profiles, HTML autodiscovery, platform patterns, generic suffix probes.

## Agent change protocol

Before implementing any change to this flow type, the article-ingestion-agent **must** clarify:

- [ ] Does the change add a new state? Update `ArticleStatus` in `src/lib/types.ts`, update the article entity manifest `.c4/entities/article.md`, and update all cells that render article status badges.
- [ ] Does the change add a new transition or modify allowed roles? Update the `FLOW_TYPES` entry in `src/lib/flow.ts` and confirm all cells that render transition actions are updated.
- [ ] Does the change affect the gather action (bulk create)? The gather engine is the only producer of `discovered` instances — any change to the gather action is a contract change with the gather engine cell.
- [ ] Does the change affect the process action? Insight creation is a side effect of the process transition — coordinate with the insight-agent.
- [ ] Does the change make `paywalled` or `failed` non-terminal? This is a significant semantic change — all cells and business logic that treat them as terminal need review.
