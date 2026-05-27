# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What this project is

The first real Teal OS solution — a full-stack Next.js implementation of the Signal AI adoption research pipeline. It replaces the existing Python/flat-file pipeline at `~/projects/signal/topics/ai-adoption/` with an application that uses Teal OS conventions (agent-bounded cells, Teal Semantics, Teal Flow) and is simultaneously the ground-test for Spec-Driven Development (SDD).

**Three-project ecosystem:**

| Project | Role |
|---------|------|
| `~/projects/teal-os-framework` | Concept framework — evolves as patterns are proven here |
| `~/projects/signal` | Existing pipeline — source of seed data and migration reference |
| `~/projects/teal-signal-ai-adoption` ← **here** | First real Teal OS solution + SDD ground-test |

---

## Session logging

The global hooks already fire here (session-start, log-skill, log-check). Follow the same protocol as command-centre:

1. **Find the active log:** read `~/projects/command-centre/ai-log/sessions/.current-wip` — it contains the path to `log.md`.
2. **After every response:** append a summary using the Edit tool:
   ```
   - HH:MM AI: <specific 1-2 sentence summary of what was said or done>
   ```
3. **Use `NOTE:` prefix** for file writes, decisions, directions agreed, and problems resolved:
   ```
   - HH:MM NOTE: Created .c4/entities/article.md with 6 states
   ```
4. **Do not batch** — write as things happen, not at the end.
5. **`close`** → invoke the `close-session` skill (defined in `~/projects/command-centre/plugins/jamesgunn/skills/close-session/SKILL.md`).

Full logging protocol: `~/projects/command-centre/CLAUDE.md`.

---

## Framework enhancement protocol

This build is the primary focus. But when we discover a convention, pattern, or capability that should be generalised back into Teal OS framework, flag it explicitly:

> "Framework note: [what was discovered] — candidate for teal-os-framework"

Then raise it with the user. They decide whether to port it back now or defer. If deferred, log it as a NOTE in the session log so it isn't lost. Do not proactively refactor teal-os-framework mid-build — flag and continue.

---

## Architecture

**Teal Semantics** (`src/lib/semantics.ts`) — entity type registry.
Entity types: `article`, `insight`, `topic`, `source`

**Teal Flow** (`src/lib/flow.ts`) — workflow engine.
Flow types: `article-ingestion`, `insight-curation`

All state transitions are user-initiated via the UI (ADR-001). Server actions do the actual work; a human triggers each step.

Full domain model, entity states, and payload shapes: `docs/blueprint.md`
Cell, entity, and flow manifests: `.c4/`

Reference implementation for patterns and conventions: `~/projects/teal-os-framework`

---

## TypeScript conventions

`strict: true` is required (configured in `tsconfig.json`). TypeScript is the code-level contract layer — it works alongside the manifest system, not instead of it:

| Layer | Contract | When checked |
|-------|----------|-------------|
| `.c4/` manifest | Semantic — what this entity/flow means, owns, connects to | Agent reads before coding |
| TypeScript interface | Structural — what shape data takes at the code boundary | Compile time |
| `validateTransition` | Runtime — is this transition valid for this role/state? | Request time |

A compile error after changing a status type is a machine-generated blast-radius report. Treat it as useful signal, not just noise.

**Conventions for this project:**
- All status types are discriminated unions: `type ArticleStatus = 'discovered' | 'fetched' | ...` — never `string`.
- Types are defined in `src/lib/types.ts` and owned by this project. They are not imported from teal-os-framework. The framework contributes conventions, not a code dependency.
- TypeScript interfaces should reflect the entity manifests in `.c4/entities/`. If they diverge, the manifest is the source of truth.
- Keep types flat and named. Avoid complex generics — types describe shapes, behaviour belongs in flow manifests and the BDD spec.

See ADR-004 for the rationale.

---

## SDD conventions

The spec at `specs/2026-05-26-initial/spec.md` is the living contract. Keep status markers current as implementation progresses:

| Marker | Meaning |
|--------|---------|
| ✅ | Implemented and verified |
| ❌ | Not yet implemented |
| 🟠 | Open decision — must be resolved before implementing |
| ⚠️ | Known issue |
| ⏸ | Deferred to a later spec or phase |

- ADRs in `docs/adr/` are immutable once accepted — create a new superseding ADR rather than editing.
- Structural decisions → blueprint (G1 gate). Behaviour decisions → BDD spec (G2 gate).
- Before implementing a spec section, check for open 🟠 markers — resolve them first.
- Not every change needs all three gates — small isolated changes don't need full `/teal-os-interpret`; known-issue fixes (⚠️) need G3 only. Match gate overhead to the work.
- Before implementing, classify blast radius: **Isolated** (single cell, no contract changes) | **Bounded** (cross-cell, contracts documented) | **Entangled** (undocumented cross-cell deps or touches semantics/flow layer). `/teal-os-interpret` Stage 2 output is the primary signal. Entangled work requires G3 before merge.
- After implementing a phase, run **both** fidelity checks before starting the next phase:
  - `/teal-os-fidelity` — manifest ↔ types.ts ↔ flow.ts alignment (G3 manifest layer)
  - `/spec-fidelity specs/2026-05-26-initial/spec.md` — BDD spec ↔ code alignment (G3 BDD layer)
- **Ready to ship a section when:** all ❌ statements implemented, 🟠 markers resolved, entangled work passed G3, any triggered ADRs captured, ⚠️ issues fixed or explicitly deferred.

Full SDD conventions: `~/projects/command-centre/projects/teal-os-framework/design/sdd-conventions.md`

---

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run db:push      # Push Drizzle schema to Postgres (requires DATABASE_URL in .env.local)
npm run db:seed      # Seed database with ai-adoption topic and sources
npm run db:studio    # Drizzle Studio
```
