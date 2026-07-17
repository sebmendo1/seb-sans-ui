# Seb Sans Studio — Spec Index

```yaml
id: INDEX
status: ready
normative: true
```

This directory is the **source of truth** for building Seb Sans Studio. Code implements these specs; specs do not chase code.

## Reading order

1. [GOVERNANCE.md](GOVERNANCE.md) — authority, change control, non-negotiables
2. Vision (`vision/`) — why and design law
3. Architecture (`architecture/`) — machine shape and contracts
4. Features (`features/`) — what to build
5. Quality (`quality/`) — gates that block ship
6. Roadmap (`roadmap/`) — build order and definition of done

## Document map

| ID | Path | Layer |
|----|------|--------|
| GOV | [GOVERNANCE.md](GOVERNANCE.md) | Governance |
| INPUTS | [REQUIRED_INPUTS.md](REQUIRED_INPUTS.md) | Governance |
| V01 | [vision/V01-product-brief.md](vision/V01-product-brief.md) | Vision |
| V02 | [vision/V02-design-principles.md](vision/V02-design-principles.md) | Vision |
| V03 | [vision/V03-frozen-dna.md](vision/V03-frozen-dna.md) | Vision |
| V04 | [vision/V04-priorities.md](vision/V04-priorities.md) | Vision |
| A01 | [architecture/A01-system.md](architecture/A01-system.md) | Architecture |
| A02 | [architecture/A02-working-copy-safety.md](architecture/A02-working-copy-safety.md) | Architecture |
| A03 | [architecture/A03-api-contracts.md](architecture/A03-api-contracts.md) | Architecture |
| A04 | [architecture/A04-pipeline-inventory.md](architecture/A04-pipeline-inventory.md) | Architecture |
| P01 | [pipeline/P01-build-sebsans.md](pipeline/P01-build-sebsans.md) | Pipeline |
| P02 | [pipeline/P02-letterform-pass.md](pipeline/P02-letterform-pass.md) | Pipeline |
| P03 | [pipeline/P03-patch-gsub.md](pipeline/P03-patch-gsub.md) | Pipeline |
| F01 | [features/F01-glyph-browser.md](features/F01-glyph-browser.md) | Feature |
| F02 | [features/F02-outline-editor.md](features/F02-outline-editor.md) | Feature |
| F03 | [features/F03-batch-operations.md](features/F03-batch-operations.md) | Feature |
| F04 | [features/F04-text-preview.md](features/F04-text-preview.md) | Feature |
| F05 | [features/F05-principle-checks.md](features/F05-principle-checks.md) | Feature |
| F06 | [features/F06-export-pipeline.md](features/F06-export-pipeline.md) | Feature |
| F07 | [features/F07-publish-checklist-ui.md](features/F07-publish-checklist-ui.md) | Feature |
| Q01 | [quality/Q01-export-gates.md](quality/Q01-export-gates.md) | Quality |
| Q02 | [quality/Q02-point-count-policy.md](quality/Q02-point-count-policy.md) | Quality |
| Q03 | [quality/Q03-publish-checklist.md](quality/Q03-publish-checklist.md) | Quality |
| R01 | [roadmap/R01-implementation-order.md](roadmap/R01-implementation-order.md) | Roadmap |
| R02 | [roadmap/R02-definition-of-done.md](roadmap/R02-definition-of-done.md) | Roadmap |
| S01 | [survey/S01-participant-flow.md](survey/S01-participant-flow.md) | Survey |
| S02 | [survey/S02-data-privacy.md](survey/S02-data-privacy.md) | Survey |
| S03 | [survey/S03-dashboard.md](survey/S03-dashboard.md) | Survey |
| S04 | [survey/S04-definition-of-done.md](survey/S04-definition-of-done.md) | Survey |

## Frontmatter convention

Every normative doc (except this index) starts with:

```yaml
id: F02
title: Outline editor
status: ready          # draft | ready | blocked-on-assets | implemented
depends_on: [F01, A02, V01]
priority: P0           # P0 safety | P1 iteration | P2 polish
normative: true
```

Cross-link by **ID** (`see A02`, `implements V02`), not by implied knowledge.

## Agent entrypoint

1. Read GOV + V04 + A02 before any font-touching work.
2. Implement only in the order in R01.
3. Satisfy the owning feature’s acceptance criteria and any cited Q-gates.
4. If assets are missing, leave related criteria as `blocked-on-assets` — do not invent a second pipeline.
