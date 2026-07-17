# Batch Operations

```yaml
id: F03
title: Batch operations
status: ready
depends_on: [F01, A03, A04, V02, F05]
priority: P1
normative: true
```

## Goal

Expose transform primitives from `letterform_pass.py` as UI controls, generalized to any glyph or glyph-group selection, with preview-before-apply.

## Primitives (UI ↔ Python)

| Control | Intent |
|---------|--------|
| Enlarge / shrink contour about center | “the Point” / tittle scaling |
| Scale width | Horizontal scale of selected glyphs |
| Shift descender / ascender depth | Vertical extremity nudge |
| Nudge sidebearings | LSB/RSB adjustments |

Implementations call Python ([A04](../architecture/A04-pipeline-inventory.md)); browser does not reimplement fontTools math for commits.

## Selection

- Multi-select from glyph browser (e.g. `a c e s t` for a terminal-angle experiment)
- Named groups optional later; arbitrary selection is required for v1

## Preview before apply

1. User sets parameters
2. `POST /edits/preview-batch` (or equivalent) shows result in preview panel / canvas
3. User confirms → `POST /edits/apply` with `intent: "batch"`

## Warmth warning

If selection size **> 40%** of glyph set, surface the V02 warmth warning (via F05 and/or inline). Advisory — does not block apply.

## Non-goals

- Automatic “smart” language-aware glyph groups beyond selection
- Rewriting letterform_pass in TypeScript

## Acceptance

- [ ] All four primitives available
- [ ] Works on multi-glyph selection
- [ ] Preview-before-apply path exists
- [ ] >40% selection shows warmth advisory
- [ ] Applies only to working copy
