## ADR-005: UI direction — dark-base theme, texture-layered status tokens, wireframe as reference

**Status:** Accepted
**Date:** 2026-05-29
**Deciders:** James Gunn

---

### Context

The initial implementation established a dark terminal-green aesthetic (`#0a0a0a` / `#00e05a`) and a flat nav structure (Dashboard · Articles · Insights · Digest). A wireframe prototype was produced in Claude Artifacts exploring a richer UI: grouped nav (A / Workflow / Output), per-screen header chrome with contextual stats, dedicated Gather screen, bulk selection + action bar, brand cluster, and an alternate warm-paper aesthetic.

Two decisions needed to be made:

1. **Which visual theme to carry forward** — dark terminal-green vs warm paper; and how to handle status differentiation within that theme, given we have 14 distinct status values across four entity types.
2. **Which structural patterns from the wireframe to adopt.**

---

### Decisions

#### 1. Dark-as-base, light theme deferred

Dark terminal-green (#0a0a0a / #00e05a) is the base theme. A light theme option is explicitly in scope for a later phase — the token system below is designed to support it. No implementation work on light theme until dark is complete.

#### 2. Status tokens: colour + texture as a semantic system

With 14 distinct status values in a dark palette, colour hue alone is insufficient for differentiation. A two-channel system is adopted:

- **Channel 1 — colour:** maintains the existing hue assignments (blue → discovered, amber → fetched, green → processed, etc.)
- **Channel 2 — texture:** CSS `repeating-linear-gradient` patterns convey semantic meaning independent of colour

**Texture semantics:**

| Semantic meaning | Texture | States |
|---|---|---|
| Complete / active | Solid (no texture) | `processed`, `curated`, `active` (sources), `active` (topics) |
| Incoming / waiting | Sparse dot grid | `discovered`, `extracted` |
| In progress | Single diagonal stripe | `fetched` |
| Blocked | Cross-hatch | `paywalled` |
| Error | Tight diagonal | `failed` |
| Dormant | Very fine dot noise | `archived`, `dismissed`, `removed` |

Textures are implemented as CSS custom properties (`--status-{name}-texture`) on a `StatusToken` component. Redefining the properties under a `[data-theme="light"]` selector is sufficient to port the system to a light theme.

**Portability:** All status visual treatment lives in `src/lib/status-tokens.ts` (token definitions) and `src/app/globals.css` (CSS custom properties). No inline Tailwind colour classes for status — always use the token classes.

#### 3. Wireframe as authoritative UI reference

The wireframe at `.c4/design/Signal-Digest-Wireframe.html` is the authoritative design reference for all UI work until superseded. When a screen is built, the wireframe screen is the first point of comparison.

**Adopted from wireframe:** grouped nav (A / Workflow / Output), per-screen header chrome, dedicated Gather screen, bulk selection + contextual action bar, brand cluster (logo + topic slug + role toggle).

**Not adopted:** warm-paper theme (dark-base confirmed above); handwritten Caveat/Architects Daughter fonts (dark theme doesn't suit them); tweaks panel (prototype-only affordance).

---

### Alternatives considered

| Option | Reason not chosen |
|---|---|
| Keep flat nav (Dashboard · Articles · Insights · Digest) | Doesn't surface the workflow shape. Gather is buried as a button. No grouping signal for researcher vs reader mode. |
| Warm paper as primary theme | Dark theme is already implemented and suits the research-tool character of the product. Light theme preserved as future option. |
| Colour-only status differentiation | 14 states × dark backgrounds = too many similar-looking chips. Texture adds a second semantic channel that also improves accessibility. |
| Status tokens as Tailwind utility combos | Scatters status logic across components. A central token system is required for theme-portability. |

---

### Consequences

**Positive:**
- Status chips are distinguishable without relying on colour alone (accessibility win)
- Token system enables light theme as a config swap, not a rewrite
- Wireframe gives clear screen-by-screen implementation targets
- Grouped nav exposes the pipeline mental model to the researcher

**Negative / risks:**
- CSS texture approach adds a layer of custom CSS that Tailwind can't encapsulate — manageable if kept in `globals.css`
- Wireframe is a prototype, not a pixel-perfect spec — some screens will need interpretation during implementation

### Spec refs

- `specs/2026-05-29-ui-redesign/spec.md`
- `.c4/design/Signal-Digest-Wireframe.html`
