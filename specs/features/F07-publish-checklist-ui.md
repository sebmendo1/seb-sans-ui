# Publish Checklist UI

```yaml
id: F07
title: Publish checklist UI
status: ready
depends_on: [F06, Q03]
priority: P2
normative: true
```

## Goal

After a successful export (or on the Export tab), print a **publish checklist** of remaining human steps to ship beyond this machine. The studio does not perform these steps automatically.

## Content source

Normative checklist text lives in [Q03](../quality/Q03-publish-checklist.md). This feature is the UI presentation (checkboxes for personal progress tracking are optional localState only — not a database).

## Acceptance

- [ ] Checklist visible on Export tab
- [ ] Includes GitHub push/tag, portfolio `@font-face`, optional npm, optional Google Fonts, OFL RFN confirm
- [ ] No automated push/publish from the studio v1
