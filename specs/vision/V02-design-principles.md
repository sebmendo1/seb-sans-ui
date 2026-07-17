# Design Principles

```yaml
id: V02
title: Design principles
status: ready
depends_on: [V01]
priority: P0
normative: true
```

These three principles are the **actual spec** the studio exists to serve. They must remain visible in persistent UI chrome (thin footer or sidebar) at all times while working.

## 1. Distinct at 13px

Seb Sans must stay differentiable at small sizes — especially against common confusables (e.g. `l` vs `I` vs `1`).

**Studio implication:** [F05](../features/F05-principle-checks.md) renders the edited glyph at 13px next to confusables and flags suspicious width/bbox convergence. Advisory, not blocking.

## 2. Warmth is a detail, not a wobble

Personality lives in precise details (terminals, tittles, spurred forms), not in global structural deformation of the whole glyph set.

**Studio implication:** batch operations that touch **>40%** of the glyph set at once trigger a warmth warning ([F03](../features/F03-batch-operations.md), [F05](../features/F05-principle-checks.md)). Advisory, not blocking.

## 3. Rhythm before letterforms

Spacing and advance rhythm matter more than ornamental outline tweaks. Drift vs the last published cut must be visible.

**Studio implication:** [F05](../features/F05-principle-checks.md) shows advance-width deltas vs last published version. Advisory, not blocking.

## UI placement requirement

| Requirement | Detail |
|-------------|--------|
| Always visible | Principles appear in a persistent footer or sidebar while any studio tab is open |
| Copy | Short labels matching the three names above; optional one-line gloss |
| Does not block | Principles panel never prevents Save or Export; only [Q01](../quality/Q01-export-gates.md) blocks Export zip |

## Related

- Frozen DNA (the details that embody warmth): [V03](V03-frozen-dna.md)
- Priority order when principles conflict with speed: [V04](V04-priorities.md)
