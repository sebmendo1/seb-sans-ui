---
name: spec-driven-development
description: Implements Seb Sans Studio from its normative specs while routing work to the relevant type-design, React, FastAPI, and testing knowledge. Use for planning, specifying, implementing, reviewing, or verifying any feature in this project.
---

# Spec-Driven Development

Treat `specs/` as the source of truth for Seb Sans Studio. Specs define behavior; code implements it.

## Start every task

1. Classify the request as spec work, implementation, diagnosis, review, or verification.
2. Read `specs/GOVERNANCE.md`, `specs/vision/V04-priorities.md`, and `specs/architecture/A02-working-copy-safety.md` before work that can touch font data.
3. Find the owning spec in `specs/README.md`, then read its `depends_on` documents and cited quality gates.
4. Check `specs/roadmap/R01-implementation-order.md`. Do not bypass an earlier P0 safety dependency.
5. Load only the domain knowledge needed from the routing table below.

## Skill routing

| Task | Load before deciding or editing |
|---|---|
| Typeface, font, glyph, outline, spacing, kerning, shaping, variable axes, font binaries, legibility, or font pipeline | [`../type-design/SKILL.md`](../type-design/SKILL.md) |
| Specific glyph critique, outline handles, terminals, spurs, counters, or letterform terminology | Type-design skill, then its `references/anatomy.md` and `references/glossary.md` |
| OpenType tables, TrueType/CFF, `cmap`, GSUB, GPOS, `glyf`, `gvar`, metrics, shaping, instancing, parsing, build, or export | Type-design skill, then its `references/file-format.md` |
| Multiple React/TSX component edits | Apply the available `react-best-practices` skill after editing, then fix relevant findings |
| FastAPI routes, request models, migrations, or API behavior | Apply available FastAPI guidance and verify against A03; project contracts override generic framework advice |
| Playwright or end-to-end behavior | Use the installed Playwright testing guidance and verify user-visible behavior, not implementation details |
| Full feature completion or release readiness | Apply the available verification skill after focused tests pass |

Do not load typography references for unrelated dashboard plumbing, survey privacy, or generic styling. Do load type-design for any decision whose correctness depends on how a font is structured, shaped, edited, spaced, or evaluated.

## Spec-first workflow

### 1. Establish authority

- Identify one owning spec ID.
- Follow explicit cross-links and `depends_on`; do not rely on implied knowledge.
- Resolve conflicts in this order: GOV and P0 safety, owning normative spec, cited quality gate, roadmap, implementation.
- If code and a normative spec disagree, update the owning spec first. Do not silently preserve undocumented code behavior.

### 2. Check readiness

- `ready`: implementation may proceed.
- `draft`: improve the spec before implementation.
- `blocked-on-assets`: scaffold only where the spec permits fixtures; do not invent a replacement font or duplicate pipeline.
- `implemented`: changes still require acceptance criteria and regression verification.

Required font assets and pipeline modules are listed in `specs/REQUIRED_INPUTS.md` and GOV. Confirm they exist before asset-dependent work.

### 3. Make the smallest normative change

For behavior not already specified:

1. Edit the owning vision, architecture, feature, or quality document.
2. Add or revise measurable acceptance criteria.
3. Update `depends_on`, status, and cross-links when the authority graph changes.
4. Then implement exactly that behavior.

Avoid broad “cleanup” or design changes that are not required by the owning spec.

### 4. Preserve font safety

- Never mutate `fonts/SebSansVar.ttf` in place.
- Use working copies, explicit Save, and history as defined by A02/A03.
- Preserve point count and correspondence across variable-font masters unless Q02 advanced-mode confirmation explicitly permits otherwise.
- Extend the existing Python pipeline. Do not recreate GSUB patching or export logic in the browser or a parallel service.
- Treat type-design heuristics as design guidance unless a project spec makes them an acceptance criterion or blocking gate.

### 5. Verify against the spec

Map each owning-spec acceptance criterion to evidence:

- focused unit/API tests for contracts and invariants;
- integration tests for working-copy and pipeline boundaries;
- Playwright tests for participant or studio workflows;
- font-specific checks required by Q01/Q02, including HarfBuzz/fontbakery where specified;
- build/typecheck for changed TypeScript boundaries.

Run focused checks first, then the broader suite proportional to risk. Never mark a spec `implemented` merely because code exists.

## Completion report

State:

1. owning spec ID and status;
2. implementation or spec changes made;
3. domain skills/references applied;
4. checks run and results;
5. acceptance criteria satisfied;
6. remaining `blocked-on-assets` or other explicit blockers.

