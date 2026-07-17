# Implementation Order

```yaml
id: R01
title: Implementation order
status: ready
depends_on: [GOV, V04, A01, A02]
priority: P0
normative: true
```

## Rule

Implement in this order. Do not start a later feature’s full scope until prior P0 safety is in place.

## Phases

### Phase 0 — Specs (this pass)

- [x] Governance suite under `specs/`

### Phase 1 — Harness + safety

1. Dev harness: Vite + React + TS, FastAPI, `concurrently` `npm run dev` ([A01](../architecture/A01-system.md))
2. Working copy paths + Save/history endpoints ([A02](../architecture/A02-working-copy-safety.md), [A03](../architecture/A03-api-contracts.md))
3. Principles persistent chrome ([V02](../vision/V02-design-principles.md))

### Phase 2 — Core loop

4. [F01](../features/F01-glyph-browser.md) Glyph browser
5. [F02](../features/F02-outline-editor.md) Outline editor + [Q02](../quality/Q02-point-count-policy.md)
6. [F04](../features/F04-text-preview.md) Live text preview (working font)

### Phase 3 — Batch + advice

7. [F03](../features/F03-batch-operations.md) Batch operations (wrap letterform_pass when assets present)
8. [F05](../features/F05-principle-checks.md) Principle checks

### Phase 4 — Export

9. Wire [A04](../architecture/A04-pipeline-inventory.md) modules into API
10. [F06](../features/F06-export-pipeline.md) + [Q01](../quality/Q01-export-gates.md)
11. [F07](../features/F07-publish-checklist-ui.md) + [Q03](../quality/Q03-publish-checklist.md)

## Asset gate

Phases that require `SebSansVar.ttf` / Python scripts mark work `blocked-on-assets` until files are added. Scaffold code may exist with fixtures, but do not fake a second GSUB pipeline.

## Done when

[R02](R02-definition-of-done.md) is satisfied.
