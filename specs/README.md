# Specs — Master Index

Single source of truth for build status across all specs. Update this table as work completes.

Status: `✅` done · `🟡` in progress · `❌` not started · `⏸` deferred

---

## Specs

| Spec | Topic | Classification | Status | Build plan |
|------|-------|---------------|--------|------------|
| [2026-05-26-initial](2026-05-26-initial/build-plan.md) | Core pipeline — foundation, API, UI cells | Entangled | 🟡 Phases 1–5 done; Step 16 partial, Step 19 outstanding | [build-plan.md](2026-05-26-initial/build-plan.md) |
| [2026-05-27-hypothesis-layer](2026-05-27-hypothesis-layer/build-plan.md) | Narrative layer | Bounded | 🟡 All features built + G3 verified; Step 7 (housekeeping) outstanding | [build-plan.md](2026-05-27-hypothesis-layer/build-plan.md) |
| [2026-05-29-ui-redesign](2026-05-29-ui-redesign/build-plan.md) | UI redesign — top nav, pipeline chrome, status tokens | Bounded | 🟡 Phases 1–4 done; Phase 5 (bulk select) + Phase 6 (article detail) outstanding | [build-plan.md](2026-05-29-ui-redesign/build-plan.md) |
| [2026-05-31-pipeline-consolidation](2026-05-31-pipeline-consolidation/spec.md) | Pipeline screen consolidation + sequential analyse | Bounded | ✅ All phases complete | [spec.md](2026-05-31-pipeline-consolidation/spec.md) (no separate build plan) |

---

## Outstanding work

Listed in priority order. Framework/horizon items are at the bottom.

### Must-do before shipping

| # | Item | Spec | Effort | File to update |
|---|------|------|--------|----------------|
| R1 | Phase 5 — Bulk selection + contextual action bar | ui-redesign | Medium | `src/components/pipeline/article-queue.tsx` |
| R2 | Phase 6 — Article detail screen | ui-redesign | Medium | `src/app/articles/[id]/page.tsx` (new) |
| R3 | Step 19 — Re-process confirmation dialog | initial | Small | `src/app/articles/article-actions.tsx` |
| R4 | Step 7 — Add Narrative row to `.c4/README.md` entity index | hypothesis-layer | Trivial | `.c4/README.md` |

### Deferred / framework horizon

| # | Item | Spec | Notes |
|---|------|------|-------|
| H1 | Design tokens → teal-os-framework | initial Step 21 | Parked — extract after this project ships |
| H2 | Real agentic builds (multi-agent cell routing) | initial Step 20 | Framework experiment — Step 19 or 22 as guinea pig |
| H3 | Individual article bulk selection was Step 16 partial | initial Step 16 | Superseded by R1 (Phase 5) — same feature, better plan |

---

## Build order for remaining work

```
R4 (trivial, do first)
R3 (small, isolated)
R1 → R2 (can be done in parallel — independent components)
```

G3 fidelity check after R1 + R2 complete, then the app is shippable.

---

## Format for build plans

Each spec directory should contain:
- `spec.md` — BDD spec with status markers (✅ ❌ 🟠 ⚠️ ⏸)
- `build-plan.md` — sequenced steps with agent assignments and status
