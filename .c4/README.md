# .c4 — Agent Context Directory

Read this first. This folder contains everything an agent needs to understand the architecture, make changes safely, and find deferred design decisions.

> **On agent IDs:** Each manifest declares an `agent_id`. These are specifications of intent — the bounded context each agent *would* own if sub-agent routing were wired up. Right now, a single Claude session acts as the agent for whichever manifest it's asked to work on. The discipline (read your manifest, read your touchpoints, follow the change protocol) applies regardless.

## Folder structure

```
.c4/
  cells/       ← Cell manifests — one per agent-bounded functional area (C4 L3)
  entities/    ← Entity type manifests — one per entity type within Teal Semantics
  flows/       ← Flow type manifests — one per workflow definition within Teal Flow
  design/      ← Deferred design decisions not yet implemented
  workspace.dsl ← Full C4 L1/L2/L3 in Structurizr DSL (to be added)
```

## Before making any change

1. Read your own manifest (cell, entity, or flow)
2. Read the manifests of every cell listed in your touchpoints
3. Check `design/` for any deferred decisions relevant to your area
4. Check `docs/blueprint.md` for open 🟠 decisions that may affect your cell

## design/ index

| File | Relevant to | What it contains |
|------|-------------|-----------------|
| `design/insight-editing-extension.md` | insight entity, insight-curation flow, curation queue cell | Three options for adding post-extraction insight editing (field mutation, self-transition, draft state). Deferred from v1. Includes teal-os-framework implications. |
| `design/hypothesis-management-extension.md` | topic entity, topic manager cell, digest view cell | Two options for hypothesis tracking (field on topic vs new entity type). Deferred from v1. Includes pattern for "evidence entities" in teal-os. |

## Entity types

| Entity type | Manifest | Flow |
|-------------|----------|------|
| Article   | `.c4/entities/article.md`   | article-ingestion |
| Insight   | `.c4/entities/insight.md`   | insight-curation  |
| Narrative | `.c4/entities/narrative.md` | (inline — no Teal Flow type; dormant transition has pause/fold/split options) |
| Topic     | `.c4/entities/topic.md`     | (no workflow)     |
| Source    | `.c4/entities/source.md`    | (no workflow)     |

## Flow types

| Flow | Manifest | Used by |
|------|----------|---------|
| article-ingestion | `.c4/flows/article-ingestion.md` | Article |
| insight-curation | `.c4/flows/insight-curation.md` | Insight |

## Vocabulary

| Term | Meaning |
|------|---------|
| Cell | C4 L3 agent-bounded unit. One orchestrating agent. |
| Entity Type | Named semantic object in Teal Semantics. Has own agent and manifest. |
| Flow Type | Named workflow definition in Teal Flow. Has own agent and manifest. |
| Component | Shared UI building block. No agent ownership. |
| Contract | Interface a cell exposes to adjacent cells. |
| Touchpoint | Documented interaction point between two cells. |

## Reference

- Teal OS reference implementation: `~/projects/teal-os-framework`
- Blueprint (domain model, entity states, payload shapes): `docs/blueprint.md`
- BDD spec: `specs/2026-05-26-initial/spec.md`
- ADRs: `docs/adr/`
