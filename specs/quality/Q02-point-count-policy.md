# Point Count Policy

```yaml
id: Q02
title: Point count policy
status: ready
depends_on: [F02, A02, A03, V04]
priority: P0
normative: true
```

## Why

Changing point counts on one master without re-syncing breaks **gvar** interpolation across the variable font’s other masters. Corruption risk outranks iteration speed ([V04](../vision/V04-priorities.md)).

## Policy

1. Default tools are **point-count-preserving** (move, scale about pivot, skew).
2. Add/delete points (or any op that changes point count per master) is **advanced mode**.
3. Advanced mode requires a **loud warning** and explicit confirmation stating that masters will need re-sync.
4. API rejects such edits without `confirmAdvanced: true` (`POINT_COUNT_CHANGE_REQUIRES_CONFIRM`).

## Warning copy (normative meaning)

Must communicate: this may break interpolation across masters; you will need to re-sync other masters; proceed only if intentional.

## Acceptance

- [ ] Safe tools never change point count
- [ ] Advanced path requires confirm in UI and API
- [ ] Unconfirmed advanced intents rejected
