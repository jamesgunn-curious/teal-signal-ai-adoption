## ADR-003: Article full text stored as a dedicated text column

**Status:** Accepted
**Date:** 2026-05-26
**Deciders:** James Gunn

### Context

Articles fetched from RSS sources have a body (`full_text`) that is retrieved during the fetch step and passed to the Claude API during the process step. This field is always a string, can be large (multi-thousand word articles), and is distinct in character from the variable content metadata fields (title, tags, perspective, etc.) stored in the JSONB `data` column per ADR-002.

Four options were evaluated:

| Option | Summary |
|--------|---------|
| JSONB (inside `data`) | Consistent with metadata fields; slight overhead for a known string; GIN index for full-text search requires casting |
| Dedicated `text` column | Typed, lean, directly indexable with `tsvector` for full-text search |
| File system (markdown files) | Familiar from existing signal pipeline; breaks single source of truth |
| Re-fetch on demand | No storage; fails for paywalled/deleted articles; network dependency at process time |

### Decision

`full_text` is stored as a dedicated `text` column on the `articles` table, separate from the JSONB `data` field. All other article content metadata fields (title, tags, perspective, executive_summary, etc.) remain in `data` JSONB per ADR-002.

### Alternatives considered

| Option | Reason rejected |
|--------|----------------|
| JSONB | `full_text` is always a string — JSONB type metadata overhead adds no value. Cannot add a `tsvector` GIN index without casting. |
| File system | Breaks single source of truth; requires file I/O alongside DB queries; incompatible with the teal-os cell boundary model. |
| Re-fetch on demand | Paywalled and deleted articles cannot be re-fetched after the initial fetch step. Adds network latency at process time. |

### Consequences

**Positive:** `full_text` can be indexed directly with a GIN `tsvector` index if body search is added later. Clean schema — the typed column signals intent. No type overhead for a large string field.

**Negative/risks:** One exception to the pure JSONB pattern established in ADR-002. Acceptable — the exception is narrow and well-reasoned.

### Spec refs

BDD Section C (Article Fetch), D (Article Processing). Blueprint: Article entity type.
