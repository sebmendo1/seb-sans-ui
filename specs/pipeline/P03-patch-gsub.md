# GSUB Patch

```yaml
id: P03
title: patch_gsub.py
status: ready
depends_on: [A04, INPUTS, V03]
priority: P0
normative: true
```

## Module

Root script: [`patch_gsub.py`](../../patch_gsub.py)

## Purpose

After outline edits, re-wire **frozen DNA** and **ss03** glyph forms through all relevant `GSUB` single-substitution lookups so tabular figures, fractions, superscripts, and accents keep shaper-safe mappings ([V03](../vision/V03-frozen-dna.md)).

## DNA pairs

| Base | DNA suffix | Examples |
|------|------------|----------|
| `zero` | `.slash` | `zero.slash`, `zero.numr.slash` |
| `one` | `.ss01` | `one.ss01`, `one.tf.ss01` |
| `l` | `.ss02` | `l.ss02`, `lacute.ss02` |
| `G` | `.1` | `G.1`, `Gbreve.1` |

## ss03 punctuation

Glyphs whose names start with `comma`, `quote`, or equal `period` receive parallel `.ss03` targets in fraction/numerator/denominator contexts (e.g. `comma.numr` → `comma.numr.ss03`).

## Algorithm

1. For every GSUB LookupType 1 subtable, walk `mapping`.
2. For each `src → dst`, mirror DNA suffix rules: if `src` uses base form, ensure `src+DNA → dst+DNA` when both glyphs exist.
3. Apply ss03 mirroring for punctuation chains in numr/dnom/frac-related lookups.
4. Rebuild each subtable `Coverage` sorted by glyph ID (shaper-safe).
5. Do not duplicate existing mappings.

## Public API

```python
patch_gsub(font: TTFont) -> int  # returns count of mappings added
sort_gsub_coverage(font: TTFont) -> None
```

## CLI

```
python patch_gsub.py [--font fonts/_working/SebSansVar.ttf] [--in-place]
```

## Acceptance

- [ ] Idempotent: second run adds zero new mappings on unchanged font
- [ ] `tnum` lookup maps `zero.slash → zero.tf.slash` when `zero → zero.tf` exists
- [ ] Coverage tables sorted by glyph ID after patch
- [ ] Export pipeline invokes before static instancing ([F06](../features/F06-export-pipeline.md))
