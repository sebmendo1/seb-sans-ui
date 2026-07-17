# Publish Checklist

```yaml
id: Q03
title: Publish checklist
status: ready
depends_on: [F06, F07, A04]
priority: P2
normative: true
```

## Purpose

Concrete remaining steps to ship Seb Sans beyond the local machine. Displayed by [F07](../features/F07-publish-checklist-ui.md). Humans execute; studio does not automate.

## Checklist

### Required for first public cut

- [ ] Push the release to public GitHub repo `sebmendo/seb-sans`, tagged `vX.Y`, README rendered on the repo homepage
- [ ] Self-host the WOFF2 via `@font-face` on the portfolio site `sebmendodesign.vercel.app` as the first real deployment
- [ ] Confirm OFL Reserved Font Name compliance was handled by the rename in `build_sebsans.py` (confirm only — do not redo rename here)

### Optional

- [ ] npm-publish the variable WOFF2 as an installable package for reuse across future projects
- [ ] Submit to Google Fonts (review process, license compliance, PR-based flow to `github.com/google/fonts`) — only once glyph set and language coverage are more complete than v1

## Acceptance

- [ ] Text above is what the Export UI shows (minor wording polish allowed)
- [ ] OFL item is confirm-only
- [ ] Optional items clearly marked optional
