# Export Gates

```yaml
id: Q01
title: Export gates
status: ready
depends_on: [F06, A04]
priority: P0
normative: true
```

## Rule

Every export **must** pass fontbakery and HarfBuzz smoke checks **before** the zip is produced. Failures are shown in the UI; export does not silently ship a broken font.

## fontbakery

- Add fontbakery as a Python dependency when implementing
- Run against the whole release set (statics + variable as defined by pipeline)
- Surface FAIL and WARN counts/details in Export UI
- **FAIL blocks zip**
- WARN: surface prominently; default **does not** block unless configured otherwise (document default: warn-visible, fail-blocking)

## HarfBuzz smoke

Automated script porting past manual checks:

| Check | Intent |
|-------|--------|
| Tabular-figure uniformity | Tabular figures share expected advance behavior |
| Kerning survival | Spot strings still show non-broken kerning vs baseline expectations |
| `frac` / `sups` | Fractions and superscripts still shape |

Exact assertions live with the script; failures block zip.

## Gate response shape

See [A03](../architecture/A03-api-contracts.md) `gates` object. UI must render failures readably.

## Acceptance

- [ ] No zip file written when either gate fails
- [ ] Failures visible in Export tab
- [ ] Passing gates allow zip + checklist ([F07](../features/F07-publish-checklist-ui.md))
