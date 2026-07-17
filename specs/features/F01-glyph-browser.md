# Glyph Browser

```yaml
id: F01
title: Glyph browser
status: ready
depends_on: [V01, V03, A01, A03]
priority: P1
normative: true
```

## Goal

Grid of every glyph in the font, grouped like the existing HTML specimen character-set logic. Click opens the outline editor ([F02](F02-outline-editor.md)). DNA glyphs show a badge ([V03](../vision/V03-frozen-dna.md)).

## Character-set groups

| Group | Contents |
|-------|----------|
| `caps` | A–Z and related uppercase |
| `lowercase` | a–z and related lowercase |
| `figures` | 0–9 and figure variants |
| `punctuation` | Punctuation including quotes/commas |
| `accents` | Accented / diacritic-bearing glyphs |
| `math_arrows` | Math symbols and arrows |
| `other` | Remainder |

When the specimen HTML exists, **reuse its groupings** rather than inventing a new taxonomy. Until then, this table is normative.

## UI requirements

- Show glyph cell: rendered shape (working font), name, optional unicode
- DNA badge when `dna: true` from `GET /glyphs`
- Filter or section headers by group
- Click → navigate/select for F02
- Multi-select (for F03 batch) should be supported without blocking single-click edit

## Non-goals

- Outline editing inside the grid
- Icon set as glyphs (icons preview belongs in F04)

## Acceptance

- [ ] All cmap/glyph catalog entries appear in some group
- [ ] DNA glyphs visually badged
- [ ] Click opens editor for that glyph
- [ ] Data comes from working font via API ([A03](../architecture/A03-api-contracts.md))
