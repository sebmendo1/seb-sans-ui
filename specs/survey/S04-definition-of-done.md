# Survey Definition of Done

```yaml
id: S04
title: Survey definition of done
status: ready
depends_on: [S01, S02, S03]
priority: P0
normative: true
```

The survey is complete when:

1. `npm run dev` starts Vite and FastAPI and prints LAN-accessible URLs.
2. A participant can complete all five anonymous steps using the pinned Seb Sans v0.5.1 WOFF2.
3. Draft recovery, immutable experiment snapshots, and idempotent submission work.
4. The protected dashboard updates live and shows quantitative and qualitative results.
5. Sebastian can export data, back up SQLite, and activate a new experiment for future sessions.
6. Unit, API, accessibility, and end-to-end tests pass.
7. Survey feedback never directly mutates `fonts/SebSansVar.ttf`.
