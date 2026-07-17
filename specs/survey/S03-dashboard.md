# Research Dashboard

```yaml
id: S03
title: Research dashboard
status: ready
depends_on: [S01, S02]
priority: P1
normative: true
```

## Goal

Give Sebastian a live, local view of participant behavior and a safe way to create the next test configuration.

## Required views

- Active sessions, completions, completion rate, median duration, active experiment
- Display/body distributions for all six controls
- Legibility-score distributions
- Size/weight, size/leading, and X-height/legibility relationships
- Searchable qualitative feedback
- Per-session final settings and tuning timeline

## Live behavior

Server-sent events notify the dashboard of session starts, drafts, submissions, and experiment activation. The dashboard refetches canonical aggregates after an event.

## Adaptation

- Suggested settings use medians and interquartile ranges.
- Small samples show a warning.
- “Create next experiment” creates a draft version; activation affects future sessions only.
- Dashboard actions never mutate the font binary.

## Acceptance

- [ ] Dashboard is protected by a local admin PIN
- [ ] New submissions appear without a page refresh
- [ ] Filters separate experiments, roles, completion, and edited copy
- [ ] CSV/JSON exports and SQLite backup work
- [ ] New experiment activation preserves existing sessions
