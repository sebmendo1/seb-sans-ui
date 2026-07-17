# Live Text Preview

```yaml
id: F04
title: Live text preview
status: ready
depends_on: [A01, A02, A03, V02]
priority: P1
normative: true
```

## Goal

Persistent panel (specimen playground style): editable heading and body, typographic controls, OpenType feature toggles — always rendered from the **in-progress working font**, not a shipped cut.

## Controls

| Control | Range / values |
|---------|----------------|
| Heading text | Editable string |
| Body text | Editable string |
| Size | px |
| Weight (`wght`) | 100–900 |
| Optical size (`opsz`) | 14–32 |
| Tracking | designer-useful range |
| Leading | designer-useful range |

## OpenType features (toggles)

- `tnum`
- `ss01`
- `cv11`
- `cv06`
- `case`
- `frac`

Load font via `@font-face` from working bytes (`GET /font/working`) with cache-bust on each successful edit/save as needed.

## Icons

Optional strip to preview Seb Icons alongside text (24px grid companion set). **No icon editing.**

## Principles chrome

This panel coexists with persistent principles UI ([V02](../vision/V02-design-principles.md)).

## Non-goals

- Full layout typesetting (columns, grids)
- HarfBuzz shaping fidelity in-browser beyond what CSS/OT features provide (gate shaping is server-side in Q01)

## Acceptance

- [ ] Heading + body editable
- [ ] wght/opsz/tracking/leading controls affect preview
- [ ] Feature toggles listed above work when font supports them
- [ ] Preview uses working font bytes, refreshing after edits
- [ ] Icon preview possible when `icons/` present
