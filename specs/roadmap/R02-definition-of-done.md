# Definition of Done

```yaml
id: R02
title: Definition of done
status: ready
depends_on: [R01, F01, F02, F04, F06, Q01, V02]
priority: P0
normative: true
```

## Studio v1 is done when all of the following are true

1. **`npm run dev`** starts UI + Python sidecar and opens a usable studio.
2. **Glyph browser** lists glyphs with DNA badges; click opens editor ([F01](../features/F01-glyph-browser.md)).
3. **Outline editor** supports safe transforms, confirmed advanced point-count changes, extremes/opsz comparison, undo/redo ([F02](../features/F02-outline-editor.md), [Q02](../quality/Q02-point-count-policy.md)).
4. Edits apply to a **working copy**; **Save** commits with `_history/` backup ([A02](../architecture/A02-working-copy-safety.md)).
5. **Live text preview** renders from the in-progress working font with listed OT features ([F04](../features/F04-text-preview.md)).
6. **Three design principles** are persistently visible in chrome ([V02](../vision/V02-design-principles.md)).
7. **Export tab** runs the pipeline, blocks zip on fontbakery/HarfBuzz failure, and on success writes `SebSans-vX.Y.zip` plus shows the publish checklist ([F06](../features/F06-export-pipeline.md), [Q01](../quality/Q01-export-gates.md), [F07](../features/F07-publish-checklist-ui.md)).

## Explicitly not required for v1 DoD

- Visual polish beyond usability (P2)
- Icon editing
- Automated GitHub/npm/Google Fonts publish
- Complete Google Fonts language coverage

## Blocked-on-assets caveat

If source font and pipeline scripts are still missing, DoD cannot be fully verified end-to-end; keep criteria marked blocked until assets land, then re-run DoD checklist.
