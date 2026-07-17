# Priorities

```yaml
id: V04
title: Priorities
status: ready
depends_on: [V01]
priority: P0
normative: true
```

## Ordered priorities

1. **Never corrupt the font** — working copy, history, point-count policy, gated export.
2. **Fast iteration loop** — live preview from working font, quick transforms, low-friction Save.
3. **Polish** — UI refinement, niceties. Last.

## Priority tags on specs

| Tag | Meaning |
|-----|---------|
| P0 | Safety / correctness — required for any font write or export |
| P1 | Core iteration loop — browser, editor, preview, batch |
| P2 | Polish — visual refinements that do not change contracts |

## Conflict resolution

| Conflict | Resolution |
|----------|------------|
| Beautiful UI vs. safe Save/history | Ship safety; defer polish |
| Faster edit vs. point-count / gvar integrity | Block or confirm advanced mode ([Q02](../quality/Q02-point-count-policy.md)) |
| Ship zip vs. failing fontbakery/HarfBuzz | **No zip** ([Q01](../quality/Q01-export-gates.md)) |
| Principle advisory vs. Export | Advisory never blocks Export; Q01 does |

## Agent rule

When unsure whether to implement a convenience: if it can mutate the binary, treat it as P0 and route through [A02](../architecture/A02-working-copy-safety.md) + [A03](../architecture/A03-api-contracts.md).
