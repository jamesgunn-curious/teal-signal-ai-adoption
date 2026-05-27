---
c4_type: entity
entity_id: topic
agent_id: topic-agent
name: Topic
version: 0.1.0
flow: none
---

# Topic — Entity Manifest

## What this entity type represents

A research focus area. Defines the scope of a digest: its active sources, tag vocabulary, digest section definitions, and research hypotheses. Topics are the top-level organising unit — articles and insights are scoped to a topic.

Topics are configuration entities. They do not participate in a complex workflow — a researcher creates them, manages their sources, and can archive them.

## States

| State | Meaning |
|-------|---------|
| `active` | Topic is in use; gather runs are available; sources are included |
| `archived` | Topic is no longer active; all sources are paused; historical data is preserved |

No Teal Flow type — state transitions are simple and handled directly by the topic-agent without a shared flow definition.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Slug, e.g. `ai-adoption` |
| `name` | string | Display name |
| `description` | text | Research purpose and focus |
| `lookback_days` | number | Default RSS lookback window for gather runs |
| `hypotheses` | text[] | Active research threads — see 🟠 A.1.3 in spec |
| `tag_vocabulary` | object | Tag ID → label, group, colour — per topic |
| `digest_sections` | object | Section name → tag IDs — drives digest grouping |
| `status` | TopicStatus | `active` or `archived` |
| `created_at` | timestamp | — |
| `updated_at` | timestamp | — |

## Roles

| Role | Permissions |
|------|------------|
| `researcher` | Create, view, update, archive |
| `reader` | View `active` topics only (in digest context) |

## Touchpoints

| Cell | Interaction | Direction |
|------|-------------|-----------|
| Topic Manager | Creates and manages topics; surfaces topic health summary | consumes + produces |
| Source entity | Sources are scoped to a topic (topic_id FK) | parent of |
| Article entity | Articles are scoped to a topic (topic_id FK) | parent of |
| Digest View | Reads topic config to determine digest sections and tag vocabulary | consumed by |
| Gather Engine | Reads topic sources list; scopes gather run to topic | consumed by |
| Navigation | Lists active topics for navigation | consumed by |

## Seed data — ai-adoption

The initial topic to seed is `ai-adoption`, derived from `~/projects/signal/topics/ai-adoption/config.md`. Key values:
- 9 sources, tier 1 and 2 (see blueprint for full list)
- 22 tags across 5 groups (see blueprint for full vocabulary)
- 5 digest sections
- lookback_days: 14 (initial_lookback_days: 140 for first run)

## Agent change protocol

Before implementing any change to this entity type, the topic-agent **must** clarify:

- [ ] Does the change affect `tag_vocabulary` or `digest_sections`? These fields drive insight tagging and digest grouping — changing them mid-stream affects all existing insights. Define a migration strategy before changing.
- [ ] Does the change affect the topic → source or topic → article relationships? Archiving a topic should cascade to sources (pause them) but not delete articles. Define cascade behaviour.
- [ ] Does multi-topic UI need to be enabled? The 🟠 multi-topic decision in `docs/blueprint.md` must be resolved before building any cell that lists or switches between topics.
- [ ] Does the change affect `lookback_days`? This config is read by the gather engine at run time — changing it affects the next gather run, not historical data.
