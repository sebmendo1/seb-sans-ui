# Participant Survey Flow

```yaml
id: S01
title: Participant survey flow
status: ready
depends_on: [GOV, V02]
priority: P1
normative: true
```

## Goal

Collect anonymous, reproducible feedback on Seb Sans display and body-text legibility through a five-step, Typeform-style survey.

## Steps

1. Welcome, privacy summary, and start
2. Editable display proof fixed at 36px with Weight, Optical, Tracking, Leading, and X-height
3. Editable body proof fixed at 18px with the same five variables
4. Combined proof, readability score, likes, and requested changes
5. Open emotional response, review, and idempotent submission

## Rules

- Every session is pinned to an immutable experiment and font checksum.
- Display and body settings are independent, while their fixed test sizes keep responses comparable.
- Each tuning step includes a 1–7 legibility rating.
- Drafts autosave and restore after refresh.
- Completed submissions cannot be silently changed or duplicated.
- Keyboard navigation, visible focus, labels, and reduced motion are required.

## Acceptance

- [ ] All five steps work on desktop and mobile
- [ ] All five controls appear in a clear vertical stack to the right of the font proof
- [ ] Display remains fixed at 36px and Body remains fixed at 18px
- [ ] Edited copy and reset-to-default are available for both roles
- [ ] Refresh restores an unfinished anonymous session
- [ ] Final submission returns a completion code
