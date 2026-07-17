# Product Brief

```yaml
id: V01
title: Product brief
status: ready
depends_on: [GOV]
priority: P0
normative: true
```

## Purpose

**Seb Sans Studio** is a personal local design tool for editing and releasing **Seb Sans**, a custom variable typeface (Inter fork). It is not a commercial product for other foundries or teams.

## User

- Single user: the type designer (Sebastian).
- Runs on localhost while designing.
- No auth, no multi-user, no deployment target for the studio app itself (yet).

## Jobs to be done

1. Browse every glyph and see which carry frozen DNA / GSUB wiring.
2. Edit outlines safely across the variable space (`wght`, `opsz`).
3. Run batch letterform transforms with preview-before-apply.
4. Judge edits in live text context (working font, not a stale ship cut).
5. Export a verified, versioned release zip with a clear publish checklist.

## In scope

- Glyph browser, outline editor, batch ops, live text preview, principle checks.
- Python sidecar wrapping fontTools for binary-safe operations.
- Export pipeline: GSUB patch, static instances, variable rebuild, hinting, fontbakery, HarfBuzz smoke, docs regeneration, zip.
- Icon **preview** alongside text (companion Seb Icons set).

## Out of scope

- Editing Seb Icons outlines.
- Shipping the studio as a hosted SaaS.
- Automating GitHub/npm/Google Fonts publication (UI checklist only; human executes).
- Replacing Inter’s full language coverage in v1 (export may proceed with incomplete coverage; GF submit is optional later).

## Source of truth (design)

- Variable font: `fonts/SebSansVar.ttf`
- Axes: `wght` 100–900, `opsz` 14–32
- Design history and QA narrative: `fonts/README.md` (when present)
- Frozen DNA: [V03](V03-frozen-dna.md)
- Principles: [V02](V02-design-principles.md)

## Success (studio)

Per [R02](../roadmap/R02-definition-of-done.md): `npm run dev` opens the glyph browser; outline editing with live variable-aware preview works; Export produces a gated, versioned zip plus publish checklist.
