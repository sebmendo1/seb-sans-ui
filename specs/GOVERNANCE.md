# Governance

```yaml
id: GOV
title: Governance
status: ready
depends_on: []
priority: P0
normative: true
```

## Authority

- Documents under `specs/` are normative for Seb Sans Studio.
- When code and specs disagree, **fix the specs first**, then the code.
- IDs (`V02`, `A02`, `F06`, `Q01`) are the stable reference unit.

## Project priorities (non-negotiable order)

Per [V04](vision/V04-priorities.md):

1. **Never corrupt the font**
2. **Fast iteration loop**
3. **Polish**

No feature may ship safety for speed. Polish never blocks a correct, gated export.

## Non-negotiables

| Rule | Spec |
|------|------|
| Browser never mutates TTF binaries as source of truth | [A01](architecture/A01-system.md), [A03](architecture/A03-api-contracts.md) |
| No in-place writes to `fonts/SebSansVar.ttf`; working copy + explicit Save + history | [A02](architecture/A02-working-copy-safety.md) |
| Point-count changes require confirmed advanced mode | [Q02](quality/Q02-point-count-policy.md) |
| Export zip is illegal if fontbakery or HarfBuzz gates fail | [Q01](quality/Q01-export-gates.md), [F06](features/F06-export-pipeline.md) |
| Extend existing Python pipeline modules; do not reinvent GSUB patching | [A04](architecture/A04-pipeline-inventory.md) |
| Icons: preview only; editing out of scope | [V01](vision/V01-product-brief.md) |
| Design principles remain visible in product chrome | [V02](vision/V02-design-principles.md) |

## Change control

1. Edit the owning spec (vision / architecture / feature / quality).
2. Update `depends_on` and status if needed.
3. Then implement or revise code to match.
4. Mark feature `status: implemented` only when acceptance criteria pass.

Do not add silent behavior that is not represented in a normative spec.

## Status values

| Status | Meaning |
|--------|---------|
| `draft` | Not ready to implement against |
| `ready` | Implementable; criteria are complete |
| `blocked-on-assets` | Behavior known, but font/pipeline files are not yet in-repo |
| `implemented` | Code exists and criteria verified |

## Scope of this repository (governance boundary)

**In scope:** local Vite + React + TypeScript UI; FastAPI sidecar; glyph browse/edit; batch ops; live preview; principle checks; gated export; publish checklist UI.

**Out of scope for v1 studio:** auth, cloud deploy of the studio itself, icon outline editing, Google Fonts submission automation (checklist may mention it as optional manual work).

## Asset dependency

Until `fonts/SebSansVar.ttf`, `build_sebsans.py`, `letterform_pass.py`, `patch_gsub.py`, specimen character-set logic, and `icons/` are present, any criterion that literally requires them stays `blocked-on-assets`. Specs still define the contracts so implementation can land the day assets arrive.
