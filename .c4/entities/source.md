---
c4_type: entity
entity_id: source
agent_id: source-agent
name: Source
version: 0.1.0
flow: none
---

# Source — Entity Manifest

## What this entity type represents

An RSS/Atom feed registered against a topic. Sources are the input boundary of the system — the gather engine reads active sources to discover new articles. Each source has a perspective and tier that are inherited by the articles it produces.

Sources are configuration entities. State transitions (active/paused/removed) are managed directly by the topic-agent without a Teal Flow type.

## States

| State | Meaning |
|-------|---------|
| `active` | Included in gather runs |
| `paused` | Excluded from gather runs; existing articles retained |
| `removed` | Permanently excluded; existing articles retained; not shown in active source list |

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Slug, e.g. `lennys-newsletter` |
| `topic_id` | string | References Topic |
| `name` | string | Display name |
| `slug` | string | Used as source identifier in article IDs and data |
| `feed_url` | string | RSS/Atom feed URL |
| `perspective` | Perspective | practitioner, leadership, product, research, editorial |
| `tier` | '1' \| '2' | Content quality tier (1 = primary, 2 = supplementary) |
| `access_type` | enum | `free` or `free+paid` |
| `status` | SourceStatus | `active`, `paused`, or `removed` |
| `created_at` | timestamp | — |
| `updated_at` | timestamp | — |

## Roles

| Role | Permissions |
|------|------------|
| `researcher` | Create, view, update (pause/resume/remove) |
| `reader` | View (in digest context — source attribution) |

## Touchpoints

| Cell | Interaction | Direction |
|------|-------------|-----------|
| Topic Manager | Creates and manages sources; displays source health | consumes + produces |
| Gather Engine | Reads `active` sources to discover articles; uses `feed_url` and `slug` | consumed by |
| Article entity | Articles reference `source_slug`; inherit `perspective` and `tier` from source config | parent of (via slug) |
| Digest View | Source metadata used for article attribution and source filtering | consumed by |

## Seed data — ai-adoption sources

| Name | Slug | Perspective | Tier | Access |
|------|------|------------|------|--------|
| Lenny's Newsletter | `lennys-newsletter` | product | 1 | free+paid |
| The Pragmatic Engineer | `pragmatic-engineer` | practitioner | 1 | free+paid |
| Engineering Leadership | `engineering-leadership` | leadership | 1 | free |
| The Beautiful Mess | `the-beautiful-mess` | practitioner | 2 | free |
| Dev Interrupted | `dev-interrupted` | editorial | 2 | free |
| The Engineering Manager | `the-engineering-manager` | leadership | 2 | free |
| One Useful Thing | `one-useful-thing` | research | 2 | free |
| LeadDev | `leaddev` | editorial | 2 | free |
| Martin Fowler / Birgitta Böckeler | `martinfowler` | research | 1 | free |

Feed URLs: see `~/projects/signal/topics/ai-adoption/config.md`

## Agent change protocol

Before implementing any change to this entity type, the source-agent **must** clarify:

- [ ] Does the change affect `slug`? The slug is used in article IDs and article `source_slug` — changing it orphans existing articles. Treat slug as immutable after creation.
- [ ] Does the change affect `perspective` or `tier`? These are inherited by articles at discover time. Changing them on an existing source does not retroactively update already-discovered articles — define whether retroactive update is required.
- [ ] Does the change pause or remove a source? Confirm with the researcher that in-progress articles from that source should not be abandoned mid-workflow.
- [ ] Does the change add a source type beyond RSS/Atom (e.g. manual input, webhook)? This is an architectural extension — it affects the gather engine. Raise it as a design decision before implementing.
