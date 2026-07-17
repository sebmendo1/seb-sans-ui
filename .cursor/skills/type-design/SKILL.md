---
name: type-design
description: Comprehensive knowledge of type design and font engineering — how digital fonts are structured (OpenType/TrueType/CFF tables, variable fonts), how glyphs are drawn and spaced (control letters, sidebearings, kerning, optical alignment), and how typefaces are named and evaluated (x-height, contrast, stress, hinting). Use this skill whenever the user is designing, forking, or modifying a typeface; drawing or editing glyph outlines; deciding on weight/width/contrast/spacing values; troubleshooting font rendering, hinting, or shaping issues; naming parts of a letterform; or asking anything about how fonts work internally (glyf/cmap/GSUB/GPOS tables, variable font axes, kerning classes, kerning vs. sidebearings). Trigger this even for adjacent tasks like building a font-editing tool, writing a font build pipeline, or reviewing a typeface for readability — the terminology and workflow here should ground those tasks, not just direct "make a font" requests.
---

# Type Design

Working knowledge for designing, drawing, spacing, and engineering typefaces —
condensed from Dan Hollick's "How to Make a Font" (makingsoftware.com). Use
this to ground any task that touches letterform design, font file structure,
or type terminology, whether that's drawing glyphs, reviewing spacing,
debugging a font build pipeline, or just naming a part of a letter correctly.

## When to go deeper

This file covers the workflow and the concepts you'll need most often. Three
reference files hold the material that's dense but only needed situationally
— read them when the task calls for that level of detail, not by default:

- `references/glossary.md` — 32 precise definitions (advance width, bowl,
  counter, overshoot, stress, sidebearing, etc.). Check here before using
  type-design vocabulary loosely, and point users here when they ask "what's
  a ___".
- `references/anatomy.md` — full letterform part-names (terminal, spur,
  beak, finial, ear, waist, spine, throat, crossbar, apex, vertex, shoulder,
  leg, arm...) with which letters exhibit each. Read this before describing
  or critiquing a specific glyph's shape.
- `references/file-format.md` — the OpenType table reference (glyf/loca,
  CFF/CFF2, cmap, head, hhea, hmtx, OS/2) and the 4-step text-shaping
  pipeline (cmap lookup → GSUB substitution → GPOS positioning → render).
  Read this before writing code that parses, builds, or debugs font
  binaries, or before explaining why a font renders the way it does.

## Two vocabulary words to get right immediately

**Typeface vs. font.** A typeface is the family (Garamond, in all weights
and styles). A font is one specific instance (Garamond Bold Italic 12pt).
People conflate these constantly; type designers do not. Use them correctly
in any deliverable.

**Font file = database of tables.** Only one table holds the actual glyph
outlines. Everything else — spacing, kerning, hinting, metadata, language
support — lives in separate tables that make the outlines render correctly.
This matters practically: most "font problems" (bad spacing, missing
ligatures, wrong weight detection) are a wrong or missing table, not a bad
outline. See `references/file-format.md` for the full table map.

## Starting a typeface: control letters, not the alphabet

Never design A→Z in order. Start with a small set of **control letters**
that force the fundamental decisions — stress, contrast, proportion,
personality — and let every other glyph inherit from them.

**Uppercase:** O (defines stress, contrast, and bowl proportion — get this
wrong and the whole typeface falls apart) and H or E (defines the square
letterforms and stem weight). From O: derive C, G, Q, D. From E: derive
L, F, T, H.

**Lowercase:** o, n, a, e, g — the same logic. Test word: **"hamburgefonts­iv"**
(or Seb Sans's existing choice, "adhesion") exposes how the most common
shapes interact. From o: derive c, e, p, d, b, q, g (all bowl-based — c and
e need to be *narrower* than o since their open counters already read as
big). From n: derive m, h, u, r (r needs an even lower notch than n/m/h
because its side is open).

**Group by shape**, not alphabetically, when propagating a design decision:
- Round: O Q C G S (uppercase) / o c e a s (lowercase)
- Square: E F H I L T
- Diagonal: V A W X
- Round-square hybrid: D B P R
- Diagonal-square hybrid: M N K Z Y

Optical corrections every control letter needs, regardless of style:
- **Overshoot**: round and pointed letters (O, C, S, A, V) must extend
  slightly past the cap-height and baseline lines a flat letter (H) sits
  exactly on — otherwise they *look* smaller, even though they're
  mathematically aligned. Same logic applies to lowercase o/e/c against x-height.
- **Double-story crossbar height**: on E, B, S-like double-story forms, the
  mathematical center looks too low — raise the crossbar/waist above
  center, then widen the lower story slightly to compensate for the
  resulting visual imbalance.
- **The "a" is the hard one**: double-story, open counter on the left,
  borrows its arch from n's shoulder but doesn't taper the same way. Bowl
  height typically 55–65% of x-height.

## Sizing decisions, in the order you'll actually make them

1. **UPM (units per em)** — the coordinate scale everything else is drawn
   in. 1000 for CFF/OTF, 1024 (or 2048) for TrueType. Pick once, never
   changes mid-project.
2. **Baseline** — typically ~75% down the em square for Western scripts.
3. **Cap height** — set with H (flat top, simple shape). This is an
   *alignment* point, not a hard ceiling — rounded/pointed caps overshoot it.
4. **x-height** — set with x, o, or n. **This is the single most
   consequential sizing decision you'll make.** It sets the apparent visual
   size of the whole typeface independent of point size, and taller
   x-heights read as more legible because they leave more room for
   differentiating detail in each lowercase letter. Typical range: 60–75%
   of cap height. Research (Legge & Bigelow) puts the reading-speed optimum
   around 0.3° of visual arc — past a certain point taller stops helping
   and starts hurting because ascenders/descenders lose distinction.
   Trade-off to know: a smaller x-height doesn't make words *narrower* —
   it needs *more* sidebearing space to stay legible, so word width is
   roughly a wash either way.
5. **Ascender / descender** — set with a clean vertical stem (h, d, b, l for
   ascenders; p, q for descenders). f and g are allowed to overshoot these
   because of their curved terminals.
6. **Everything else** — figure height (≈ cap height), small-cap height
   (between x-height and cap height), diacritic height, superscript/
   subscript offsets.

## Weight, contrast, and stress — the numbers that actually work

**Weight** has no true standard, but Charles Bigelow's x-height-to-stem
ratio is the closest thing to one: a Regular weight runs **~1:5 to 1:6**
(x-height is 5–6× the vertical stem width). To make adjacent weights read
as genuinely distinct steps (not just "kind of bolder"), each weight should
be **1.3–1.5×** the stem width of its neighbor. Worked example at a 500-unit
x-height: Regular stem ≈ 100u, next weight up ≈ 130u, next down ≈ 70u. This
progression is usually non-linear (an easing curve, per Luc(as) de Groot),
not a straight ramp — check this against Seb Sans's current wght axis if
tuning weight steps.

**Contrast** is the thick/thin stroke difference. High contrast = big
difference (traditional serif); monolinear = ~none (most grotesques,
including Inter and Seb Sans's base). Even monolinear faces need
**optical thinning of horizontal strokes** — horizontals look thicker than
verticals of the same actual weight (the "thickness illusion"), so true
monolinear outlines read as heavier on top/bottom than on the sides unless
compensated. Apply the same logic to bowls: the thickest point of a curve
should be *thicker* than the vertical stem, and the thinnest point
*thinner* than the horizontal stem, or the bowl reads as structurally
inconsistent with the stems around it.

**Stress** is the *angle* the contrast sits at (inherited from calligraphic
pen angle) — keep it consistent across every letter in a typeface, or
individual glyphs will feel like they came from a different hand.

## Spacing: sidebearings first, kerning only as a last resort

This is where most of a typeface's actual readability is won or lost — more
than in the letterforms themselves. Too sparse → whitespace rivers, hard to
parse. Too tight → letters blur together. Target: an even "gray value" at
arm's length, with a *predictable*, rhythmic stripe pattern up close, not a
truly flat gray.

**The rule of thumb:** "spacing matches counters" — letters with more
internal negative space need *tighter* sidebearings to compensate, and
bolder weights (less negative space per letter) need tighter spacing than
light weights of the same design.

**Walter Tracy's method**, still the standard workflow:
1. Space **H and O** first (most-square, most-round) by eye, testing in
   strings like `HHHOOHHH` / `OOOHHOOO` until the stem rhythm looks unified.
2. Space **n and o** (lowercase equivalents) the same way.
3. Derive every other letter's sidebearings from whichever control letter
   it resembles most on each side — e.g., B takes its left sidebearing from
   H (flat side) and its right sidebearing from O (round side).
4. Hand-space the outliers this formula can't cover: diagonals (A, V, W, X, Y).
5. Proof by setting every letter next to every other letter and scanning for
   rhythm breaks — this is tedious by design; there's no shortcut.

**Kerning is the fallback, not the default.** Use it only where sidebearings
demonstrably can't fix a specific pair (classic case: `To`, `AV`, `Ti` — the
i needs to tuck under the T's overhang). Kerning lives in the GPOS table and
is checked per-pair (or per-class) at text-shaping time. **Class-based
kerning** is the practical approach for anything beyond a handful of pairs:
group letters that share an edge shape (e.g., D/E/F share a straight left
edge) and apply one kerning rule to the whole class against a given
right-hand letter, rather than hand-kerning every individual pair.

## Hinting — when it matters and when it doesn't

Hinting distorts outlines slightly at specific pixel sizes so stems snap
cleanly to the pixel grid — trading strict shape fidelity for crispness at
small sizes. It mattered enormously on low-res CRTs (Verdana, Georgia were
hand-hinted pixel-by-pixel) and matters far less now: modern high-DPI
displays render stems several pixels wide and lean on anti-aliasing, so
macOS in particular ignores most hinting and renders the faithful outline
directly.

**TrueType hinting** is literally bytecode — a tiny program per glyph,
executed by a virtual machine in the rasterizer (`fpgm`/`prep`/`glyf`
tables). Full manual control, rarely worth hand-writing today.
**CFF hinting** is declarative — you mark stem positions/widths and
horizontal alignment zones ("blue zones") for baseline/x-height/cap-height,
and the rasterizer decides the grid-fitting. For anything shipped today,
**`ttfautohint`** (automatic) is the standard tool — this is what the Seb
Sans static builds already run through; hand-hinting is essentially a lost
art outside of super-small-size-critical UI fonts.

## Variable fonts, briefly

One file, one or more continuous axes (weight, width, slant, optical size),
interpolated at runtime instead of shipping discrete static files per
weight. Internally: TrueType-flavored variable fonts store per-master
*deltas* in a `gvar` table on top of a base master's `glyf` outline;
CFF2-flavored fonts do the analogous thing with offset tables. **The
practical constraint that matters when editing a variable font's outlines:
every master must have the same point count and point correspondence** — add
or delete a point in one master without doing it in every other master and
the interpolation breaks. This is exactly the constraint the Seb Sans
letterform pass (point-count-preserving transforms only) was built around —
see the project's own `letterform_pass.py` for a concrete example of
staying inside this constraint while still meaningfully changing outlines
(dot enlargement, width scaling, descender compression, all applied without
touching point counts).

## Quick terminology lookups you'll want mid-conversation

- **Serif** parts: bracketed vs. unbracketed, wedge vs. slab vs. hairline,
  cupped (curved inward to counteract an optical bending illusion).
- **Terminal** types: teardrop, ball, flare, shear, calligraphic — the
  un-serifed end of a stroke.
- **Beak** (small serif on just the top of G/S-type curves), **spur** (tiny
  serif at a stroke join — this is the term for Seb Sans's spurred G),
  **flag** (horizontal serif beside a stem, as on numeral 1), **tail**
  (a stroke finishing below the baseline), **finial** (curved/tapered
  terminal on open letters like c, e).
- **Counter** (enclosed negative space) — called an **eye** specifically
  in lowercase e, a **loop** in double-story g (joined to the upper story
  by a **link**, sometimes finished with an **ear**).
- **Dots/tittles** (i, j) — the term Seb Sans's "the Point" DNA trait
  formalizes. **Hook** (top of f). **Shoulder** (curved join in n/m).
  **Leg** (diagonal stem in k/R). **Arm** (one-end-attached horizontal, as
  in E). **Waist** (cinched center of B/R/K). **Spine** (curved stroke of
  s/8). **Throat** (short stem before G's opening). **Crossbar**
  (horizontal joining two stems). **Vertex** (bottom join of two
  diagonals) / **Apex** (top join of two diagonals).

Full definitions with more context: `references/anatomy.md` and
`references/glossary.md`.

## Applying this to an existing project (e.g. Seb Sans)

When the task is *modifying* an existing typeface rather than starting from
scratch:

1. Identify which control letters the base font already committed to (for
   an Inter-derived project, that's Inter's own O/H/E/o/n/a decisions) —
   changes should either extend that logic consistently or deliberately
   break it with a stated reason, never drift accidentally.
2. Any outline edit gets checked against **point-count preservation** if
   the font has a variable axis — see the Variable Fonts section above.
3. Spacing changes should be validated with the Tracy method (HHHOOHHH /
   OOOHHOOO rhythm strings) before being treated as "done," not just
   eyeballed as a single word.
4. Weight-axis or contrast changes should be sanity-checked against
   Bigelow's 1.3–1.5× stem-width-per-step guideline before committing.
5. Any new terminal/serif/spur decision should be named correctly using
   `references/anatomy.md` in documentation — precise vocabulary makes the
   design rationale reviewable by other type-literate people later.
