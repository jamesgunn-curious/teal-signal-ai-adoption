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
                discovered
                    │
       ┌────────────┼────────────┐
  [Fetch]  [Mark paywalled]  [Mark failed]
       │         │                │
       ▼         ▼                ▼
    fetched   paywalled         failed
       │      (terminal)      (terminal)
  [Process]
       │
       ▼
   processed
       │
   [Archive]
       │
       ▼
    archived
   (terminal)
```

## Transition definitions

| From | To | Allowed roles | Required inputs | Label |
|------|----|---------------|-----------------|-------|
| *(gather action)* | `discovered` | researcher | — | Gather (bulk create) |
| `discovered` | `fetched` | researcher | — | Fetch |
| `discovered` | `paywalled` | researcher | — | Mark as paywalled |
| `discovered` | `failed` | researcher | — | Mark as failed |
| `fetched` | `processed` | researcher | — | Process |
| `fetched` | `paywalled` | researcher | — | Mark as paywalled |
| `fetched` | `failed` | researcher | — | Mark as failed |
| `processed` | `archived` | researcher | — | Archive |

## Validation rules

- `paywalled` and `failed` are terminal — no transition out. A researcher who resolves access creates a new article instance rather than un-terminating the old one.
- `archived` is terminal.
- `processed` → `processed` re-processing is allowed (triggers a new analysis run, appends new insights) — confirmed via BDD D.2.2 with a warning confirmation.
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

- **Batch actions**: "Fetch all discovered", "Process all fetched" — in scope per ADR-001 but not yet specced. Track via 🟠 in `docs/blueprint.md`.
- **Automated retry**: If fetch fails, auto-retry after N minutes. Not in scope for v1 — all retries are user-initiated.
- **Webhook / push ingestion**: Sources push new articles rather than being polled. Architectural extension — see `design/` if pursued.

## Agent change protocol

Before implementing any change to this flow type, the article-ingestion-agent **must** clarify:

- [ ] Does the change add a new state? Update `ArticleStatus` in `src/lib/types.ts`, update the article entity manifest `.c4/entities/article.md`, and update all cells that render article status badges.
- [ ] Does the change add a new transition or modify allowed roles? Update the `FLOW_TYPES` entry in `src/lib/flow.ts` and confirm all cells that render transition actions are updated.
- [ ] Does the change affect the gather action (bulk create)? The gather engine is the only producer of `discovered` instances — any change to the gather action is a contract change with the gather engine cell.
- [ ] Does the change affect the process action? Insight creation is a side effect of the process transition — coordinate with the insight-agent.
- [ ] Does the change make `paywalled` or `failed` non-terminal? This is a significant semantic change — all cells and business logic that treat them as terminal need review.
