# Font File Format & Text Shaping

Read this before writing code that parses, builds, or debugs font binaries
(fontTools scripts, GSUB/GPOS patches, variable font instancing), or before
explaining to someone why a font is rendering a particular way.

## Format history, briefly

- **PostScript Type 1** (Adobe, 1984) — cubic Béziers, 256-glyph limit per
  file, required two separate files. Print-era professional standard.
- **TrueType** (Apple, late 1980s) — quadratic Béziers (3 control points
  vs. 4 for cubic — simpler math, needs more points for equivalent shapes).
  Introduced built-in hinting as bytecode. Adopted by Microsoft for
  Windows; became ubiquitous.
- **OpenType** (Microsoft + Adobe, late 1990s) — unified container that
  can hold *either* TrueType or PostScript-style (CFF) outlines. Supports
  up to 65,536 glyphs (full Unicode coverage across many languages) and
  added the layout tables (GSUB, GPOS) that enable ligatures, small caps,
  stylistic alternates, and contextual substitution — all embedded in the
  file itself.
- **Variable fonts** (OpenType 1.8, 2016) — one file, one or more
  interpolatable axes (weight, width, slant, optical size, or custom),
  replacing the need to ship separate static files per style.

## The table map

A font file is a structured database of tables. Only one holds the glyph
outlines; the rest make those outlines render correctly.

| Table | Flavor | Holds |
|---|---|---|
| `glyf` + `loca` | TrueType (.ttf) | Glyph outlines as quadratic Bézier point sequences (`glyf`); byte offsets locating each glyph within `glyf` (`loca`) |
| `CFF` / `CFF2` | OpenType (.otf) | Glyph outlines as relative drawing operators (`rmoveto`, `rlineto`, `rrcurveto` — conceptually close to SVG path data). `CFF2` adds per-master offset tables for variable fonts. |
| `gvar` | TrueType variable fonts | Per-master coordinate *deltas* on top of the base master's `glyf` outline — this is what makes editing a variable font's points risky: every master needs matching point count/order or interpolation breaks |
| `cmap` | Both | Maps Unicode code points → the font's internal glyph IDs. This is the very first lookup in text shaping. |
| `head` | Both | Global metadata: version, bounding box, and critically, **Units Per Em (UPM)** — typically 1000 for CFF, 1024 (or 2048) for TrueType. Sets the coordinate scale everything else is drawn in. |
| `hhea` (+ `vhea`) | Both | Global horizontal metrics header: max ascender/descender, recommended leading, and Max Advance Width (widest glyph in the file). `vhea` is the optional vertical-text equivalent. |
| `hmtx` (+ `vmtx`) | Both | Per-glyph spacing: Advance Width, Left Sidebearing, Right Sidebearing (RSB is usually derived from width − LSB). |
| `maxp` | Both | Memory requirements for the font (used by renderers to allocate buffers). |
| `name` | Both | Textual metadata: family name, subfamily, copyright, license, version strings — this is what `fontTools`'s `name` table API edits (see Seb Sans's `rename()` function in `build_sebsans.py` for a working example). |
| `OS/2` | Both | Cross-platform rendering metrics: weight/width class, family style (serif/sans/script/mono), x-height, cap height, and platform-specific clipping-boundary metrics that keep Windows/macOS/web rendering consistent with each other. Also duplicates some `cmap` info for legacy reasons. |
| `GSUB` | Both | Glyph *substitution* rules: ligatures, stylistic alternates, contextual swaps (this is the table Seb Sans's `patch_gsub.py` extends so frozen DNA glyphs stay wired into tabular figures/fractions/superscripts). |
| `GPOS` | Both | Glyph *positioning* rules: kerning pairs and other position adjustments, checked during shaping after substitution. |
| `fpgm` / `prep` / `cvt` | TrueType | Hinting bytecode: `fpgm` (function definitions), `prep` (pre-program run once per size), `cvt` (control value table — shared reference values hinting instructions read). |

## The text-shaping pipeline

Four steps, run per **text run** (a maximal segment of text sharing font,
size, color, and language — a language or style change starts a new run,
and *runs never interact across their own boundary*: no kerning between a
Greek letter in one run and a Latin letter in the next).

1. **cmap lookup** — Unicode code point (e.g. `U+0041` for "A") → the
   font's internal Glyph ID. Nothing visual has happened yet — this is
   just an index lookup.
2. **GSUB substitution** — checks whether that glyph ID (or a sequence of
   them) needs replacing based on context — e.g. "f" + "i" adjacent →
   substituted for the single merged "fi" ligature glyph. Stylistic
   alternates, tabular-figure swaps, and contextual forms all resolve here.
3. **GPOS positioning** — applies position/kerning adjustments for
   specific pairs or classes — e.g. capital T next to lowercase o slides
   the o left to tuck under the T's crossbar. Still working with abstract
   glyph boxes at this point, not pixels.
4. **Render** — finally fetches each glyph ID's actual outline data and
   draws it at the resolved scale and position, respecting that glyph's
   own sidebearings.

With a **variable font**, the axis position (weight/width/opsz/etc.) is
resolved *before* step 1 — the interpolated instance is effectively
selected as "the font" for that run before any shaping happens.

**Useful analogy**: this pipeline maps onto browser rendering almost
exactly. Unicode text ≈ raw HTML. Font/color selection ≈ CSS. The 4-step
shaping process ≈ the browser building layout boxes and painting them.

## Practical debugging implications

- If tabular figures render at inconsistent widths, or a frozen/aliased
  glyph doesn't pick up a feature that its un-aliased sibling has — the
  bug is almost always an incomplete **GSUB coverage table or mapping**,
  not a bad outline. Check that every relevant Coverage table and mapping
  dict includes your target glyph, and that Coverage entries are sorted by
  glyph ID (unsorted coverage silently fails to match in some shapers).
  This is exactly the bug class `patch_gsub.py` was written to fix in the
  Seb Sans project.
- If kerning seems to vanish after instancing a variable font to a static
  weight, check whether the `GPOS` table's kerning pairs were preserved
  through the instancing step — verify with a HarfBuzz shaping test (e.g.
  `uharfbuzz`, shaping "AV" and comparing combined width to A + V shaped
  separately) rather than eyeballing.
- If small-size rendering looks inconsistent across platforms, that's a
  hinting/rasterizer-behavior difference, not a font bug — macOS ignores
  most hinting and renders faithful outlines; Windows ClearType respects
  hinting more. Run `ttfautohint` on static builds if Windows small-size
  fidelity matters (this is standard practice, not a niche fix).
