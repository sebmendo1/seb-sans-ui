# Export Pipeline

```yaml
id: F06
title: Export pipeline
status: ready
depends_on: [A02, A03, A04, Q01, Q03, V03]
priority: P0
normative: true
```

## Goal

Export tab runs the Python pipeline end-to-end and produces a **verified** release folder + zip. Surfacing failures is mandatory; silent ship is forbidden.

## Pipeline order

1. **GSUB coverage/mapping patch** — reuse/extend `patch_gsub.py` so DNA substitutions stay wired ([V03](../vision/V03-frozen-dna.md), [A04](../architecture/A04-pipeline-inventory.md))
2. **Instance statics** — Text 430/530/620/720, Display 400/700; rebuild variable TTF/WOFF2 via `build_sebsans.py`
3. **ttfautohint** on statics
4. **fontbakery** against the whole set — surface FAIL/WARN in UI ([Q01](../quality/Q01-export-gates.md))
5. **HarfBuzz shaping smoke** — tabular uniformity, kerning survival, frac/sups ([Q01](../quality/Q01-export-gates.md))
6. **Docs** — regenerate `OFL.txt`, `README.md` (version bump + changelog), `FONTLOG.txt`
7. **Zip** — `SebSans-vX.Y.zip` with `fonts/` + `icons/` — **only if gates pass**
8. Show publish checklist ([F07](F07-publish-checklist-ui.md), [Q03](../quality/Q03-publish-checklist.md))

## UI

- Version field + changelog entry input
- Run export / job progress
- Gate results panel (pass/fail details)
- Download link only when `status: complete` with zip path
- On failure: show what failed; **no zip artifact**

## Source input

Default: last **Saved** source of truth ([A02](../architecture/A02-working-copy-safety.md)). If exporting dirty working copy is allowed, require explicit UI confirmation (“export unsaved working copy”).

## Acceptance

- [ ] Steps 1–8 run in order via API job
- [ ] GSUB patch invoked from existing module path
- [ ] Static + variable outputs match pipeline inventory
- [ ] fontbakery + HarfBuzz failures block zip
- [ ] Zip naming and folder structure match prior releases when assets/history exist
- [ ] Checklist displayed after successful export
