## ADR-002: Article variable fields stored as JSONB

**Status:** Accepted
**Date:** 2026-05-26
**Deciders:** James Gunn

### Context

Articles have a stable set of core lifecycle fields (id, status, source_slug, topic_id, url, published_date, timestamps) and a variable set of content fields (title, perspective, tier, tags, executive_summary, etc.) that may grow as the system evolves and as new article metadata becomes useful.

The teal-os-framework uses this same pattern for its `entity_instances` table — a typed `status` column and typed lifecycle columns alongside a `data JSONB` column that holds all entity-specific field values.

### Decision

Article content fields (all fields beyond core lifecycle) are stored as JSONB in a `data` column, following the teal-os-framework `entity_instances` pattern. Core lifecycle fields (`id`, `status`, `topic_id`, `source_slug`, `url`, `published_date`, timestamps) are typed columns. This means adding a new article metadata field does not require a DB migration — it is added to the Teal Semantics `EntityTypeConfig` and starts being populated immediately.

Note: this ADR applies to the variable content fields. The `full_text` field is subject to a separate pending decision (🟠 in `docs/blueprint.md`) — it may warrant a dedicated text column or external storage rather than embedding in JSONB, given its size.

### Alternatives considered

| Option | Reason rejected |
|--------|----------------|
| All fields as typed columns | Every new metadata field requires a migration. Premature normalisation for content metadata that will evolve during the SDD iteration loop. |
| External document store (S3, blob storage) | Over-engineered for initial implementation. Can migrate if JSONB proves insufficient. |

### Consequences

**Positive:** Schema flexibility without migrations for content metadata fields. Consistent with the teal-os-framework pattern — no new conventions to learn. Entity type config in Teal Semantics drives the field definitions.

**Negative/risks:** Specific content fields cannot be indexed directly in Postgres without generated columns. Acceptable for initial implementation — add generated columns for frequently filtered fields (e.g. `tags`, `perspective`) if query performance becomes an issue.

### Spec refs

Blueprint: Article entity type. See 🟠 `full_text storage` in `docs/blueprint.md` for the related pending decision that may result in a superseding ADR for that specific field.
