# Outline Editor

```yaml
id: F02
title: Outline editor
status: ready
depends_on: [F01, A02, A03, Q02, V04]
priority: P1
normative: true
```

## Goal

Canvas view of the selected glyph’s outline at a chosen `wght` / `opsz` instance, with safe point-count-preserving edits by default, live extreme comparisons, undo/redo, and reset-to-Inter.

## Canvas

- Draw outlines from opentype.js and/or `GET /glyphs/{name}/outline`
- Draggable on-curve and off-curve (Bézier handle) points
- Controls for current instance: `wght` 100–900, `opsz` 14–32

## Safe vs advanced edits

| Mode | Allowed | Confirmation |
|------|---------|--------------|
| Default (safe) | Move points, scale about pivot, skew — **point count preserved** | None beyond normal edit |
| Advanced | Add/delete points (or any op that changes point count per master) | Loud warn + explicit confirm; sets `confirmAdvanced: true` ([Q02](../quality/Q02-point-count-policy.md)) |

Default toolset must make safe transforms one-click obvious; advanced mode must not be the default.

## Cross-space comparison

Side-by-side (or multi-pane) compare **before commit**:

- Current edit at selected instance
- Same glyph at `wght` 100 and 900
- Both optical size extremes (`opsz` 14 and 32)

Purpose: see whether the edit holds across the variable space.

## Undo / redo

- Undo/redo for editor session after applied intents ([A03](../architecture/A03-api-contracts.md))
- Reset working glyph to Inter original using cached baseline (`fonts/_baseline/` or equivalent)

## Commit path

Point/transform commits → `POST /edits/apply` on **working copy only**. Save to source is separate ([A02](../architecture/A02-working-copy-safety.md)).

## Non-goals

- Full font editor for TrueType instructions / hinting UI
- Multi-glyph simultaneous outline canvases (batch is F03)

## Acceptance

- [ ] Points drag and commit via API to working copy
- [ ] Safe transforms do not change point count
- [ ] Point-count change blocked without confirmation
- [ ] Extremes + opsz comparison visible before commit
- [ ] Undo/redo works for applied edits
- [ ] Reset-to-Inter available per glyph (blocked-on-assets until Inter baseline cached)
