# Frozen DNA

```yaml
id: V03
title: Frozen DNA
status: ready
depends_on: [V01, V02]
priority: P0
normative: true
```

## Intent

Certain letterform choices are **identity**, not experiments. The studio must make them impossible to lose track of, and the export pipeline must keep them wired through GSUB (tabular figures, fractions, superscripts, accents, related substitutions).

## DNA set

| Concept | Description | Notes |
|---------|-------------|--------|
| Spurred **G** | Distinct spurred form | Badge in glyph browser |
| Footed **1** | Footed figure one | Often tied into tabular/figure GSUB |
| Tailed **l** | Tailed lowercase L | Confusable with I / 1 — see V02 |
| Slashed **0** | Slashed zero | Figure / tnum / frac wiring |
| Round quotes / commas | Rounded punctuation feel | Quotes and commas |
| Enlarged tittles (“the Point”) | Larger dots on i/j (and related) | Contour-about-center scale primitive in letterform pass |

Exact glyph names in the font (e.g. `G`, `one`, `l`, `zero`, `i`, `j`, quote glyphs) are read from the font / pipeline config when assets are present. Until then, UI and pipeline use this conceptual set and resolve names via [A04](../architecture/A04-pipeline-inventory.md).

## GSUB expectation

DNA is not just a prettier outline: substitutions and coverage must keep DNA forms present in:

- Tabular figures (`tnum` and related)
- Fractions (`frac`)
- Superscripts / scientific inferiors where applicable
- Accented / composed forms that inherit DNA bases

**Implement by extending** `patch_gsub.py` (see [A04](../architecture/A04-pipeline-inventory.md)) — do not invent a second GSUB rewriter.

## Glyph browser requirement

Per [F01](../features/F01-glyph-browser.md): DNA-carrying glyphs show a small badge so wiring and identity stay visible while browsing.

## Status note

If the DNA glyph name list or patch targets cannot be read from-repo assets, mark integrating criteria `blocked-on-assets` but keep this conceptual list normative.
