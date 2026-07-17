# Letterform Pass

```yaml
id: P02
title: letterform_pass.py
status: ready
depends_on: [A04, INPUTS, Q02, V03]
priority: P0
normative: true
```

## Module

Root script: [`letterform_pass.py`](../../letterform_pass.py)

## Purpose

Point-count-preserving transforms used by [F03](../features/F03-batch-operations.md). All edits mutate a `TTFont` in memory; caller saves working copy.

## Primitives

| Operation | Payload keys | Behavior |
|-----------|--------------|----------|
| `contour_scale` | `factor` | Scale outline about centroid (x and y). Used for “the Point” / tittle enlargement. |
| `scale_width` | `factor` | Scale x coordinates about glyph center; scale `hmtx` LSB/advance; scale composite `x` offsets; scale gvar **x** tuple deltas. |
| `shift_vertical` | `delta`, `edge` (`ascender`/`descender`) | Move points at ascender/descender extremes by `delta` on y; mirror in gvar **y** deltas. |
| `sidebearings` | `lsbDelta`, `rsbDelta` | Adjust LSB and advance (RSB via advance change). |

## gvar safety

- Never add/remove points.
- Tuple deltas updated in parallel with glyf coordinate edits for affected glyphs.
- Default axis location for delta edits: `(wght=400, opsz=14, XHGT=100)`.

## Public API

```python
apply_batch(font: TTFont, glyphs: list[str], payload: dict) -> None
contour_scale_glyph(font, glyph, factor)
scale_width_glyph(font, glyph, factor)
shift_vertical_glyph(font, glyph, delta, edge)
nudge_sidebearings_glyph(font, glyph, lsb_delta, rsb_delta)
```

## CLI

```
python letterform_pass.py --font fonts/_working/SebSansVar.ttf --operation scale_width --factor 1.015 --glyphs a c e
```

## Acceptance

- [ ] Point count unchanged per glyph after each primitive
- [ ] `scale_width` adjusts gvar x-deltas when `gvar` present
- [ ] Studio batch panel calls `apply_batch` successfully
- [ ] Default v0.3 reference factors documented in module constants (`WIDTH_FACTOR=1.015`, `POINT_FACTOR=1.06`, `DESCENDER_FACTOR=0.96`)
