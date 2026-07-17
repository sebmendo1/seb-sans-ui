# Build Seb Sans Release

```yaml
id: P01
title: build_sebsans.py
status: ready
depends_on: [A04, INPUTS, V03]
priority: P0
normative: true
```

## Module

Root script: [`build_sebsans.py`](../../build_sebsans.py)

## Purpose

Turn `fonts/SebSansVar.ttf` (or an explicit input path) into a release folder matching v0.5.1 layout: six static TTF cuts, variable TTF, variable WOFF2, OFL, README.

## Static instances

| Output | wght | opsz | Family (name ID 1) | Style (name ID 2) | PS name | usWeightClass | Text tracking |
|--------|------|------|--------------------|-------------------|---------|---------------|---------------|
| `SebSans-Regular.ttf` | 430 | 14 | Seb Sans | Regular | SebSans-Regular | 400 | yes |
| `SebSans-Medium.ttf` | 530 | 14 | Seb Sans Medium | Regular | SebSans-Medium | 500 | yes |
| `SebSans-SemiBold.ttf` | 620 | 14 | Seb Sans SemiBold | Regular | SebSans-SemiBold | 600 | yes |
| `SebSans-Bold.ttf` | 720 | 14 | Seb Sans | Bold | SebSans-Bold | 700 | yes |
| `SebSansDisplay-Regular.ttf` | 400 | 32 | Seb Sans Display | Regular | SebSansDisplay-Regular | 400 | no |
| `SebSansDisplay-Bold.ttf` | 700 | 32 | Seb Sans Display | Bold | SebSansDisplay-Bold | 700 | no |

All statics pin `XHGT=100`, strip variation tables (`fvar`, `gvar`, `avar`, `HVAR`, `MVAR`, `STAT`).

## Text tracking adjustment

Text cuts only: for every glyph, `LSB += 16`, `advance += 8` (v0.2 open rhythm). Display cuts receive no metric nudge.

## Typographic metrics

Text cuts: `OS/2.sTypoLineGap = 225`, `fsSelection` USE_TYPO_METRICS bit set. Display cuts: `sTypoLineGap = 0`.

## Naming / OFL

- Family strings use **Seb Sans** / **Seb Sans Display** (RFN-safe).
- Version string: `Version 2.000;SebSans-fork-of-Inter-4.1`
- Unique ID: `2.000;SEBM;<PostScriptName>`

## Hinting

Run `ttfautohint` on static TTF outputs when the binary is available; skip gracefully when absent.

## WOFF2

Rebuild `SebSansVar.woff2` from the variable TTF via fontTools WOFF2 compress.

## Public API

```python
build_release(input_path: Path, output_dir: Path, version: str = "0.6.0") -> list[Path]
instantiate_static(var_font: TTFont, wght: float, opsz: float) -> TTFont
apply_text_tracking(font: TTFont) -> None
apply_sebsans_naming(font: TTFont, config: StaticConfig) -> None
```

## CLI

```
python build_sebsans.py [--input fonts/SebSansVar.ttf] [--output releases/SebSans-vX.Y] [--version X.Y]
```

## Acceptance

- [ ] Six static files match instance table weights/opsz and naming conventions above
- [ ] Text static `n` advance matches reference within ±1 unit of shipped v0.5.1 (165 at Regular)
- [ ] Display static `n` advance matches raw instancing (128 at Display Regular)
- [ ] Variable TTF copied/rebuilt; WOFF2 emitted alongside
- [ ] No RFN violation (no "Inter" in family name fields)
