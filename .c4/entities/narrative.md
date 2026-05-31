---
c4_type: entity
entity_id: narrative
agent_id: narrative-agent
name: Narrative
version: 0.1.0
flow: none
---

# Narrative — Entity Manifest

## What this entity type represents

A named research narrative that accumulates evidence (curated insights) across gather cycles. A narrative is a living structure — it evolves, shifts, and can be dormant between active research periods. It never has a single answer; it tracks ongoing interpretation.

Narratives are the layer that turns a flat list of curated insights into tracked research. Each insight can be linked to one or more narratives from the narrative detail page.

## States

```
active ⇄ dormant → closed
active          → closed
```

| State | Meaning |
|-------|---------|
| `active` | Researcher is actively tracking this narrative |
| `dormant` | Not currently active — sleeping but could revive; shown in list but dimmed |
| `closed` | No longer being tracked; hidden from list by default; linked insights are retained |

Note: Status transitions are handled inline in the API route (`PATCH /api/narratives/[id]`). No Teal Flow type is used.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | — |
| `topicId` | string FK | References Topic |
| `title` | string | Short label for the narrative |
| `description` | text | The evolving narrative statement or question |
| `status` | NarrativeStatus | `active \| dormant \| closed` |
| `parentId` | string FK | Set on split/converge — references narratives.id |
| `createdAt` | timestamp | — |
| `updatedAt` | timestamp | — |

## Join: NarrativeInsight

Links curated insights to narratives. An insight can be linked to multiple narratives.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | — |
| `narrativeId` | UUID FK | References Narrative — ON DELETE CASCADE |
| `insightId` | UUID FK | References Insight — ON DELETE CASCADE |
| `note` | text | Optional researcher annotation on the link |
| `addedAt` | timestamp | — |

## Roles

| Role | Permissions |
|------|-------------|
| `researcher` | Create, edit, change status, link/unlink insights |
| `reader` | Read-only (no edit controls shown) |

## Touchpoints

| Cell | Interaction |
|------|-------------|
| Insight entity | NarrativeInsight join — curated insights linked from narrative detail |
| Narratives list page (`/narratives`) | Lists all narratives for a topic; active first, dormant/closed below |
| Narrative detail page (`/narratives/[id]`) | Edit, status transitions, link/unlink evidence |
| Review screen (`/insights`) | Curated insight cards show narrative badge pills |

## Agent change protocol

Before modifying this entity:
1. Read this manifest
2. Read `.c4/entities/insight.md` — insights are linked to narratives via NarrativeInsight
3. Check `src/lib/types.ts` — `NarrativeStatus`, `NarrativeInstance`
4. Check `src/db/schema.ts` — `narratives`, `narrativeInsights` tables
