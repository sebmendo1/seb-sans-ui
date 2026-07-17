# Pipeline Inventory

```yaml
id: A04
title: Pipeline inventory
status: ready
depends_on: [A01, V03]
priority: P0
normative: true
```

## Rule

**Extend** the existing Python/fontTools pipeline. Do **not** reinvent GSUB patching or instancing in TypeScript.

When the scripts land in-repo, wrap them from the FastAPI layer; do not duplicate table logic.

## Modules (implemented)

| Module | Role | Spec |
|--------|------|------|
| `build_sebsans.py` | Instance static cuts; rebuild variable TTF/WOFF2; OFL rename / RFN compliance handling; release layout | [P01](../pipeline/P01-build-sebsans.md) |
| `letterform_pass.py` | Transform primitives: enlarge/shrink contour about center (“the Point”), scale width, shift ascender/descender depth, nudge sidebearings | [P02](../pipeline/P02-letterform-pass.md) |
| `patch_gsub.py` | Patch GSUB substitution/coverage so DNA glyphs stay wired into tnum, frac, sups, accents, etc. | [P03](../pipeline/P03-patch-gsub.md) |

Status is `ready`. API export and batch UI invoke these modules via [loader.py](../../api/pipeline/loader.py).

## Public contracts

```python
# build_sebsans.py
build_release(input_path: Path, output_dir: Path, version: str) -> list[Path]

# letterform_pass.py
apply_batch(font: TTFont, glyphs: list[str], payload: dict) -> None

# patch_gsub.py
patch_gsub(font: TTFont) -> int
```

## Static instances (export)

Must match current build script behavior:

| Family use | Weights |
|------------|---------|
| Text | 430, 530, 620, 720 |
| Display | 400, 700 |

Plus variable TTF and WOFF2 rebuild.

## Hinting

Run `ttfautohint` on statics during export ([F06](../features/F06-export-pipeline.md)).

## Letterform primitives → UI

[F03](../features/F03-batch-operations.md) exposes these as controls. Generalize to arbitrary glyph or glyph-group selection; keep math in Python.

## GSUB

[F06](../features/F06-export-pipeline.md) always runs the patch pass so newly edited DNA glyphs remain correctly wired.

## HarfBuzz smoke (to automate)

Port past manual session checks into a script invoked by export:

- Tabular-figure advance uniformity
- Kerning survival smoke
- `frac` / `sups` rendering smoke

Exact thresholds belong in [Q01](../quality/Q01-export-gates.md).

## Docs regeneration

Export regenerates / bumps:

- `OFL.txt`
- `README.md` (version + changelog entry)
- `FONTLOG.txt`

Zip name: `SebSans-vX.Y.zip` with `fonts/` + `icons/` structure matching previous releases.

## OFL Reserved Font Name

Rename handling already lives in `build_sebsans.py`. Checklist ([Q03](../quality/Q03-publish-checklist.md)) **confirms** compliance; does not re-implement rename.

## Acceptance (when assets present)

- [ ] API export invokes existing modules rather than a TS rewrite of GSUB
- [ ] Letterform UI maps 1:1 to Python primitives
- [ ] Instance list matches table above unless `build_sebsans.py` is intentionally updated **in the same change** as this spec
