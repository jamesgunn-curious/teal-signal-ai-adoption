# teal-os-interpret

Interpret a feature spec in the context of this project. Run critique, then produce a structured build plan targeting specific cells, entity types, and flow types.

Invoke with: `/teal-os-interpret` or `/teal-os-interpret critique-only` (stops after critique, no build plan).

---

## What you need before starting

1. The spec text — provided by the user in this message, or in a file they point you to
2. Current project state — read the following before critiquing:
   - All `.c4/cells/*.md` — existing cell boundaries and contracts
   - All `.c4/entities/*.md` — existing entity types, fields, states, roles
   - All `.c4/flows/*.md` — existing flow types and transitions
   - `src/lib/types.ts` — WorkflowStatus and UserRole enums

---

## Stage 1 — Critique

Apply the critique checklist to the spec. Produce a numbered finding for each issue raised. Skip items that are clean.

**1. Cell boundary violations** — Does any behaviour ask a cell to do something that belongs to another cell? Flag mismatches against existing cell manifests.

**2. State completeness** — Are all states already declared in Teal Semantics? Flag any new states — they need adding to WorkflowStatus and the relevant entity type's states array.

**3. Role completeness** — Does every actor have a corresponding UserRole? Flag any new actors — they need adding to UserRole and the relevant entity type's roles.

**4. Transition coverage** — For every state change, is there a matching transition in the flow type? Flag missing transitions with from/to states and which role performs them.

**5. Entity type fit** — Does the feature fit an existing entity type, require modifying one, or require a new one? List implied new fields. Name implied new entity types and ask for confirmation.

**6. Flow type fit** — Does the workflow fit `standard-approval`, require modifying it, or need a new flow type? Flag if a new flow type is better than modifying a shared one.

**7. Conflicting behaviours** — Do any Given/When/Then blocks contradict each other or the existing system behaviour?

**8. Dead ends and missing paths** — States with no exit transition? Rejection/error path defined? Path back from any terminal state?

**9. Missing edge cases** — Wrong role? Already in a different state? Two actors act simultaneously? Call out the most significant gaps only.

**10. Multiple valid approaches** — Are there two or more legitimate architectural approaches? Surface them with tradeoffs before any build decision. **This is the most important check** — surfacing approaches early prevents rebuilds.

### Critique output format

```
## Critique — Round 1

### Findings

**[01] [CELL BOUNDARY]** ...description...
> Suggested resolution: ...

**[03] [APPROACH]** Two valid approaches:
> **Option A:** ... Tradeoff: ...
> **Option B:** ... Tradeoff: ...
> Which do you prefer?

### Clean
The following checklist items had no issues: [list them]

### Next step
Respond to each finding above. Once resolved, say "proceed" and I will produce the build plan.
```

Tags: `[CELL BOUNDARY]` `[MISSING STATE]` `[MISSING ROLE]` `[MISSING TRANSITION]` `[ENTITY FIT]` `[FLOW FIT]` `[CONFLICT]` `[DEAD END]` `[EDGE CASE]` `[APPROACH]`

### Iteration protocol

- Default: 1–2 critique rounds before translation
- "Another round" triggers a second pass against user responses
- Translation proceeds when user says "proceed", "looks good", or approves an approach
- Rebuild is acceptable when a prototype reveals UX assumptions not visible in the spec, or when two conflicting approaches were tried and one proved wrong
- After 2 rounds with no resolution, flag unresolved items explicitly and ask whether to proceed with stated assumptions or pause

---

## Stage 2 — Translation

Map the spec to:

1. **Affected cells** — every cell whose manifest or implementation needs to change
2. **Entity type changes** — new fields, states, roles, or a new entity type
3. **Flow type changes** — new transitions, modified validation rules, or a new flow type
4. **New API endpoints** (if any) — method, route, request/response shape
5. **New DB changes** (if any) — new columns, new tables

Then determine the **touchpoint classification** based on the affected cells output:

| Classification | Signal | G3 obligation |
|---|---|---|
| **Isolated** | Single cell, no `.c4/` contract changes | Optional |
| **Bounded** | Cross-cell but contracts already documented in manifests | Advisory |
| **Entangled** | Undocumented cross-cell deps, or touches `teal-semantics`/`teal-flow` | Required before merge |

State the classification explicitly in the build plan.

Then produce the build sequence.

**Build sequence rules:**
- Order by dependency: manifests before code, foundation before surface
- Name the agent responsible: `[agent: cell-agent/{cell-name}]`, `[agent: entity-agent/{entity-name}]`, `[agent: flow-agent/{flow-name}]`, `[agent: api-agent]`, `[agent: database-agent]`
- Each step must reference the manifest the agent should read
- Mark steps that can be done in parallel vs sequentially

**Save the build plan** to `specs/YYYY-MM-DD-{topic}/build-plan.md`. Follow the format in `specs/README.md`. Save the original spec to `specs/YYYY-MM-DD-{topic}/spec.md`. Ask the user to confirm the topic slug before saving.

---

## Stage 3 — Handoff

Output a one-paragraph summary: what the spec adds, how many cells are affected, how many steps in the build sequence, which step to start with.

Then ask: "Ready to start building? I can begin with Step 1."
