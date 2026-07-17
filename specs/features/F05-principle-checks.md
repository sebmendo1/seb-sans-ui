# Principle Checks

```yaml
id: F05
title: Principle checks
status: ready
depends_on: [V02, A03, F02, F03, F04]
priority: P1
normative: true
```

## Goal

Lightweight **advisory** sidebar: flags worth a second look, tied to the three principles. Never blocks Save or Export.

## Checks

### Distinct at 13px

- Render edited glyph at **13px** next to common confusables (e.g. `l` beside `I` and `1`)
- Flag if bounding boxes / advances **converge suspiciously** (threshold tunable; document chosen epsilon in implementation notes)

### Warmth is a detail

- Flag if a batch operation selection touches **>40%** of the glyph set

### Rhythm before letterforms

- Show current advance-width **deltas vs last published version** (release baseline or last tagged export metrics cache)

## Data

Prefer `GET /checks/principles` ([A03](../architecture/A03-api-contracts.md)) so metrics are computed consistently.

## UI

- Sidebar or dedicated checks panel always reachable while editing
- Clear “advisory” labeling so it is not confused with Q01 export gates

## Acceptance

- [ ] All three principle checks implemented as advisories
- [ ] 13px confusable compare visible for glyphs with known confusable sets
- [ ] >40% batch coverage flags warmth
- [ ] Advance deltas vs published baseline visible when baseline exists
- [ ] No check blocks Save/Export
