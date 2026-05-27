## ADR-004: TypeScript strict mode, types owned per implementation

**Status:** Accepted
**Date:** 2026-05-26
**Deciders:** James Gunn

### Context

The teal-os-framework reference implementation already uses TypeScript with `strict: true`. The question for this implementation — and for teal-os implementations in general — is twofold:

1. **How strictly should TypeScript be used?** Permissive (types at boundaries, `any` internally) or strict throughout?
2. **Should implementations share TypeScript types via a shared package?** Or does each implementation define its own?

A related question was raised: does strict TypeScript help or hinder AI-assisted development?

### Decision

**Strict TypeScript throughout.** `strict: true` is set in `tsconfig.json` and must not be weakened. All status types are discriminated unions (`type ArticleStatus = 'discovered' | 'fetched' | ...`), never `string`. Types are flat and named — no complex generics or business logic encoded in the type system.

**Types are owned per implementation, not shared.** Each teal-os implementation defines its own `src/lib/types.ts`. There is no shared teal-os types package. The teal-os-framework contributes conventions and patterns, not a code dependency.

### Why strict TypeScript helps AI-assisted development

The SDD approach uses three human control points (G1 blueprint gate, G2 spec readiness gate, G3 fidelity gate). TypeScript strict mode adds a fourth, automated one: the compiler.

When an agent changes a `WorkflowStatus` value or an entity field, the TypeScript compiler immediately surfaces every call site that breaks. This is machine-generated blast-radius analysis — equivalent to what `spec-touchpoints` does manually, but for structural changes. A failing build is a signal that something needs deliberate review before proceeding.

Strict TypeScript also reduces ambiguity in AI code generation. An agent reading `interface ArticleInstance` knows exactly what shape to produce without needing to infer it from usage. Types are contracts the agent must satisfy — which is the same role manifests play at a higher level.

### Why types are not shared via a package

The reusable element of teal-os is:
- The **concepts**: entities/semantics, flows, cells, manifests
- The **AI process**: spec → critique → build plan → verify, with human control points

The code in each implementation is an artefact of applying those concepts — not the framework itself. A shared types package would create a version dependency between implementations, making teal-os behave like a traditional shared library. Each implementation would be constrained by the shared package's evolution.

Instead, each implementation defines types that match its own entity manifests. The conventions (discriminated unions, flat interfaces, alignment with manifests) are what is shared — not the code. Implementations can evolve independently.

### Consequences

**Positive:** Compiler as automated control point. Clear structural contracts at cell boundaries. Implementations are autonomous — no version coupling to a shared package. Types and manifests stay in sync within each project.

**Negative/risks:** Each new implementation must define its own types from scratch (following the conventions). This is intentional — the types should reflect the implementation's specific entities, not a generic abstraction. The cost is low; the benefit is independence.

### Spec refs

Blueprint: Key payload shapes section. CLAUDE.md: TypeScript conventions section.
