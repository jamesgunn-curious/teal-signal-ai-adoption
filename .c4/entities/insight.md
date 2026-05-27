---
c4_type: entity
entity_id: insight
agent_id: insight-agent
name: Insight
version: 0.1.0
flow: insight-curation
---

# Insight — Entity Manifest

## What this entity type represents

A discrete, paragraph-level observation extracted from a processed article by LLM analysis. The unit of curation: a researcher curates or dismisses each insight. Curated insights are what appear in the digest.

An insight captures a single coherent claim about how teams adopt AI or improve their ways of working — one argument or observation, not a sentence-level fragment and not a multi-paragraph essay.

## States

```
extracted → curated   (terminal)
          → dismissed (terminal)
```

| State | Meaning |
|-------|---------|
| `extracted` | Created by analysis engine; awaiting researcher curation |
| `curated` | Researcher has confirmed this insight is worth surfacing in the digest |
| `dismissed` | Researcher has discarded this insight; excluded from digest |

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID |
| `entity_type` | `'insight'` | — |
| `article_id` | string | References Article |
| `status` | InsightStatus | Managed by Teal Flow / insight-curation |
| `text` | text | The insight claim (paragraph-level) |
| `quote` | text | Direct supporting quote from the article |
| `tags` | string[] | From topic tag vocabulary |
| `perspective` | Perspective | Inherited from source; may be overridden — see 🟠 E.2.1 in spec |

## Roles

| Role | Permissions |
|------|------------|
| `researcher` | View all states; curate and dismiss (`extracted` → `curated`/`dismissed`) |
| `reader` | View `curated` only |

## Touchpoints

| Cell | Interaction | Direction |
|------|-------------|-----------|
| Insight Curation Queue | Reads `extracted` insights; surfaces curate/dismiss actions | consumes |
| Insight List | Reads `curated` and `dismissed` insights with filtering | consumes |
| Digest View | Reads `curated` insights grouped by tag/section | consumes |
| Analysis Engine | Creates insight instances during article processing | produces |
| Article entity | Insight is a child of article; article_id is the foreign key | child of |
| Teal Semantics | Entity type config consumed by rendering cells | defines |
| Teal Flow | `insight-curation` flow governs transitions | governed by |

## Agent change protocol

Before implementing any change to this entity type, the insight-agent **must** clarify:

- [ ] Does the change add a new state? Both `curated` and `dismissed` are terminal in the current flow. Adding a non-terminal state (e.g. to allow re-opening a dismissed insight) is a flow type change — coordinate with the flow-agent.
- [ ] Does the change allow editing after extraction? This is a 🟠 open decision in the spec (E.2.1). Do not implement insight editing without resolving it and updating this manifest.
- [ ] Does the change affect which insights appear in the digest? Coordinate with the digest-view-agent — the digest reads directly from `curated` status.
- [ ] Does the change affect the tags field? Tags drive digest section membership. Coordinate with the digest-view-agent and confirm the tag vocabulary is up to date in the topic config.
- [ ] Does the change affect the insight → article relationship? The `article_id` foreign key is the link. Deleting an article should not orphan insights — define cascade behaviour.
