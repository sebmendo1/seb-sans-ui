# Seb Sans v0.5 "X-height axis"

A screen grotesque sitting between Inter and the GT tradition — Inter's
engineered legibility, GT America's American-gothic warmth, GT Standard's
systematic rigor. Tuned for AI interfaces: chat transcripts, streamed
tables, code, dense UI text.

## The blend
- **Base:** Inter 4.1 by Rasmus Andersson & the Inter Project Authors (SIL OFL 1.1)
- **Frozen DNA (always on):** slashed 0 (`zero`), footed 1 (`cv01`),
  tailed l (`cv05`), spurred G (`cv10`) — the Il1/0O disambiguation kit
  plus the American-gothic spur, GT America's signature marker
- **Text cuts (opsz 14):** weight-bumped +30 (430/530/620/720) for
  GT-style sturdiness, +6 units/side tracking for open small-size rhythm
- **Display cuts (opsz 32):** stock weights, tighter native spacing
- **Variable:** full wght 100–900 × opsz 14–32 design space

## Files
| File | Cut | wght | opsz |
|---|---|---|---|
| SebSans-Regular.ttf | Text | 430 | 14 |
| SebSans-Medium.ttf | Text | 530 | 14 |
| SebSans-SemiBold.ttf | Text | 620 | 14 |
| SebSans-Bold.ttf | Text | 720 | 14 |
| SebSansDisplay-Regular.ttf | Display | 400 | 32 |
| SebSansDisplay-Bold.ttf | Display | 700 | 32 |
| SebSansVar.ttf / .woff2 | Variable | 100–900 | 14–32 |

## License
SIL Open Font License 1.1 (see OFL.txt). Derived from Inter; renamed in
compliance with the Reserved Font Name clause. Inter copyright 2016
The Inter Project Authors. Seb Sans modifications 2026 Sebastian Mendo.

## Roadmap (the hand-drawn phases)
v0.1 is the programmatic fork. The manual craft still ahead: angled
terminals on a c e s t, ~5% contrast, x-height/descender retune,
optical-size masters, then respacing. See the project plan.

## v0.1.1 QA log
- GSUB patched: frozen DNA glyphs (zero.slash, one.ss01, l.ss02, G.1) now
  covered by tnum, numr, dnom, sups, subs, frac contexts and ss06 —
  tabular figures verified uniform (1340u), fractions match stock Inter
- All GSUB coverage tables re-sorted by glyph ID (shaper-safe)
- Mark/accent alignment verified via HarfBuzz vs stock Inter (zero drift)
- Kerning verified live post-instancing (AV = -142u)
- Static cuts TrueType-hinted with ttfautohint for Windows ClearType
- Word-space grows with tracking (+12u) preserving word-boundary rhythm

## v0.2 changes — the reading pass (OpenAI Sans + Proxima Nova benchmarks)
- Round quotes & commas (ss03) frozen as defaults — the OpenAI Sans softness
  cue, carried into accents (Latvian comma-accents) and fraction commas
- Text tracking opened +6 -> +8 units/side for airier small-size rhythm
- Reading metrics: Text cuts now carry 1.32 default leading (sTypoLineGap
  225, USE_TYPO_METRICS) vs Inter's 1.21; Display cuts unchanged
- Kept against the benchmark: tailed l / footed 1 / slashed 0 stay, because
  AI content is dense with Il1 0O collisions (OpenAI Sans sets a plain l)
- Proxima Nova validation: same hybrid architecture (geometric skeleton,
  humanist proportions, double-story a, single-story g, tall x-height)
- GSUB equivalence extended for the ss03 family (342 coverages, decimal-
  comma fractions verified: 1,5/2 shapes with round numerator comma)

## v0.3 changes — the letterform pass (first outline modifications)
Three core principles now govern every decision:
  1. DISTINCT AT 13 PIXELS — disambiguation outranks style
  2. WARMTH IS A DETAIL, NOT A WOBBLE — geometric grid, human details
  3. RHYTHM BEFORE LETTERFORMS — spacing carries readability

Outline changes (all point-count-preserving, gvar-safe):
- THE POINT: dots/tittles enlarged 6% (period, dot-above, dieresis,
  exclam/question dots) — propagates to i j : ; ! ? and all accents via
  components. Dots exempt from the width pass: perfect circles always.
- WIDTH: +1.5% horizontal (outlines, advances, LSBs, composite offsets,
  14,605 gvar tuple x-deltas) — rounder, more open counters.
- DESCENDERS: g p q y thorn dotlessj mu trimmed to 96% depth (-442 ->
  -424) — GT Standard economy, pairs with the 1.32 reading leading.
Verified: n advance 1251, tnum uniform (1364u), kerning intact (-142),
period 294x294 circular, all statics re-hinted.

## v0.4 — Seb Icons (fonts unchanged from v0.3)
25-icon companion set, compiled from the typeface's own measurements:
- Grid 24x24, stroke 2px = Seb Sans stem/cap ratio (195u/1490u x 16px)
- Round caps & joins everywhere: every terminal is the Point
- Accent dots at r1.6 = the period's radius scaled to grid
- One optical weight across the set (ink density 8-27%, QA-verified)
- Files: icons/seb-*.svg, seb-icons-sprite.svg, SebIcons.jsx (React)
- Stroke pairing: 2px beside Regular, 2.3 beside Medium, 2.6 beside Bold
Set: point menu compose plus search chat spark send mic stop arrow-down
check close refresh copy code table download upload attach sliders
history user info warning

## v0.5 — a real XHGT (x-height) variable axis
Not a CSS trick: a genuine third fvar axis, 82..100..122 (percent of
current x-height), with correct gvar deltas.
- 26 lowercase glyphs + dotlessi + dotless-j-stem edited (all simple
  outlines; accented composites like e-acute inherit automatically via
  their component reference)
- Piecewise-linear per point: y<0 (descenders) untouched; 0<=y<=x-height
  scales uniformly from baseline; y>x-height (ascender stems on b d f h k
  l t) shifts rigidly so the ascender's own stem length never changes —
  same approach real x-height axes (e.g. Amstelvar YTLC) use
- Verified numerically: o/n top scale exactly with the factor; b/l top
  shift while preserving stem length; g/y bottom stay bit-for-bit
  constant (-424/-409) across the full 82-122 range
- Static cuts pin XHGT=100 and stay fully static (no fvar) — hinting and
  distribution behavior unchanged; only SebSansVar carries the live axis
- Specimen: new "X-height axis" section with baseline/x-height/cap-height
  guide annotation, plus an X-height dial added to both Heading and Body
  controls in the Playground

## Studio layout (Seb Sans Studio)

Local editing uses these paths per `specs/architecture/A02-working-copy-safety.md`:

| Path | Role |
|------|------|
| `fonts/SebSansVar.ttf` | Source of truth (variable font) |
| `fonts/_working/SebSansVar.ttf` | Mutable working copy for edits |
| `fonts/_history/SebSansVar-*.ttf` | Timestamped backups on Save |
| `fonts/_baseline/InterVariable.ttf` | Official Inter v4.1 reset/diff baseline |
| `releases/` | Export artifacts (Phase 4) |

Open the studio at `/studio` while `npm run dev` is running. Save never overwrites source without first writing a history backup.

## v0.5.1 — CoreText/iOS fix
Adding the XHGT axis left avar/HVAR/MVAR/GDEF declaring 2 axes while fvar
declared 3 — an OpenType spec violation. Chromium silently dropped the
broken tables; iOS CoreText rejected the whole font, rendering all text
invisible on iPhone. Fixed: avar identity segment for XHGT, HVAR/MVAR/GDEF
variation regions padded to 3 axes (peak-0 = ignored), STAT axis record
added. All 8 shipped fonts now pass OTS (the sanitizer browsers use).
Axis behavior and kerning verified unchanged.
