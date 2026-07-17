# Type Design Glossary

Precise definitions. Use these instead of loose paraphrases when writing
design docs, critiquing letterforms, or explaining font behavior.

**Advance Width** — The total horizontal space a glyph occupies: left
sidebearing + glyph width + right sidebearing. This is the number the text
layout engine actually uses to place the *next* glyph.

**Ascender** — The part of a lowercase letter extending above the x-height
(b, d, h), and the alignment line set to its height. Set using a letter
with a clean vertical stem (h, d, b, l) to avoid overshoot complications.

**Baseline** — The horizontal line letters sit on; the zero-value anchor
for the whole typeface's vertical axis. Typically sits ~75% down the em
square for Western scripts.

**Bézier Curve** — A parametric curve defined by control points. TrueType
uses *quadratic* Béziers (one control point per segment, on/off-curve point
flags); PostScript/CFF uses *cubic* Béziers (two control points per
segment, drawn via relative operators like `rrcurveto`).

**Bowl** — The curved stroke enclosing the rounded part of a letter (O, b,
p). The thickest point of a bowl should be thicker than the typeface's
vertical stem; the thinnest point thinner than the horizontal stem, or the
bowl reads as structurally inconsistent.

**Cap Height** — The height of capital letters above the baseline, set
using a flat-topped letter (H, E, I). An alignment point, not a hard
ceiling — round/pointed caps (O, C, S, A, V) overshoot it slightly to
appear optically the same size as H.

**Contrast** — The difference between a typeface's thickest and thinnest
strokes, typically vertical vs. horizontal stem width. High contrast =
traditional serif feel; near-zero contrast = monolinear.

**Counter** — The fully or partially enclosed negative space inside a
letter (o, e, n). Counter size drives spacing decisions — "spacing matches
counters" is a standing rule of thumb in the craft.

**Descender** — The part of a lowercase letter extending below the
baseline (p, q), and the alignment line set to its depth. Set using a
clean vertical stem (p, q); f and g are allowed to overshoot this line
because of their curved terminals.

**Em Square** — The bounding box each glyph is drawn within; its
coordinate system is set by Units Per Em (UPM), typically 1000 (CFF) or
1024/2048 (TrueType). When you set a font at a given point size, it's this
square that gets scaled — coordinates inside it never change.

**Font** — One specific instance of a typeface (e.g. Garamond Bold Italic
12pt). Technically, a structured database of tables: glyph outlines,
spacing metrics, kerning, hinting instructions, metadata. Distinct from
*typeface* — see that entry.

**Glyph** — The visual representation of a single character, including its
shape, spacing, and size/style variants.

**Hinting** — Instructions embedded in a font that snap outlines to the
pixel grid at small sizes, trading strict shape fidelity for rendering
crispness. Matters far less on modern high-DPI displays than it did on
low-res CRTs.

**Interpolation** — Computing intermediate values between two known
values. In variable fonts, this is how in-between weights/widths/optical
sizes get generated at runtime from a small set of drawn masters.

**Kerning** — A spacing adjustment applied to a *specific pair* of letters
(AV, To) to fix a gap or collision that sidebearings alone can't solve.
Stored in the GPOS table, applied during text shaping, and should be a
last resort after sidebearing-based spacing (see Walter Tracy's method in
SKILL.md).

**Leading** — Vertical spacing between lines of text. Named after the
strips of lead typesetters physically used to space rows of metal type.

**Ligature** — A single glyph substituted for a sequence of characters
that would otherwise collide or look awkward (fi → the merged fi glyph).
Applied via the GSUB table during text shaping.

**Monolinear** — A typeface whose strokes are all the same visual
thickness, with little to no contrast. Even monolinear designs typically
need optical thinning on horizontals to compensate for the "thickness
illusion" (horizontals read as heavier than verticals at equal actual
weight).

**Monospaced** — A font where every glyph shares the same advance width,
as opposed to proportional fonts where width varies per letter.

**Overshoot** — The small amount by which round or pointed letters (O, C,
S, A, V and lowercase o, e, c) extend past alignment lines (baseline, cap
height, x-height) so they read as optically the same size as flat letters
that sit exactly on those lines.

**Rasterization** — Converting vector outlines into a pixel grid for
display.

**Serif** — The small foot-like stroke finishing the ends of stems in
serif typefaces. Variants: bracketed (curved support to the main stroke)
vs. unbracketed, wedge (thinner at the end) vs. slab (uniform thickness)
vs. hairline (uniform and very thin).

**Sidebearing** — Built-in spacing on either side of a glyph (left
sidebearing, right sidebearing) that separates it from neighbors. Advance
width = LSB + glyph width + RSB. The primary spacing tool — see SKILL.md's
spacing section; kerning is the fallback, not the default.

**Stem** — The main vertical or diagonal stroke of a letterform (the two
verticals of an H).

**Stress** — The angle/axis along which a letterform's contrast occurs,
inherited from calligraphic pen-angle tradition. Should stay consistent
across every letter in a typeface.

**Terminal** — The end of a stroke that doesn't finish in a serif. May be
embellished (teardrop, ball, flare, shear, calligraphic cut) or plain.

**Text Run** — A segment of text sharing font, size, color, and language,
processed as an isolated unit during shaping. A language change or style
change (e.g. italicizing one word) ends a run and starts a new one; runs
never kern or shape across their own boundary.

**Text Shaping** — Converting a character string into positioned glyphs:
Unicode → glyph ID (cmap) → substitutions (GSUB) → positioning/kerning
(GPOS) → render. See `file-format.md` for the full walkthrough.

**Typeface** — A family of letterform designs sharing one visual style
across all weights/styles (Garamond, Helvetica). Distinct from *font* — a
font is one specific instance within a typeface.

**Unicode** — A universal character-set standard assigning a numeric code
point to characters across writing systems. UTF-8 etc. define how those
code points get stored as bytes; the font's `cmap` table maps code points
to the font's internal glyph IDs.

**Variable Font** — A single font file packing an entire design space
(weight, width, slant, optical size axes) that gets interpolated at
runtime, replacing the need to ship separate static files per style. See
SKILL.md's Variable Fonts section for the point-count-preservation
constraint that governs editing one.

**X-Height** — The height of lowercase letters, typically set with x, o,
or n. Sets the apparent visual size of a typeface independent of point
size and is strongly correlated with legibility — more room in a taller
x-height means more room for the details that make letters distinguishable
from each other. See SKILL.md's sizing section for concrete ranges and the
visual-arc research this is based on.
