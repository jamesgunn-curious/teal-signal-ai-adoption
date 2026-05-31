## ADR-007: Promote `word_count` and `analyse_duration_ms` to dedicated integer columns

**Status:** Accepted
**Date:** 2026-06-01
**Supersedes:** Partial amendment to ADR-002 (JSONB for variable article fields)

---

### Context

ADR-002 established that variable article content fields are stored in the `articles.data` JSONB column. Two fields that were placed there — `wordCount` and `analyseDurationMs` — are numeric metrics rather than variable content:

- `word_count` is computed at gather time and used for display, thin-content filtering, and correlating LLM duration with article size.
- `analyse_duration_ms` is recorded at process time and is the primary metric for LLM timeout calibration.

Both fields are candidates for sorting, filtering, and aggregation (e.g. `ORDER BY word_count`, `AVG(analyse_duration_ms) GROUP BY word_count / 500`). Querying them from JSONB requires casts (`(data->>'wordCount')::int`) and cannot use standard B-tree indexes without expression indexes. At the current scale this is harmless, but it is the wrong default for numeric metrics.

---

### Decision

Promote `word_count` and `analyse_duration_ms` to dedicated nullable integer columns on the `articles` table. Remove both from the `data` JSONB to avoid duplication.

`analyseStartedAt` and `analyseCompletedAt` remain in JSONB — they are reference timestamps, not sort/aggregate targets.

---

### Consequences

- Standard B-tree indexes on both columns are available if needed.
- `ORDER BY`, `AVG`, `GROUP BY` on these fields are clean SQL without casts.
- All four gather/process routes are updated to write to the column instead of the JSONB field.
- `ArticleData` interface loses `wordCount` and `analyseDurationMs`; `ArticleInstance` gains them as top-level nullable integers.
- Existing rows are backfilled via a one-off SQL migration before routes go live.
